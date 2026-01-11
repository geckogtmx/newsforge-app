import { drizzle } from "drizzle-orm/mysql2";
import { newsSources } from "./drizzle/schema";
import { nanoid } from "nanoid";

const db = drizzle(process.env.DATABASE_URL!);

// Test RSS feeds
const testSources = [
  {
    id: nanoid(),
    userId: 1, // Admin user
    name: "TechCrunch",
    type: "rss" as const,
    config: JSON.stringify({ url: "https://techcrunch.com/feed/" }),
    topics: JSON.stringify(["technology", "startups", "AI"]),
    isActive: true,
    qualityScore: 50,
    totalHeadlines: 0,
    selectedHeadlines: 0,
    finalHeadlines: 0,
    selectionRate: 0,
    finalRate: 0,
    userRating: 0,
  },
  {
    id: nanoid(),
    userId: 1,
    name: "Hacker News RSS",
    type: "rss" as const,
    config: JSON.stringify({ url: "https://hnrss.org/frontpage" }),
    topics: JSON.stringify(["technology", "programming", "startups"]),
    isActive: true,
    qualityScore: 50,
    totalHeadlines: 0,
    selectedHeadlines: 0,
    finalHeadlines: 0,
    selectionRate: 0,
    finalRate: 0,
    userRating: 0,
  },
  {
    id: nanoid(),
    userId: 1,
    name: "The Verge",
    type: "rss" as const,
    config: JSON.stringify({ url: "https://www.theverge.com/rss/index.xml" }),
    topics: JSON.stringify(["technology", "gadgets", "science"]),
    isActive: true,
    qualityScore: 50,
    totalHeadlines: 0,
    selectedHeadlines: 0,
    finalHeadlines: 0,
    selectionRate: 0,
    finalRate: 0,
    userRating: 0,
  },
];

async function main() {
  console.log("Adding test RSS sources...");
  for (const source of testSources) {
    await db.insert(newsSources).values(source);
    console.log(`✓ Added: ${source.name}`);
  }

  console.log("\n✅ Test sources added successfully!");
  process.exit(0);
}

main().catch(console.error);
