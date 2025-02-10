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
      
      // Get processed chunks from file processor
      const processedRepo = fileProcessor.getProcessedRepository(repositoryId);
      if (!processedRepo) {
        throw new Error(`No processed files found for repository ${repositoryId}`);
      }

      // Generate embeddings
      const embeddedChunks = await embeddingsService.generateEmbeddings(processedRepo.chunks);
      console.log(`Generated embeddings for ${embeddedChunks.length} chunks`);

      // Store embeddings in database
      for (const chunk of embeddedChunks) {
        await storage.createFile({
          repositoryId,
          path: chunk.metadata.filePath,
          content: chunk.content,
          metadata: chunk.metadata,
          embedding: JSON.stringify(chunk.embedding)
        });
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
