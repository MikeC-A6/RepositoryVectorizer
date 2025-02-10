import { repositories, files, type Repository, type InsertRepository, type File, type InsertFile } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  createRepository(repository: InsertRepository & { processedAt: string }): Promise<Repository>;
  updateRepositoryStatus(id: number, status: string): Promise<void>;
  getFilesByRepository(repositoryId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  getRepository(id: number): Promise<Repository | null>;
  findRepositoryByUrl(url: string): Promise<Repository | null>;
  updateRepository(id: number, data: Partial<Repository>): Promise<void>;
  deleteFilesByRepositoryId(repositoryId: number): Promise<void>;
  getAllRepositories(): Promise<Repository[]>;
}

function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/\/+$/, '');
}

export class DatabaseStorage implements IStorage {
  async createRepository(repository: InsertRepository & { processedAt: string }): Promise<Repository> {
    const [newRepo] = await db
      .insert(repositories)
      .values({ ...repository, url: normalizeUrl(repository.url), status: "pending" })
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

  async getRepository(id: number): Promise<Repository | null> {
    const [repository] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, id));
    return repository || null;
  }

  async findRepositoryByUrl(url: string): Promise<Repository | null> {
    const normalizedUrl = normalizeUrl(url);
    const [repository] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.url, normalizedUrl));
    return repository || null;
  }

  async updateRepository(id: number, data: Partial<Repository>): Promise<void> {
    const updateData = { ...data };
    if (updateData.url) {
      updateData.url = normalizeUrl(updateData.url);
    }
    await db
      .update(repositories)
      .set(updateData)
      .where(eq(repositories.id, id));
  }

  async deleteFilesByRepositoryId(repositoryId: number): Promise<void> {
    await db
      .delete(files)
      .where(eq(files.repositoryId, repositoryId));
  }

  async getAllRepositories(): Promise<Repository[]> {
    return await db
      .select()
      .from(repositories)
      .orderBy(repositories.processedAt);
  }
}

export const storage = new DatabaseStorage();