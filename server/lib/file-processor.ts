import { type File } from "@shared/schema";
import { storage } from "../storage";

interface FileChunk {
  content: string;
  metadata: {
    filePath: string;
    startLine: number;
    endLine: number;
    originalMetadata: Record<string, any>;
  };
}

interface ProcessedRepository {
  repositoryId: number;
  chunks: FileChunk[];
}

export class FileProcessor {
  private static readonly CHUNK_SIZE = 1000; // characters per chunk
  private static readonly OVERLAP = 200; // character overlap between chunks

  private processedRepositories: Map<number, ProcessedRepository> = new Map();

  async processRepositoryFiles(repositoryId: number): Promise<ProcessedRepository> {
    console.log(`[FileProcessor] Starting processing for repository ${repositoryId}`);
    
    try {
      const files = await storage.getFilesByRepository(repositoryId);
      console.log(`[FileProcessor] Retrieved ${files.length} files for processing`);

      const chunks: FileChunk[] = [];
      
      for (const file of files) {
        const fileChunks = this.processFile(file);
        chunks.push(...fileChunks);
        console.log(`[FileProcessor] Processed ${fileChunks.length} chunks from ${file.path}`);
      }

      const processedRepo: ProcessedRepository = {
        repositoryId,
        chunks
      };

      // Store in memory for later use
      this.processedRepositories.set(repositoryId, processedRepo);
      
      console.log(`[FileProcessor] Completed processing repository ${repositoryId} with ${chunks.length} total chunks`);
      return processedRepo;
    } catch (error) {
      console.error(`[FileProcessor] Error processing repository ${repositoryId}:`, error);
      throw new Error(`Failed to process repository ${repositoryId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private processFile(file: File): FileChunk[] {
    const chunks: FileChunk[] = [];
    const content = file.content;
    const lines = content.split('\n');
    
    let currentChunk = '';
    let startLine = 0;
    let currentLine = 0;

    for (const line of lines) {
      currentChunk += line + '\n';
      currentLine++;

      if (currentChunk.length >= this.constructor.CHUNK_SIZE) {
        // Find a good break point (end of line)
        chunks.push({
          content: currentChunk,
          metadata: {
            filePath: file.path,
            startLine,
            endLine: currentLine,
            originalMetadata: file.metadata
          }
        });

        // Start new chunk with overlap
        const overlapStart = currentChunk.length - this.constructor.OVERLAP;
        currentChunk = currentChunk.slice(overlapStart);
        startLine = Math.max(0, currentLine - this.countNewlines(currentChunk));
      }
    }

    // Add remaining content as final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk,
        metadata: {
          filePath: file.path,
          startLine,
          endLine: currentLine,
          originalMetadata: file.metadata
        }
      });
    }

    return chunks;
  }

  private countNewlines(text: string): number {
    return (text.match(/\n/g) || []).length;
  }

  getProcessedRepository(repositoryId: number): ProcessedRepository | undefined {
    return this.processedRepositories.get(repositoryId);
  }

  clearProcessedRepository(repositoryId: number): void {
    this.processedRepositories.delete(repositoryId);
  }
}

// Export singleton instance
export const fileProcessor = new FileProcessor();
