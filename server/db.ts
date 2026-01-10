import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  newsSources,
  InsertNewsSource,
  runs,
  InsertRun,
  rawHeadlines,
  InsertRawHeadline,
  compiledItems,
  InsertCompiledItem,
  contentPackages,
  InsertContentPackage,
  runArchives,
  InsertRunArchive,
  userSettings,
  InsertUserSettings,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// NewsForge Database Helpers

export async function getNewsSources(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(newsSources).where(eq(newsSources.userId, userId));
}

export async function createNewsSource(data: InsertNewsSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(newsSources).values(data);
  return result;
}

export async function updateNewsSource(id: string, data: Partial<InsertNewsSource>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(newsSources).set(data).where(eq(newsSources.id, id));
}

export async function deleteNewsSource(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(newsSources).where(eq(newsSources.id, id));
}

export async function createRun(data: InsertRun) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(runs).values(data);
  return result;
}

export async function getRunById(id: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateRun(id: string, data: Partial<InsertRun>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(runs).set(data).where(eq(runs.id, id));
}

export async function getUserRuns(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(runs).where(eq(runs.userId, userId)).orderBy(runs.createdAt);
}

export async function createRawHeadline(data: InsertRawHeadline) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(rawHeadlines).values(data);
}

export async function getRawHeadlines(runId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rawHeadlines).where(eq(rawHeadlines.runId, runId));
}

export async function updateHeadlineSelection(id: number, isSelected: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(rawHeadlines).set({ isSelected }).where(eq(rawHeadlines.id, id));
}

export async function createCompiledItem(data: InsertCompiledItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(compiledItems).values(data);
}

export async function getCompiledItems(runId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(compiledItems).where(eq(compiledItems.runId, runId));
}

export async function updateCompiledItem(id: number, data: Partial<InsertCompiledItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(compiledItems).set(data).where(eq(compiledItems.id, id));
}

export async function createContentPackage(data: InsertContentPackage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(contentPackages).values(data);
}

export async function getContentPackages(runId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentPackages).where(eq(contentPackages.runId, runId));
}

export async function updateContentPackage(id: number, data: Partial<InsertContentPackage>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(contentPackages).set(data).where(eq(contentPackages.id, id));
}

export async function createRunArchive(data: InsertRunArchive) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(runArchives).values(data);
}

export async function getUserArchives(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(runArchives).where(eq(runArchives.userId, userId));
}

export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertUserSettings(data: InsertUserSettings) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(userSettings).values(data).onDuplicateKeyUpdate({
    set: {
      tone: data.tone,
      format: data.format,
      obsidianVaultPath: data.obsidianVaultPath,
      llmModel: data.llmModel,
    },
  });
}
