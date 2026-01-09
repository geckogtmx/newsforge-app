import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export interface GmailHeadline {
  title: string;
  description: string;
  url: string;
  publishedAt: Date;
  source: "gmail";
  messageId: string;
}

/**
 * Create an OAuth2 client for Gmail API
 * Requires GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URL env vars
 */
export function createGmailClient(): OAuth2Client {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUrl = process.env.GMAIL_REDIRECT_URL;

  if (!clientId || !clientSecret || !redirectUrl) {
    throw new Error("Gmail OAuth credentials not configured");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUrl);
}

/**
 * Get authorization URL for Gmail OAuth flow
 */
export function getGmailAuthUrl(oauth2Client: OAuth2Client): string {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getGmailTokens(
  oauth2Client: OAuth2Client,
  code: string
): Promise<any> {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
}

/**
 * Fetch emails from a specific Gmail label
 */
export async function fetchGmailMessages(
  oauth2Client: OAuth2Client,
  labelName: string,
  maxResults: number = 10
): Promise<GmailHeadline[]> {
  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Get label ID from label name
    const labelsRes = await gmail.users.labels.list({ userId: "me" });
    const label = labelsRes.data.labels?.find((l) => l.name === labelName);

    if (!label || !label.id) {
      console.error(`Label "${labelName}" not found`);
      return [];
    }

    // Fetch messages from the label
    const messagesRes = await gmail.users.messages.list({
      userId: "me",
      labelIds: [label.id],
      maxResults,
    });

    const messages = messagesRes.data.messages || [];
    const headlines: GmailHeadline[] = [];

    // Get full message details for each email
    for (const message of messages) {
      if (!message.id) continue;

      try {
        const fullMessage = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
          format: "full",
        });

        const headers = fullMessage.data.payload?.headers || [];
        const subject =
          headers.find((h) => h.name === "Subject")?.value || "Untitled";
        const from = headers.find((h) => h.name === "From")?.value || "";
        const date = headers.find((h) => h.name === "Date")?.value || "";

        // Extract body (simplified - handles text/plain and text/html)
        let body = "";
        if (fullMessage.data.payload?.parts) {
          const textPart = fullMessage.data.payload.parts.find(
            (p) => p.mimeType === "text/plain"
          );
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
          }
        } else if (fullMessage.data.payload?.body?.data) {
          body = Buffer.from(fullMessage.data.payload.body.data, "base64").toString("utf-8");
        }

        // Extract first URL from email body (newsletter link)
        const urlMatch = body.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/);
        const url = urlMatch ? urlMatch[0] : "";

        if (url) {
          headlines.push({
            title: subject,
            description: body.substring(0, 200),
            url,
            publishedAt: new Date(date),
            source: "gmail",
            messageId: message.id,
          });
        }
      } catch (error) {
        console.error(`Error fetching message ${message.id}:`, error);
      }
    }

    return headlines;
  } catch (error) {
    console.error("Error fetching Gmail messages:", error);
    return [];
  }
}
