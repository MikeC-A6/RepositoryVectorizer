import { Repository } from "@shared/schema";
import { storage } from "../../storage";
import { fileProcessor } from "../file-processor";
import { embeddingsService } from "./embeddings-service";

export class EmbeddingsController {
  async processRepository(repositoryId: number): Promise<void> {
    try {
      const repository = await storage.getRepository(repositoryId);
      if (!repository) {
        throw new Error(`Repository with ID ${repositoryId} not found`);
      }

      console.log(`Starting embedding generation for repository ${repositoryId}`);

      // First clean up any existing files
      await storage.deleteFilesByRepositoryId(repositoryId);

      // Get processed chunks from file processor
      const processedRepo = fileProcessor.getProcessedRepository(repositoryId);
      if (!processedRepo) {
        throw new Error(`No processed files found for repository ${repositoryId}`);
      }

      // Generate embeddings in batches
      const batchSize = 100;
      const chunks = processedRepo.chunks;
      console.log(`Processing ${chunks.length} chunks in batches of ${batchSize}`);

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const embeddedChunks = await embeddingsService.generateEmbeddings(batch);
        console.log(`Generated embeddings for batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(chunks.length/batchSize)}`);

        // Store embeddings in database
        for (const chunk of embeddedChunks) {
          if (!chunk.metadata?.filePath) {
            console.warn('Skipping chunk with missing file path:', chunk);
            continue;
          }

          await storage.createFile({
            repositoryId,
            path: chunk.metadata.filePath,
            content: chunk.content,
            metadata: chunk.metadata,
            embedding: chunk.embedding
          });
        }
      }

      console.log(`Successfully stored embeddings for repository ${repositoryId}`);
      await storage.updateRepositoryStatus(repositoryId, "completed");
    } catch (error) {
      console.error(`Error processing embeddings for repository ${repositoryId}:`, error);
      await storage.updateRepositoryStatus(repositoryId, "failed");
      throw error;
    }
  }
}

export const embeddingsController = new EmbeddingsController();