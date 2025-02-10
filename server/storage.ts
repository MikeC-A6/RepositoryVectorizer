import { repositories, files, type Repository, type InsertRepository, type File, type InsertFile } from "@shared/schema";

export interface IStorage {
  createRepository(repository: InsertRepository & { processedAt: string }): Promise<Repository>;
  updateRepositoryStatus(id: number, status: string): Promise<void>;
  getFilesByRepository(repositoryId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
}

export class MemStorage implements IStorage {
  private repositories: Map<number, Repository>;
  private files: Map<number, File>;
  private currentRepoId: number;
  private currentFileId: number;

  constructor() {
    this.repositories = new Map();
    this.files = new Map();
    this.currentRepoId = 1;
    this.currentFileId = 1;
  }

  async createRepository(repository: InsertRepository & { processedAt: string }): Promise<Repository> {
    const id = this.currentRepoId++;
    const newRepo: Repository = { ...repository, id, status: "pending" };
    this.repositories.set(id, newRepo);
    return newRepo;
  }

  async updateRepositoryStatus(id: number, status: string): Promise<void> {
    const repo = this.repositories.get(id);
    if (repo) {
      this.repositories.set(id, { ...repo, status });
    }
  }

  async getFilesByRepository(repositoryId: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.repositoryId === repositoryId
    );
  }

  async createFile(file: InsertFile): Promise<File> {
    const id = this.currentFileId++;
    const newFile: File = { ...file, id };
    this.files.set(id, newFile);
    return newFile;
  }
}

export const storage = new MemStorage();
