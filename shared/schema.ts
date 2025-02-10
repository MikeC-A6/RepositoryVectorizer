import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  processedAt: text("processed_at").notNull(),
  status: text("status").notNull().default("pending"),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull(),
  path: text("path").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").notNull()
});

export const insertRepositorySchema = createInsertSchema(repositories).pick({
  url: true,
  name: true
});

export const insertFileSchema = createInsertSchema(files).pick({
  repositoryId: true,
  path: true,
  content: true,
  metadata: true
});

export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Repository = typeof repositories.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;
