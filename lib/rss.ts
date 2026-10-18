import Parser from "rss-parser";

export interface RecentItem {
  source: string;
  title: string;
  url: string;
  publishedAt: Date;
  snippet: string;
}

const parser = new Parser();

export async function fetchRecentItems(): Promise<RecentItem[]> {
  const feedUrls = (process.env.RSS_FEEDS || "")
    .split(",")
    .map((feed) => feed.trim())
    .filter(Boolean);

  const items: RecentItem[] = [];
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

  for (const feedUrl of feedUrls) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const source = feed.title?.trim() || feedUrl;

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
      console.error(`Gagal membaca feed dari ${feedUrl}:`, error);
    }
  }

  return items;
}
