import { google } from "googleapis";

export interface YouTubeHeadline {
  title: string;
  description: string;
  url: string;
  publishedAt: Date;
  source: "youtube";
  videoId: string;
  channelId: string;
}

/**
 * Fetch latest videos from a YouTube channel
 * Requires YOUTUBE_API_KEY env var
 */
export async function fetchYouTubeChannelVideos(
  channelId: string,
  maxResults: number = 10
): Promise<YouTubeHeadline[]> {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error("YouTube API key not configured");
    }

    const youtube = google.youtube({ version: "v3", auth: apiKey });

    // Get uploads playlist ID for the channel
    const channelRes = await youtube.channels.list({
      part: "contentDetails",
      id: channelId,
    } as any);

    const uploadsPlaylistId =
      (channelRes.data as any)?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      console.error(`Could not find uploads playlist for channel ${channelId}`);
      return [];
    }

    // Fetch videos from the uploads playlist
    const videosRes = await youtube.playlistItems.list({
      part: "snippet",
      playlistId: uploadsPlaylistId,
      maxResults: maxResults,
    } as any);

    const headlines: YouTubeHeadline[] = [];

    for (const item of ((videosRes.data as any)?.items || [])) {
      const snippet = item.snippet;
      const videoId = snippet?.resourceId?.videoId;
      if (!videoId) continue;
      headlines.push({
        title: snippet.title || "Untitled",
        description: snippet.description || "",
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: snippet.publishedAt
          ? new Date(snippet.publishedAt)
          : new Date(),
        source: "youtube",
        videoId,
        channelId,
      });
    }

    return headlines;
  } catch (error) {
    console.error(`Error fetching YouTube videos for channel ${channelId}:`, error);
    return [];
  }
}

/**
 * Fetch videos from multiple YouTube channels
 */
export async function fetchMultipleYouTubeChannels(
  channelIds: string[],
  maxResults: number = 10
): Promise<YouTubeHeadline[]> {
  const results = await Promise.all(
    channelIds.map((id) => fetchYouTubeChannelVideos(id, maxResults))
  );
  return results.flat();
}

/**
 * Search YouTube for videos matching a query
 */
export async function searchYouTube(
  query: string,
  maxResults: number = 10
): Promise<YouTubeHeadline[]> {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error("YouTube API key not configured");
    }

    const youtube = google.youtube({ version: "v3", auth: apiKey });

    const searchRes = await youtube.search.list({
      part: "snippet",
      q: query,
      type: "video",
      maxResults: maxResults,
      order: "date",
    } as any);

    const headlines: YouTubeHeadline[] = [];

    for (const item of ((searchRes.data as any)?.items || [])) {
      const videoId = (item.id as any)?.videoId;
      const snippet = item.snippet;
      if (!videoId || !snippet) continue;

      headlines.push({
        title: snippet.title || "Untitled",
        description: snippet.description || "",
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: snippet.publishedAt
          ? new Date(snippet.publishedAt)
          : new Date(),
        source: "youtube",
        videoId,
        channelId: snippet.channelId || "",
      });
    }

    return headlines;
  } catch (error) {
    console.error(`Error searching YouTube for "${query}":`, error);
    return [];
  }
}
