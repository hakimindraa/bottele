import Parser from "rss-parser";
import { sql } from "@/lib/db";

export interface RecentItem {
  source: string;
  title: string;
  url: string;
  publishedAt: Date;
  snippet: string;
  category?: string;
  freshnessTier?: string;
}

export interface FreshnessTierResult {
  items: RecentItem[];
  tierName: string;
}

export function evaluateAdaptiveFreshness(items: RecentItem[]): FreshnessTierResult {
  const now = Date.now();
  const tiers = [
    { label: "30 Menit Terakhir", maxMs: 30 * 60 * 1000 },
    { label: "1 Jam Terakhir", maxMs: 60 * 60 * 1000 },
    { label: "1.5 Jam Terakhir", maxMs: 90 * 60 * 1000 },
    { label: "2 Jam Terakhir", maxMs: 120 * 60 * 1000 },
    { label: "4 Jam Terakhir", maxMs: 240 * 60 * 1000 },
    { label: "24 Jam Terakhir", maxMs: 24 * 60 * 60 * 1000 },
  ];

  const sorted = [...items].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
  );

  for (const tier of tiers) {
    const matched = sorted.filter(
      (item) => now - item.publishedAt.getTime() <= tier.maxMs
    );
    if (matched.length > 0) {
      matched.forEach((m) => {
        m.freshnessTier = tier.label;
      });
      return { items: matched, tierName: tier.label };
    }
  }

  sorted.forEach((m) => {
    m.freshnessTier = "24 Jam Terakhir";
  });
  return { items: sorted, tierName: "24 Jam Terakhir" };
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
  if (str.includes("The Verge")) return "The Verge";
  if (str.includes("Wired")) return "Wired";
  if (str.includes("Google News Tekno")) return "Google News Tekno";
  if (str.includes("Google News Dunia")) return "Google News Internasional";
  if (str.includes("Google News Bisnis")) return "Google News Bisnis";
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

export async function fetchRecentItems(targetCategory?: string): Promise<RecentItem[]> {
  let feedConfigs = await getActiveFeedConfigs();
  const items: RecentItem[] = [];
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

  if (targetCategory) {
    const targetUpper = targetCategory.toUpperCase();
    feedConfigs = feedConfigs.filter(
      (f) => (f.category || "").toUpperCase() === targetUpper
    );

    // Pastikan setiap kategori memiliki feed topik langsung dari Google News
    if (targetUpper === "TEKNO") {
      const hasTekno = feedConfigs.some((f) => f.url.includes("topic/TECHNOLOGY"));
      if (!hasTekno) {
        feedConfigs.push({
          name: "Google News Tekno ID",
          url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=id&gl=ID&ceid=ID:id",
          category: "TEKNO",
        });
      }
    } else if (targetUpper === "INTERNASIONAL") {
      const hasWorld = feedConfigs.some((f) => f.url.includes("topic/WORLD"));
      if (!hasWorld) {
        feedConfigs.push({
          name: "Google News Dunia ID",
          url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=id&gl=ID&ceid=ID:id",
          category: "INTERNASIONAL",
        });
      }
    } else if (targetUpper === "BISNIS") {
      const hasBiz = feedConfigs.some((f) => f.url.includes("topic/BUSINESS"));
      if (!hasBiz) {
        feedConfigs.push({
          name: "Google News Bisnis ID",
          url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=id&gl=ID&ceid=ID:id",
          category: "BISNIS",
        });
      }
    } else if (targetUpper === "POLITIK") {
      const hasPolitik = feedConfigs.some((f) => f.url.includes("politik"));
      if (!hasPolitik) {
        feedConfigs.push({
          name: "Google News Politik ID",
          url: "https://news.google.com/rss/search?q=politik+Indonesia+pemerintah&hl=id&gl=ID&ceid=ID:id",
          category: "POLITIK",
        });
      }
    } else if (targetUpper === "LINGKUNGAN") {
      const hasLingkungan = feedConfigs.some((f) => f.url.includes("greenpeace") || f.url.includes("lingkungan"));
      if (!hasLingkungan) {
        feedConfigs.push({
          name: "Google News Lingkungan ID",
          url: "https://news.google.com/rss/search?q=lingkungan+hidup+iklim+hutan+Indonesia&hl=id&gl=ID&ceid=ID:id",
          category: "LINGKUNGAN",
        });
      }
    }
  }

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
          category: feedConfig.category || targetCategory || "UMUM",
        });
      }
    } catch (error) {
      console.error(`Gagal membaca feed dari ${feedConfig.url}:`, error);
    }
  }

  // Urutkan item dari yang paling baru
  items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  // Hitung tingkatan kesegaran adaptif
  const now = Date.now();
  for (const item of items) {
    const diffMs = now - item.publishedAt.getTime();
    if (diffMs <= 30 * 60 * 1000) {
      item.freshnessTier = "30 Menit Terakhir";
    } else if (diffMs <= 60 * 60 * 1000) {
      item.freshnessTier = "1 Jam Terakhir";
    } else if (diffMs <= 90 * 60 * 1000) {
      item.freshnessTier = "1.5 Jam Terakhir";
    } else if (diffMs <= 120 * 60 * 1000) {
      item.freshnessTier = "2 Jam Terakhir";
    } else if (diffMs <= 240 * 60 * 1000) {
      item.freshnessTier = "4 Jam Terakhir";
    } else {
      item.freshnessTier = "24 Jam Terakhir";
    }
  }

  return items;
}
