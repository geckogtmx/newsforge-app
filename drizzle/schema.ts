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
  // Incremental run support
  lastFetchedAt: timestamp("lastFetchedAt"),
  // Quality scoring
  selectionRate: int("selectionRate").default(0), // % of headlines selected for compilation (0-100)
  finalRate: int("finalRate").default(0), // % that make it to content packages (0-100)
  userRating: int("userRating").default(0), // User rating: -1 (down), 0 (neutral), 1 (up)
  qualityScore: int("qualityScore").default(50), // Calculated quality score (0-100)
  totalHeadlines: int("totalHeadlines").default(0), // Total headlines fetched
  selectedHeadlines: int("selectedHeadlines").default(0), // Headlines selected for compilation
  finalHeadlines: int("finalHeadlines").default(0), // Headlines in final content packages
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
  stats: json("stats").notNull(), // { itemsCollected, itemsCompiled, tokensUsed, contentItemsCreated, deduplicatedGroups, costEstimate, actualCost }
  isIncremental: boolean("isIncremental").default(false).notNull(), // Whether this is an incremental run
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
  // Deduplication support
  deduplicationGroupId: varchar("deduplicationGroupId", { length: 64 }), // Group ID for similar headlines
  heatScore: int("heatScore").default(1), // Number of sources covering this story
  isBestVersion: boolean("isBestVersion").default(false), // Best version in dedup group
  // Keyword alerts
  matchedKeywords: json("matchedKeywords"), // Array of matched keyword IDs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RawHeadline = typeof rawHeadlines.$inferSelect;
export type InsertRawHeadline = typeof rawHeadlines.$inferInsert;

export const compiledItems = mysqlTable("compiledItems", {
  id: varchar("id", { length: 64 }).primaryKey(),
  runId: varchar("runId", { length: 64 }).notNull(),
  topic: varchar("topic", { length: 255 }).notNull(),
  hook: varchar("hook", { length: 500 }).notNull(),
  summary: text("summary").notNull(),
  sourceHeadlineIds: json("sourceHeadlineIds").notNull(), // Array of RawHeadline IDs
  heatScore: int("heatScore").default(1).notNull(),
  isSelected: boolean("isSelected").default(false).notNull(),
  generatedBy: varchar("generatedBy", { length: 50 }), // null or "assistant"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompiledItem = typeof compiledItems.$inferSelect;
export type InsertCompiledItem = typeof compiledItems.$inferInsert;

export const contentPackages = mysqlTable("contentPackages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  runId: varchar("runId", { length: 64 }).notNull(),
  compiledItemId: varchar("compiledItemId", { length: 64 }).notNull(),
  youtubeTitle: varchar("youtubeTitle", { length: 100 }),
  youtubeDescription: text("youtubeDescription"),
  scriptOutline: text("scriptOutline"),
  status: mysqlEnum("status", ["draft", "ready", "exported"]).default("draft").notNull(),
  isReady: boolean("isReady").default(false).notNull(),
  generatedBy: varchar("generatedBy", { length: 50 }), // null or "assistant"
  sourceConversationId: varchar("sourceConversationId", { length: 64 }), // FK to chatConversations
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
  // Budget and cost settings
  monthlyBudget: int("monthlyBudget").default(0), // Monthly budget in cents (0 = no limit)
  currentMonthSpend: int("currentMonthSpend").default(0), // Current month spend in cents
  lastBudgetReset: timestamp("lastBudgetReset").defaultNow(),
  // Incremental run preferences
  defaultIncrementalMode: boolean("defaultIncrementalMode").default(true),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

// Keyword Alerts Table
export const keywordAlerts = mysqlTable("keywordAlerts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  notifyDesktop: boolean("notifyDesktop").default(true).notNull(),
  autoTag: boolean("autoTag").default(true).notNull(),
  matchCount: int("matchCount").default(0), // Total matches
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KeywordAlert = typeof keywordAlerts.$inferSelect;
export type InsertKeywordAlert = typeof keywordAlerts.$inferInsert;

// Headline Embeddings Table (for semantic deduplication)
export const headlineEmbeddings = mysqlTable("headlineEmbeddings", {
  id: int("id").autoincrement().primaryKey(),
  headlineId: int("headlineId").notNull(), // Foreign key to rawHeadlines
  embedding: json("embedding").notNull(), // Vector embedding as JSON array
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HeadlineEmbedding = typeof headlineEmbeddings.$inferSelect;
export type InsertHeadlineEmbedding = typeof headlineEmbeddings.$inferInsert;

// Chat Assistant Tables
export const chatConversations = mysqlTable("chatConversations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = typeof chatConversations.$inferInsert;

export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: varchar("conversationId", { length: 64 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"), // { referencedRuns, referencedItems, createdAssets, tokens }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;