import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, bigint } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// NewsForge Tables

export const newsSources = mysqlTable("newsSources", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["rss", "gmail", "youtube", "website"]).notNull(),
  config: json("config").notNull(), // { url?, label?, channelId?, etc }
  topics: json("topics").notNull(), // Array of topic strings
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NewsSource = typeof newsSources.$inferSelect;
export type InsertNewsSource = typeof newsSources.$inferInsert;

export const runs = mysqlTable("runs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["draft", "collecting", "compiling", "reviewing", "completed", "archived"]).default("draft").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  stats: json("stats").notNull(), // { itemsCollected, itemsCompiled, tokensUsed, contentItemsCreated }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Run = typeof runs.$inferSelect;
export type InsertRun = typeof runs.$inferInsert;

export const rawHeadlines = mysqlTable("rawHeadlines", {
  id: int("id").autoincrement().primaryKey(),
  runId: varchar("runId", { length: 64 }).notNull(),
  sourceId: varchar("sourceId", { length: 64 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  url: varchar("url", { length: 2048 }).notNull(),
  publishedAt: timestamp("publishedAt"),
  source: mysqlEnum("source", ["rss", "gmail", "youtube", "website"]).notNull(),
  isSelected: boolean("isSelected").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RawHeadline = typeof rawHeadlines.$inferSelect;
export type InsertRawHeadline = typeof rawHeadlines.$inferInsert;

export const compiledItems = mysqlTable("compiledItems", {
  id: int("id").autoincrement().primaryKey(),
  runId: varchar("runId", { length: 64 }).notNull(),
  topic: varchar("topic", { length: 255 }).notNull(),
  hook: varchar("hook", { length: 500 }).notNull(),
  summary: text("summary").notNull(),
  sourceHeadlineIds: json("sourceHeadlineIds").notNull(), // Array of RawHeadline IDs
  isSelected: boolean("isSelected").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompiledItem = typeof compiledItems.$inferSelect;
export type InsertCompiledItem = typeof compiledItems.$inferInsert;

export const contentPackages = mysqlTable("contentPackages", {
  id: int("id").autoincrement().primaryKey(),
  runId: varchar("runId", { length: 64 }).notNull(),
  compiledItemId: int("compiledItemId").notNull(),
  youtubeTitle: varchar("youtubeTitle", { length: 100 }),
  youtubeDescription: text("youtubeDescription"),
  scriptOutline: text("scriptOutline"),
  status: mysqlEnum("status", ["draft", "ready", "exported"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentPackage = typeof contentPackages.$inferSelect;
export type InsertContentPackage = typeof contentPackages.$inferInsert;

export const runArchives = mysqlTable("runArchives", {
  id: int("id").autoincrement().primaryKey(),
  runId: varchar("runId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  archivedData: json("archivedData").notNull(), // Full run data snapshot
  obsidianExportPath: varchar("obsidianExportPath", { length: 2048 }),
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
});

export type RunArchive = typeof runArchives.$inferSelect;
export type InsertRunArchive = typeof runArchives.$inferInsert;

export const userSettings = mysqlTable("userSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  tone: varchar("tone", { length: 50 }).default("professional").notNull(),
  format: json("format").notNull(), // { structure, cadence }
  obsidianVaultPath: varchar("obsidianVaultPath", { length: 2048 }),
  llmModel: varchar("llmModel", { length: 100 }).default("claude-3.5-sonnet").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;