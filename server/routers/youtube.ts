import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { eq, and, inArray } from "drizzle-orm";
import { compiledItems, contentPackages, userSettings } from "../../drizzle/schema";
import { getDb } from "../db";
import { generateYouTubeAssets, regenerateYouTubeAsset } from "../services/youtubeAssetGeneration";
import { nanoid } from "nanoid";

export const youtubeRouter = router({
  /**
   * Generate YouTube assets for selected compiled items
   */
  generateAssets: protectedProcedure
    .input(
      z.object({
        runId: z.string(),
        itemIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Get compiled items
      let items;
      if (input.itemIds && input.itemIds.length > 0) {
        items = await db
          .select()
          .from(compiledItems)
          .where(
            and(
              eq(compiledItems.runId, input.runId),
              inArray(compiledItems.id, input.itemIds)
            )
          );
      } else {
        // Generate for all selected items
        items = await db
          .select()
          .from(compiledItems)
          .where(
            and(
              eq(compiledItems.runId, input.runId),
              eq(compiledItems.isSelected, true)
            )
          );
      }

      if (items.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No items found to generate assets for" });
      }

      // Get user preferences
      const settingsRecords = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, ctx.user.id))
        .limit(1);

      const settings = settingsRecords[0];
      const preferences = {
        tone: settings?.tone ? String(settings.tone) : undefined,
        format: settings?.format ? String(settings.format) : undefined,
      };

      // Generate assets for each item
      const generatedPackages = [];

      for (const item of items) {
        try {
          const assets = await generateYouTubeAssets(
            {
              topic: item.topic,
              hook: item.hook,
              summary: item.summary,
            },
            preferences
          );

          // Save to database
          const packageId = nanoid();
          await db.insert(contentPackages).values({
            id: packageId,
            runId: input.runId,
            compiledItemId: item.id,
            youtubeTitle: assets.title,
            youtubeDescription: assets.description,
            scriptOutline: assets.scriptOutline,
            status: "draft",
          });

          generatedPackages.push({
            id: packageId,
            compiledItemId: item.id,
            ...assets,
          });
        } catch (error) {
          console.error(`Error generating assets for item ${item.id}:`, error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to generate assets for "${item.topic}"`,
          });
        }
      }

      return {
        success: true,
        packages: generatedPackages,
      };
    }),

  /**
   * Get content packages for a run
   */
  getPackages: protectedProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const packages = await db
        .select()
        .from(contentPackages)
        .where(eq(contentPackages.runId, input.runId));

      // Get compiled items for each package
      const packageIds = packages.map((pkg) => pkg.compiledItemId);
      const items = await db
        .select()
        .from(compiledItems)
        .where(inArray(compiledItems.id, packageIds));

      // Combine packages with their compiled items
      const packagesWithItems = packages.map((pkg) => {
        const item = items.find((i) => i.id === pkg.compiledItemId);
        return {
          ...pkg,
          compiledItem: item || null,
        };
      });

      return packagesWithItems;
    }),

  /**
   * Regenerate a specific YouTube asset
   */
  regenerateAsset: protectedProcedure
    .input(
      z.object({
        packageId: z.string(),
        assetType: z.enum(["title", "description", "scriptOutline"]),
        instructions: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

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

      // Get the compiled item
      const items = await db
        .select()
        .from(compiledItems)
        .where(eq(compiledItems.id, pkg.compiledItemId))
        .limit(1);

      if (items.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Compiled item not found" });
      }

      const item = items[0];

      // Get user preferences
      const settingsRecords = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, ctx.user.id))
        .limit(1);

      const settings = settingsRecords[0];
      const preferences = {
        tone: settings?.tone ? String(settings.tone) : undefined,
        format: settings?.format ? String(settings.format) : undefined,
      };

      // Get current asset value
      const currentAsset =
        input.assetType === "title"
          ? pkg.youtubeTitle || ""
          : input.assetType === "description"
            ? pkg.youtubeDescription || ""
            : pkg.scriptOutline || "";

      // Regenerate the asset
      const regenerated = await regenerateYouTubeAsset(
        input.assetType,
        currentAsset,
        {
          topic: item.topic,
          hook: item.hook,
          summary: item.summary,
        },
        input.instructions,
        preferences
      );

      // Update in database
      const updateData: Record<string, string> = {};
      if (input.assetType === "title") {
        updateData.youtubeTitle = regenerated;
      } else if (input.assetType === "description") {
        updateData.youtubeDescription = regenerated;
      } else {
        updateData.scriptOutline = regenerated;
      }

      await db
        .update(contentPackages)
        .set(updateData)
        .where(eq(contentPackages.id, input.packageId));

      return {
        success: true,
        regenerated,
      };
    }),

  /**
   * Update a content package asset manually
   */
  updateAsset: protectedProcedure
    .input(
      z.object({
        packageId: z.string(),
        youtubeTitle: z.string().optional(),
        youtubeDescription: z.string().optional(),
        scriptOutline: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const { packageId, ...updateData } = input;

      await db
        .update(contentPackages)
        .set(updateData)
        .where(eq(contentPackages.id, packageId));

      return {
        success: true,
      };
    }),

  /**
   * Mark a package as ready for export
   */
  markReady: protectedProcedure
    .input(z.object({ packageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      await db
        .update(contentPackages)
        .set({ status: "ready" })
        .where(eq(contentPackages.id, input.packageId));

      return {
        success: true,
      };
    }),
});
