/**
 * Desktop Notification Service
 * 
 * Sends desktop notifications to users when keyword alerts are triggered.
 * Uses the Manus built-in notification API to send notifications to the project owner.
 */

import { notifyOwner } from "../_core/notification";
import type { AlertNotification } from "./keywordAlerts";

export interface NotificationOptions {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Send a desktop notification
 * Uses the Manus notification API to notify the project owner
 */
export async function sendDesktopNotification(
  options: NotificationOptions
): Promise<boolean> {
  try {
    const success = await notifyOwner({
      title: options.title,
      content: options.body,
    });

    return success;
  } catch (error) {
    console.error("[Notification] Error sending desktop notification:", error);
    return false;
  }
}

/**
 * Send keyword alert notification
 */
export async function sendKeywordAlertNotification(
  notification: AlertNotification
): Promise<boolean> {
  const count = notification.matches.length;
  const keyword = notification.keyword;

  const title = `NewsForge: "${keyword}" Alert`;
  const body = count === 1
    ? `Found 1 new headline matching "${keyword}"`
    : `Found ${count} new headlines matching "${keyword}"`;

  // Include headline titles in the notification
  const headlines = notification.matches
    .slice(0, 3) // Show up to 3 headlines
    .map(m => `• ${m.headline.title}`)
    .join("\n");

  const fullBody = `${body}\n\n${headlines}${count > 3 ? `\n\n...and ${count - 3} more` : ""}`;

  return sendDesktopNotification({
    title,
    body: fullBody,
    tag: `alert-${notification.alertId}`,
    data: {
      alertId: notification.alertId,
      keyword,
      matchCount: count,
    },
  });
}

/**
 * Send batch notification for multiple alerts
 */
export async function sendBatchAlertNotifications(
  notifications: AlertNotification[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const notification of notifications) {
    const success = await sendKeywordAlertNotification(notification);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send run completion notification
 */
export async function sendRunCompletionNotification(runStats: {
  itemsCollected: number;
  itemsCompiled: number;
  contentItemsCreated: number;
  tokensUsed: number;
}): Promise<boolean> {
  const title = "NewsForge: Run Completed";
  const body = `Your news compilation is ready!\n\n` +
    `• ${runStats.itemsCollected} headlines collected\n` +
    `• ${runStats.itemsCompiled} items compiled\n` +
    `• ${runStats.contentItemsCreated} content packages created\n` +
    `• ${runStats.tokensUsed.toLocaleString()} tokens used`;

  return sendDesktopNotification({
    title,
    body,
    tag: "run-completion",
  });
}

/**
 * Send budget warning notification
 */
export async function sendBudgetWarningNotification(
  currentSpend: number,
  monthlyBudget: number,
  percentage: number
): Promise<boolean> {
  const title = "NewsForge: Budget Warning";
  const body = `You've used ${percentage}% of your monthly budget.\n\n` +
    `Current spend: $${(currentSpend / 100).toFixed(2)}\n` +
    `Monthly budget: $${(monthlyBudget / 100).toFixed(2)}`;

  return sendDesktopNotification({
    title,
    body,
    tag: "budget-warning",
  });
}

/**
 * Send error notification
 */
export async function sendErrorNotification(
  errorMessage: string,
  context?: string
): Promise<boolean> {
  const title = "NewsForge: Error";
  const body = context
    ? `${context}\n\n${errorMessage}`
    : errorMessage;

  return sendDesktopNotification({
    title,
    body,
    tag: "error",
  });
}
