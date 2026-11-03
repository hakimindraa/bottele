import { sql } from "@/lib/db";

export async function ensureDatabaseSchema() {
  try {
    // 1. Kolom category di tabel articles
    await sql`
      ALTER TABLE articles ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'UMUM';
    `;

    // 2. Kolom is_priority di tabel articles
    await sql`
      ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false;
    `;

    // 2.1. Kolom is_synced_adafakta di tabel articles
    await sql`
      ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_synced_adafakta BOOLEAN DEFAULT false;
    `;

    // 3. Tabel rss_sources
    await sql`
      CREATE TABLE IF NOT EXISTS rss_sources (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT UNIQUE NOT NULL,
        category TEXT DEFAULT 'UMUM',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `;

    // 4. Tabel priority_keywords
    await sql`
      CREATE TABLE IF NOT EXISTS priority_keywords (
        id SERIAL PRIMARY KEY,
        keyword TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `;

    // 5. Seed default RSS feeds jika belum ada
    const essentialFeeds = [
      { name: "Detikcom", url: "https://news.detik.com/rss", category: "NASIONAL" },
      { name: "CNN Indonesia", url: "https://www.cnnindonesia.com/nasional/rss", category: "NASIONAL" },
      { name: "Greenpeace Indonesia", url: "https://www.greenpeace.org/indonesia/feed/", category: "LINGKUNGAN" },
      { name: "CNBC Indonesia", url: "https://www.cnbcindonesia.com/news/rss", category: "BISNIS" },
      { name: "Google News Bisnis", url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=id&gl=ID&ceid=ID:id", category: "BISNIS" },
      { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "TEKNO" },
      { name: "DailySocial", url: "https://dailysocial.id/feed", category: "TEKNO" },
      { name: "DetikINET", url: "https://inet.detik.com/rss", category: "TEKNO" },
      { name: "Antara Tekno", url: "https://www.antaranews.com/rss/tekno.xml", category: "TEKNO" },
      { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "TEKNO" },
      { name: "Google News Tekno ID", url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=id&gl=ID&ceid=ID:id", category: "TEKNO" },
      { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "INTERNASIONAL" },
      { name: "Google News Dunia ID", url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=id&gl=ID&ceid=ID:id", category: "INTERNASIONAL" },
      { name: "Antara News", url: "https://www.antaranews.com/rss/terkini.xml", category: "NASIONAL" },
      { name: "CNN Indonesia Politik", url: "https://www.cnnindonesia.com/nasional/politik/rss", category: "POLITIK" },
      { name: "BBC Indonesia", url: "https://feeds.bbci.co.uk/indonesia/rss.xml", category: "NASIONAL" },
    ];

    for (const feed of essentialFeeds) {
      await sql`
        INSERT INTO rss_sources (name, url, category, active)
        VALUES (${feed.name}, ${feed.url}, ${feed.category}, true)
        ON CONFLICT (url) DO NOTHING;
      `;
    }

    // 6. Seed kata kunci prioritas investigasi
    const essentialKeywords = [
      "Greenpeace",
      "Lingkungan",
      "Deforestasi",
      "Korupsi",
      "Pilkada",
      "Diplomat",
      "Geopolitik",
      "Kebijakan",
      "KPK",
      "Artificial Intelligence",
      "OpenAI",
      "Nvidia",
      "Semikonduktor",
      "Cybersecurity",
      "Startup",
      "Gadget",
      "Apple",
      "Android",
      "Data Center"
    ];

    for (const kw of essentialKeywords) {
      await sql`
        INSERT INTO priority_keywords (keyword)
        VALUES (${kw})
        ON CONFLICT (keyword) DO NOTHING;
      `;
    }
  } catch (error) {
    console.error("Error ensuring database schema:", error);
  }
}
