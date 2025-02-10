import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRepositorySchema, insertFileSchema } from "@shared/schema";
import { fetchRepositoryFiles } from "../client/src/lib/graphql";
import { fileProcessor } from "./lib/file-processor";
import { embeddingsController } from "./lib/embeddings/embeddings-controller";

export function registerRoutes(app: Express): Server {
  // Add environment variables route
  app.get("/api/config", (_req, res) => {
    res.json({
      githubToken: process.env.GITHUB_TOKEN
    });
  });

  app.post("/api/repositories", async (req, res) => {
    try {
      const data = insertRepositorySchema.parse(req.body);
      console.log(`Processing repository URL: ${data.url}`);

      const existingRepo = await storage.findRepositoryByUrl(data.url);
      if (existingRepo) {
        // Delete existing files before reprocessing
        await storage.deleteFilesByRepositoryId(existingRepo.id);

        if (data.name !== existingRepo.name) {
          // If name is different, update it and reprocess
          await storage.updateRepository(existingRepo.id, {
            name: data.name,
            status: "pending",
            processedAt: new Date().toISOString()
          });
          processRepositoryFiles(existingRepo.id, data.url);
          res.json({ ...existingRepo, name: data.name, status: "pending" });
        } else {
          // If name is same, just reprocess
          await storage.updateRepository(existingRepo.id, {
            status: "pending",
            processedAt: new Date().toISOString()
          });
          processRepositoryFiles(existingRepo.id, data.url);
          res.json({ ...existingRepo, status: "pending" });
        }
        return;
      }

      const repository = await storage.createRepository({
        ...data,
        processedAt: new Date().toISOString(),
      });

      // Process repository files asynchronously
      processRepositoryFiles(repository.id, data.url);

      res.json(repository);
    } catch (error) {
      console.error("Error creating repository:", error);
      res.status(400).json({ message: "Invalid repository data" });
    }
  });

  app.get("/api/repositories/check", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        res.status(400).json({ message: "URL is required" });
        return;
      }

      const repository = await storage.findRepositoryByUrl(url);
      res.json({ exists: !!repository, repository });
    } catch (error) {
      console.error("Error checking repository:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/repositories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const repository = await storage.getRepository(id);
      if (!repository) {
        res.status(404).json({ message: "Repository not found" });
        return;
      }
      res.json(repository);
    } catch (error) {
      console.error("Error getting repository:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/repositories/:id/files", async (req, res) => {
    const id = parseInt(req.params.id);
    const files = await storage.getFilesByRepository(id);
    res.json(files);
  });

  app.get("/api/repositories", async (req, res) => {
    try {
      const repositories = await storage.getAllRepositories();
      res.json(repositories);
    } catch (error) {
      console.error("Error getting repositories:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add new route for triggering embedding generation
  app.post("/api/repositories/:id/generate-embeddings", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const repository = await storage.getRepository(id);

      if (!repository) {
        res.status(404).json({ message: "Repository not found" });
        return;
      }

      // Start the embedding generation process
      await embeddingsController.processRepository(id);

      res.json({ message: "Embedding generation started" });
    } catch (error) {
      console.error("Error generating embeddings:", error);
      res.status(500).json({ message: "Error generating embeddings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Modify the existing processRepositoryFiles function to only handle file processing
async function processRepositoryFiles(repositoryId: number, url: string) {
  try {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error("GitHub token is not configured");
    }

    console.log(`[Repository ${repositoryId}] Starting GraphQL query for repository: ${url}`);
    const files = await fetchRepositoryFiles(url, process.env.GITHUB_TOKEN);
    console.log(`[Repository ${repositoryId}] Retrieved ${files.length} files from GitHub`);

    // First save all files to the database
    console.log(`[Repository ${repositoryId}] Saving ${files.length} files to database`);
    for (const file of files) {
      try {
        await storage.createFile({
          repositoryId,
          ...file
        });
      } catch (error) {
        console.error(`[Repository ${repositoryId}] Error saving file ${file.path}:`, error);
        throw error;
      }
    }
    console.log(`[Repository ${repositoryId}] Successfully saved all files to database`);

    // Then process files for chunking
    try {
      await fileProcessor.processRepositoryFiles(repositoryId);
      console.log(`[Repository ${repositoryId}] Successfully processed and chunked files`);

      // Update status to ready_for_embedding and verify the update
      await storage.updateRepositoryStatus(repositoryId, "ready_for_embedding");
      const updatedRepo = await storage.getRepository(repositoryId);
      console.log(`[Repository ${repositoryId}] Updated status to: ${updatedRepo?.status}`);

    } catch (error) {
      console.error(`[Repository ${repositoryId}] Error in file processing phase:`, error);
      await storage.updateRepositoryStatus(repositoryId, "failed");
      throw error;
    }
  } catch (error) {
    console.error(`[Repository ${repositoryId}] Error processing repository files:`, error);
    await storage.updateRepositoryStatus(repositoryId, "failed");
    throw error;
  }
}