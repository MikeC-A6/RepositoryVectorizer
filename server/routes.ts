import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRepositorySchema, insertFileSchema } from "@shared/schema";
import { fetchRepositoryFiles } from "../client/src/lib/graphql";

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

      const repository = await storage.createRepository({
        ...data,
        processedAt: new Date().toISOString(),
      });

      // Process repository files asynchronously
      processRepositoryFiles(repository.id, data.url);

      res.json(repository);
    } catch (error) {
      res.status(400).json({ message: "Invalid repository data" });
    }
  });

  app.get("/api/repositories/:id/files", async (req, res) => {
    const id = parseInt(req.params.id);
    const files = await storage.getFilesByRepository(id);
    res.json(files);
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function processRepositoryFiles(repositoryId: number, url: string) {
  try {
    const files = await fetchRepositoryFiles(url);

    for (const file of files) {
      await storage.createFile({
        repositoryId,
        ...file
      });
    }

    await storage.updateRepositoryStatus(repositoryId, "completed");
  } catch (error) {
    console.error("Error processing repository files:", error);
    await storage.updateRepositoryStatus(repositoryId, "failed");
  }
}