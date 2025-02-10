import OpenAI from "openai";
import { FileChunk } from "../file-processor";

// Export the interface for better decoupling
export interface IEmbeddingsService {
  generateEmbeddings(chunks: FileChunk[]): Promise<EmbeddedChunk[]>;
}

export interface EmbeddedChunk extends FileChunk {
  embedding: number[];
}

export class OpenAIEmbeddingsService implements IEmbeddingsService {
  private openai: OpenAI;
  
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is required");
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async generateEmbeddings(chunks: FileChunk[]): Promise<EmbeddedChunk[]> {
    const embeddedChunks: EmbeddedChunk[] = [];
    
    // Process chunks in batches to avoid rate limits
    const batchSize = 20;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(chunks.length / batchSize)}`);
      
      const batchResults = await Promise.all(
        batch.map(async (chunk) => {
          try {
            const response = await this.openai.embeddings.create({
              model: "text-embedding-3-large",
              input: chunk.content,
              encoding_format: "float",
            });

            return {
              ...chunk,
              embedding: response.data[0].embedding,
            };
          } catch (error) {
            console.error(`Error generating embedding for chunk from ${chunk.metadata.filePath}:`, error);
            throw error;
          }
        })
      );
      
      embeddedChunks.push(...batchResults);
    }

    return embeddedChunks;
  }
}

// Export singleton instance
export const embeddingsService = new OpenAIEmbeddingsService();
