import { repositories, files, type Repository, type InsertRepository, type File, type InsertFile } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  createRepository(repository: InsertRepository & { processedAt: string }): Promise<Repository>;
  updateRepositoryStatus(id: number, status: string): Promise<void>;
  getFilesByRepository(repositoryId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
}

export class DatabaseStorage implements IStorage {
  async createRepository(repository: InsertRepository & { processedAt: string }): Promise<Repository> {
    const [newRepo] = await db
      .insert(repositories)
      .values({ ...repository, status: "pending" })
      .returning();
    return newRepo;
  }

  async updateRepositoryStatus(id: number, status: string): Promise<void> {
    await db
      .update(repositories)
      .set({ status })
      .where(eq(repositories.id, id));
  }

  async getFilesByRepository(repositoryId: number): Promise<File[]> {
    return await db
      .select()
      .from(files)
      .where(eq(files.repositoryId, repositoryId));
  }

  async createFile(file: InsertFile): Promise<File> {
    const [newFile] = await db
      .insert(files)
      .values(file)
      .returning();
    return newFile;
  }
}

export const storage = new DatabaseStorage();