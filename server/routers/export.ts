import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { eq, and, inArray } from "drizzle-orm";
import { contentPackages, compiledItems, rawHeadlines, userSettings, runArchives } from "../../drizzle/schema";
import { getDb } from "../db";
import {
  exportToObsidian,
  batchExportToObsidian,
  createDailyIndex,
  createKnowledgeGraph,
  type ContentPackageData,
} from "../services/obsidianExport";
import { nanoid } from "nanoid";

export const exportRouter = router({
  /**
   * Export a single content package to Obsidian
   */
  exportPackage: protectedProcedure
    .input(z.object({ packageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Get user settings for vault path
      const settingsRecords = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, ctx.user.id))
        .limit(1);

      if (settingsRecords.length === 0 || !settingsRecords[0].obsidianVaultPath) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Obsidian vault path not configured. Please set it in Settings.",
        });
      }

      const vaultPath = String(settingsRecords[0].obsidianVaultPath);

      // Get the package
      const packages = await db
        .select()
        .from(contentPackages)
        .where(eq(contentPackages.id, input.packageId))
        .limit(1);

      if (packages.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Package not found" });
      }

      const pkg = packages[0];

      // Get compiled item
      const items = await db
        .select()
        .from(compiledItems)
        .where(eq(compiledItems.id, pkg.compiledItemId))
        .limit(1);

      if (items.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Compiled item not found" });
      }

      const item = items[0];

      // Get source headlines
      const headlineIds = JSON.parse(String(item.sourceHeadlineIds || "[]")) as number[];
      const headlines = await db
        .select()
        .from(rawHeadlines)
        .where(inArray(rawHeadlines.id, headlineIds));

      // Prepare package data
      const packageData: ContentPackageData = {
        id: pkg.id,
        topic: item.topic,
        hook: item.hook,
        summary: item.summary,
        youtubeTitle: pkg.youtubeTitle || "",
        youtubeDescription: pkg.youtubeDescription || "",
        scriptOutline: pkg.scriptOutline || "",
        heatScore: item.heatScore || 0,
        sources: headlines.map((h) => h.source || "Unknown"),
        keywords: item.topic.split(/\s+/).filter((w) => w.length > 3), // Simple keyword extraction
        createdAt: pkg.createdAt || new Date(),
      };

      // Export to Obsidian
      const result = await exportToObsidian(packageData, {
        vaultPath,
        createBacklinks: true,
        useNestedFolders: true,
        addTags: true,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Export failed: ${result.error}`,
        });
      }

      return {
        success: true,
        filePath: result.filePath,
      };
    }),

  /**
   * Export all packages for a run to Obsidian
   */
  exportRun: protectedProcedure
    .input(z.object({ runId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Get user settings for vault path
      const settingsRecords = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, ctx.user.id))
        .limit(1);

      if (settingsRecords.length === 0 || !settingsRecords[0].obsidianVaultPath) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Obsidian vault path not configured. Please set it in Settings.",
        });
      }

      const vaultPath = String(settingsRecords[0].obsidianVaultPath);

      // Get all packages for this run
      const packages = await db
        .select()
        .from(contentPackages)
        .where(eq(contentPackages.runId, input.runId));

      if (packages.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No packages found for this run" });
      }

      // Get compiled items
      const itemIds = packages.map((pkg) => pkg.compiledItemId);
      const items = await db
        .select()
        .from(compiledItems)
        .where(inArray(compiledItems.id, itemIds));

      // Prepare package data array
      const packageDataArray: ContentPackageData[] = [];

      for (const pkg of packages) {
        const item = items.find((i) => i.id === pkg.compiledItemId);
        if (!item) continue;

        // Get source headlines
        const headlineIds = JSON.parse(String(item.sourceHeadlineIds || "[]")) as number[];
        const headlines = await db
          .select()
          .from(rawHeadlines)
          .where(inArray(rawHeadlines.id, headlineIds));

        packageDataArray.push({
          id: pkg.id,
          topic: item.topic,
          hook: item.hook,
          summary: item.summary,
          youtubeTitle: pkg.youtubeTitle || "",
          youtubeDescription: pkg.youtubeDescription || "",
          scriptOutline: pkg.scriptOutline || "",
          heatScore: item.heatScore || 0,
          sources: headlines.map((h) => h.source || "Unknown"),
          keywords: item.topic.split(/\s+/).filter((w) => w.length > 3),
          createdAt: pkg.createdAt || new Date(),
        });
      }

      // Batch export to Obsidian
      const results = await batchExportToObsidian(packageDataArray, {
        vaultPath,
        createBacklinks: true,
        useNestedFolders: true,
        addTags: true,
      });

      // Create daily index
      const date = new Date();
      await createDailyIndex(date, packageDataArray, vaultPath);

      // Create knowledge graph
      await createKnowledgeGraph(packageDataArray, vaultPath);

      // Archive the run
      await db.insert(runArchives).values({
        runId: input.runId,
        userId: ctx.user.id,
        archivedData: JSON.stringify(packageDataArray),
        obsidianExportPath: vaultPath,
        archivedAt: new Date(),
      });

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      return {
        success: successCount > 0,
        totalExported: successCount,
        totalFailed: failureCount,
        results,
      };
    }),

  /**
   * Get export history for the user
   */
  getExportHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    }

    const archives = await db
      .select()
      .from(runArchives)
      .where(eq(runArchives.userId, ctx.user.id));

    return archives.map((archive) => ({
      id: archive.id,
      runId: archive.runId,
      exportPath: archive.obsidianExportPath,
      archivedAt: archive.archivedAt,
      itemCount: JSON.parse(String(archive.archivedData || "[]")).length,
    }));
  }),
});
