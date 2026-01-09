import axios from "axios";
import * as cheerio from "cheerio";

export interface ScrapedHeadline {
  title: string;
  description: string;
  url: string;
  publishedAt: Date;
  source: "website";
}

export async function scrapeWebsite(
  websiteUrl: string,
  selectors?: {
    titleSelector?: string;
    descriptionSelector?: string;
    linkSelector?: string;
  }
): Promise<ScrapedHeadline[]> {
  try {
    const response = await axios.get(websiteUrl, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(response.data);
    const headlines: ScrapedHeadline[] = [];

    // Default selectors for common website structures
    const titleSelector =
      selectors?.titleSelector || "h1, h2, h3, article h2, .headline";
    const descSelector =
      selectors?.descriptionSelector || "p, .summary, .excerpt";
    const linkSelector = selectors?.linkSelector || "a";

    // Extract headlines from the page
    $(titleSelector).each((index, element) => {
      if (headlines.length >= 20) return; // Limit to 20 headlines per page

      const $element = $(element);
      const title = $element.text().trim();
      const $link = $element.closest("article").find(linkSelector).first();
      const url = $link.attr("href") || "";

      if (title && url) {
        const $desc = $element
          .closest("article")
          .find(descSelector)
          .first();
        const description = $desc.text().trim().substring(0, 200);

        headlines.push({
          title,
          description,
          url: new URL(url, websiteUrl).href, // Convert relative URLs to absolute
          publishedAt: new Date(),
          source: "website",
        });
      }
    });

    return headlines;
  } catch (error) {
    console.error(`Error scraping website ${websiteUrl}:`, error);
    return [];
  }
}

export async function scrapeMultipleWebsites(
  websites: Array<{ url: string; selectors?: any }>
): Promise<ScrapedHeadline[]> {
  const results = await Promise.all(
    websites.map((site) => scrapeWebsite(site.url, site.selectors))
  );
  return results.flat();
}
