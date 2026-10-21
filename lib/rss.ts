import Parser from "rss-parser";
import { sql } from "@/lib/db";

export interface RecentItem {
  source: string;
  title: string;
  url: string;
  publishedAt: Date;
  snippet: string;
}

export interface RssFeedConfig {
  name: string;
  url: string;
  category?: string;
}

const parser = new Parser({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
});

function cleanSourceName(rawTitle?: string, fallbackUrl?: string): string {
  const str = rawTitle?.trim() || fallbackUrl || "Berita";
  if (str.includes("Detik") || str.includes("detik")) return "Detikcom";
  if (str.includes("CNN Indonesia") || str.includes("cnnindonesia")) return "CNN Indonesia";
  if (str.includes("Greenpeace") || str.includes("greenpeace")) return "Greenpeace Indonesia";
  if (str.includes("CNBC Indonesia")) return "CNBC Indonesia";
  if (str.includes("ANTARA")) return "Antara News";
  if (str.includes("BBC News Indonesia")) return "BBC Indonesia";
  if (str === "BBC News" || str.includes("BBC")) return "BBC World";
  if (str.includes("DailySocial")) return "DailySocial";
  if (str.includes("TechCrunch")) return "TechCrunch";
  return str;
}

export async function getActiveFeedConfigs(): Promise<RssFeedConfig[]> {
  try {
    const rows = await sql`
      SELECT name, url, category FROM rss_sources WHERE active = true ORDER BY id ASC;
    `;
    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        name: String(r.name),
        url: String(r.url),
        category: String(r.category || "UMUM"),
      }));
    }
  } catch (e) {
    console.warn("Gagal memuat feeds dari database rss_sources, fallback ke .env:", e);
  }

  // Fallback ke .env
  const envFeeds = (process.env.RSS_FEEDS || "")
    .split(",")
    .map((feed) => feed.trim())
    .filter(Boolean);

  return envFeeds.map((url) => ({
    name: cleanSourceName(undefined, url),
    url,
    category: "UMUM",
  }));
}

export async function fetchRecentItems(): Promise<RecentItem[]> {
  const feedConfigs = await getActiveFeedConfigs();
  const items: RecentItem[] = [];
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

  for (const feedConfig of feedConfigs) {
    try {
      const feed = await parser.parseURL(feedConfig.url);
      const source = feedConfig.name || cleanSourceName(feed.title, feedConfig.url);

      for (const item of feed.items || []) {
        const title = item.title?.trim();
        const url = item.link?.trim();

        if (!title || !url) {
          continue;
        }

        const dateStr = item.isoDate || item.pubDate;
        if (!dateStr) {
          continue;
        }

        const publishedAt = new Date(dateStr);
        if (isNaN(publishedAt.getTime())) {
          continue;
        }

        if (publishedAt.getTime() < twentyFourHoursAgo) {
          continue;
        }

        const rawSnippet = item.contentSnippet || item.content || "";
        const snippet = rawSnippet.slice(0, 1500);

        items.push({
          source,
          title,
          url,
          publishedAt,
          snippet,
        });
      }
    } catch (error) {
      console.error(`Gagal membaca feed dari ${feedConfig.url}:`, error);
    }
  }

  return items;
}
