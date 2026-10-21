import { createHash } from "crypto";
import Parser from "rss-parser";

export interface LiveSearchItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  timeAgo: string;
  snippet: string;
  category: string;
  summary?: string;
  isPriority?: boolean;
}

export interface LiveSearchParams {
  query: string;
  region?: "ID" | "GLOBAL" | "US" | "EU" | "ASIA";
  timeRange?: "24h" | "7d" | "1h" | "all";
  mediaScope?: "all" | "top_national" | "global_elite";
  limit?: number;
}

const parser = new Parser({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
  },
});

function formatRelativeTime(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "Kemarin";
  return `${diffDay} hari lalu`;
}

export function detectNewsCategory(text: string, region?: string): string {
  const lower = text.toLowerCase();

  // Lingkungan & Iklim (Greenpeace, deforestasi, tambang, polusi, emisi)
  if (
    /greenpeace|lingkungan|iklim|deforestasi|hutan|tambang|nikel|amdal|polusi|emisi|konservasi|satwa|sampah|walhi|bencana|banjir|karhutla/i.test(
      lower
    )
  ) {
    return "LINGKUNGAN";
  }

  // Hukum & Kriminal
  if (
    /korupsi|kpk|polisi|kejaksaan|pengadilan|vonis|sidang|praperadilan|hukum|tersangka|terdakwa|tppu|gratifikasi|pasal/i.test(
      lower
    )
  ) {
    return "HUKUM";
  }

  // Politik & Pemerintahan
  if (
    /pilkada|pemilu|kpu|bawaslu|partai|dpr|mpr|presiden|menteri|prabowo|gibran|kabinet|koalisi|oposisi|resuffle|kebijakan|pemerintah/i.test(
      lower
    )
  ) {
    return "POLITIK";
  }

  // Bisnis & Finansial
  if (
    /ihsg|rupiah|saham|inflasi|bunga acuan|bank indonesia|apbn|pajak|investasi|ekonomi|finansial|emiten|dividen|bisnis|bumn/i.test(
      lower
    )
  ) {
    return "BISNIS";
  }

  // Teknologi
  if (
    /ai|artificial intelligence|teknologi|siber|startup|gadget|apple|google|microsoft|semikonduktor|chip|aplikasi|data center/i.test(
      lower
    )
  ) {
    return "TEKNO";
  }

  // Internasional
  if (
    region === "GLOBAL" ||
    region === "US" ||
    region === "EU" ||
    /pbb|un |gaza|israel|palestina|iran|ukraina|rusia|amerika|china|tiongkok|diplomat|geopolitik|gedung putih/i.test(
      lower
    )
  ) {
    return "INTERNASIONAL";
  }

  return "NASIONAL";
}

function cleanHtmlSnippet(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 350);
}

export async function executeLiveSearch({
  query,
  region = "ID",
  timeRange = "24h",
  mediaScope = "all",
  limit = 10,
}: LiveSearchParams): Promise<LiveSearchItem[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  // 1. Tentukan parameter regional Google News
  let hl = "id";
  let gl = "ID";
  let ceid = "ID:id";

  if (region === "GLOBAL" || region === "US") {
    hl = "en-US";
    gl = "US";
    ceid = "US:en";
  } else if (region === "EU") {
    hl = "en-GB";
    gl = "GB";
    ceid = "GB:en";
  } else if (region === "ASIA") {
    hl = "en-SG";
    gl = "SG";
    ceid = "SG:en";
  }

  // 2. Susun filter query
  let searchQuery = cleanQuery;

  // Filter portal media
  if (mediaScope === "top_national" && region === "ID") {
    searchQuery = `${cleanQuery} (site:detik.com OR site:kompas.com OR site:cnnindonesia.com OR site:tempo.co OR site:antaranews.com)`;
  } else if (mediaScope === "global_elite") {
    searchQuery = `${cleanQuery} (site:reuters.com OR site:bloomberg.com OR site:bbc.com OR site:aljazeera.com OR site:theguardian.com)`;
  }

  // Filter rentang waktu
  if (timeRange && timeRange !== "all") {
    searchQuery = `${searchQuery} when:${timeRange}`;
  }

  const encodedQuery = encodeURIComponent(searchQuery);
  const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

  try {
    const feed = await parser.parseURL(rssUrl);
    const items: LiveSearchItem[] = [];
    const seenTitles = new Set<string>();

    for (const rawItem of feed.items || []) {
      const fullTitle = rawItem.title?.trim() || "";
      const url = rawItem.link?.trim() || "";

      if (!fullTitle || !url) continue;

      // Pisahkan judul dan nama portal (format Google News: "Judul Berita - Portal Media")
      const lastDash = fullTitle.lastIndexOf(" - ");
      let title = fullTitle;
      let source = "Portal Berita";

      if (lastDash !== -1) {
        title = fullTitle.slice(0, lastDash).trim();
        source = fullTitle.slice(lastDash + 3).trim();
      }

      // Normalisasi judul untuk deduplikasi
      const normTitle = title
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .slice(0, 45);

      if (seenTitles.has(normTitle)) continue;
      seenTitles.add(normTitle);

      const dateStr = rawItem.isoDate || rawItem.pubDate;
      const pubDate = dateStr ? new Date(dateStr) : new Date();
      const timeAgo = formatRelativeTime(pubDate);

      const snippet = cleanHtmlSnippet(
        rawItem.contentSnippet || rawItem.content || ""
      );

      const category = detectNewsCategory(`${title} ${snippet}`, region);

      // Cek apakah isu sensitif/prioritas tinggi
      const isPriority = /greenpeace|korupsi|kpk|darurat|krisis|skandal|ancaman/i.test(
        `${title} ${snippet}`
      );

      const hash = createHash("md5")
        .update(url + title)
        .digest("hex")
        .slice(0, 12);

      items.push({
        id: `live-${hash}-${items.length + 1}`,
        title,
        url,
        source,
        publishedAt: pubDate.toISOString(),
        timeAgo,
        snippet: snippet || `Liputan terkini mengenai ${cleanQuery} dari ${source}.`,
        category,
        isPriority,
      });

      if (items.length >= limit) break;
    }

    return items;
  } catch (error) {
    console.error(`Gagal melakukan live search untuk "${query}":`, error);
    return [];
  }
}
