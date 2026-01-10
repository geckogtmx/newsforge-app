/**
 * Keyword Alerts tRPC Router
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { keywordAlerts } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { validateKeyword } from "../services/keywordAlerts";

export const alertsRouter = router({
  /**
   * List all keyword alerts for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const alerts = await db
      .select()
      .from(keywordAlerts)
      .where(eq(keywordAlerts.userId, ctx.user.id));

    return alerts;
  }),

  /**
   * Create a new keyword alert
   */
  create: protectedProcedure
    .input(
      z.object({
        keyword: z.string().min(2).max(255),
        notifyDesktop: z.boolean().default(true),
        autoTag: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate keyword
      const validation = validateKeyword(input.keyword);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const alertId = nanoid();

      await db.insert(keywordAlerts).values({
        id: alertId,
        userId: ctx.user.id,
        keyword: input.keyword.trim(),
        isActive: true,
        notifyDesktop: input.notifyDesktop,
        autoTag: input.autoTag,
        matchCount: 0,
      });

      return { success: true, alertId };
    }),

  /**
   * Update a keyword alert
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        keyword: z.string().min(2).max(255).optional(),
        isActive: z.boolean().optional(),
        notifyDesktop: z.boolean().optional(),
        autoTag: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Verify ownership
      const existing = await db
        .select()
        .from(keywordAlerts)
        .where(and(eq(keywordAlerts.id, input.id), eq(keywordAlerts.userId, ctx.user.id)))
        .limit(1);

      if (existing.length === 0) {
        throw new Error("Alert not found");
      }

      // Validate keyword if provided
      if (input.keyword) {
        const validation = validateKeyword(input.keyword);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(", "));
        }
      }

      const updates: Record<string, unknown> = {};
      if (input.keyword !== undefined) updates.keyword = input.keyword.trim();
      if (input.isActive !== undefined) updates.isActive = input.isActive;
      if (input.notifyDesktop !== undefined) updates.notifyDesktop = input.notifyDesktop;
      if (input.autoTag !== undefined) updates.autoTag = input.autoTag;

      await db
        .update(keywordAlerts)
        .set(updates)
        .where(eq(keywordAlerts.id, input.id));

      return { success: true };
    }),

  /**
   * Delete a keyword alert
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Verify ownership
      const existing = await db
        .select()
        .from(keywordAlerts)
        .where(and(eq(keywordAlerts.id, input.id), eq(keywordAlerts.userId, ctx.user.id)))
        .limit(1);

      if (existing.length === 0) {
        throw new Error("Alert not found");
      }

      await db.delete(keywordAlerts).where(eq(keywordAlerts.id, input.id));

      return { success: true };
    }),

  /**
   * Get alert statistics
   */
  getStatistics: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const alert = await db
        .select()
        .from(keywordAlerts)
        .where(and(eq(keywordAlerts.id, input.id), eq(keywordAlerts.userId, ctx.user.id)))
        .limit(1);

      if (alert.length === 0) {
        throw new Error("Alert not found");
      }

      return {
        matchCount: alert[0].matchCount ?? 0,
        avgMatchesPerRun: 0, // TODO: Calculate from run history
        lastMatch: null, // TODO: Get from database
      };
    }),

  /**
   * Increment match count for an alert
   */
  incrementMatchCount: protectedProcedure
    .input(z.object({ id: z.string(), count: z.number().default(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Verify ownership
      const existing = await db
        .select()
        .from(keywordAlerts)
        .where(and(eq(keywordAlerts.id, input.id), eq(keywordAlerts.userId, ctx.user.id)))
        .limit(1);

      if (existing.length === 0) {
        throw new Error("Alert not found");
      }

      const currentCount = existing[0].matchCount ?? 0;

      await db
        .update(keywordAlerts)
        .set({ matchCount: currentCount + input.count })
        .where(eq(keywordAlerts.id, input.id));

      return { success: true };
    }),
});
