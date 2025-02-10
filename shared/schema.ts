import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  processedAt: text("processed_at").notNull(),
  status: text("status").notNull().default("pending"),
});

// Define vector column type
const vector = (dimensions: number) => sql`vector(${sql.raw(dimensions.toString())})`;

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull(),
  path: text("path").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").notNull(),
  embedding: vector(1536),
});

// Create index for vector similarity search
sql`CREATE INDEX IF NOT EXISTS files_embedding_idx ON files USING ivfflat (embedding vector_l2_ops);`;

export const insertRepositorySchema = createInsertSchema(repositories).pick({
  url: true,
  name: true
});

export const insertFileSchema = createInsertSchema(files).pick({
  repositoryId: true,
  path: true,
  content: true,
  metadata: true,
  embedding: true
});

export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Repository = typeof repositories.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;