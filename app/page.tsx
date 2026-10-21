import { sql } from "@/lib/db";
import { isBotActive } from "@/lib/settings";
import { ensureDatabaseSchema } from "@/lib/schema";
import { getRetentionDays } from "@/lib/retention";
import { calculateCategoryStats, extractTrendingTopics } from "@/lib/analytics";
import CommandCenterView, {
  ArticleItem,
  MetricStats,
  RssSourceItem,
  KeywordItem,
} from "./CommandCenterView";

export const dynamic = "force-dynamic";

export default async function Page() {
  await ensureDatabaseSchema();

  let articles: ArticleItem[] = [];
  let sources: RssSourceItem[] = [];
  let keywords: KeywordItem[] = [];
  let retentionDays: number | null = 7;

  const metrics: MetricStats = {
    totalMonitored: 0,
    totalTransferred: 0,
    totalSentTelegram: 0,
    activeFeedsCount: 6,
  };

  let botActive = true;

  try {
    botActive = await isBotActive();
    retentionDays = await getRetentionDays();

    // 1. Ambil artikel berita
    const rows = await sql`
      SELECT id, source, title, url, published_at, summary, sent_at, created_at, category, is_priority, is_synced_adafakta
      FROM articles
      WHERE summary IS NOT NULL AND summary != ''
      ORDER BY created_at DESC
      LIMIT 100;
    `;
    articles = rows as unknown as ArticleItem[];

    // 2. Ambil metrik ringkas
    const countAll = await sql`SELECT count(*)::int as count FROM articles;`;
    const countSent = await sql`SELECT count(*)::int as count FROM articles WHERE sent_at IS NOT NULL;`;

    // 3. Ambil sumber RSS
    const sourcesRows = await sql`
      SELECT id, name, url, category, active
      FROM rss_sources
      ORDER BY id ASC;
    `;
    sources = sourcesRows as unknown as RssSourceItem[];

    // 4. Ambil kata kunci prioritas
    const keywordsRows = await sql`
      SELECT id, keyword
      FROM priority_keywords
      ORDER BY id ASC;
    `;
    keywords = keywordsRows as unknown as KeywordItem[];

    const activeSources = sources.filter((s) => s.active);

    metrics.totalMonitored = countAll[0]?.count || articles.length;
    metrics.totalTransferred = articles.length;
    metrics.totalSentTelegram = countSent[0]?.count || 0;
    metrics.activeFeedsCount = activeSources.length || 6;
  } catch (err) {
    console.error("Gagal mengambil data Command Center:", err);
  }

  const categoryStats = calculateCategoryStats(articles);
  const trendingTopics = extractTrendingTopics(articles, 6);

  return (
    <main className="main-wrapper">
      <CommandCenterView
        initialArticles={articles}
        metrics={metrics}
        initialBotActive={botActive}
        initialSources={sources}
        initialKeywords={keywords}
        initialRetentionDays={retentionDays}
        initialCategoryStats={categoryStats}
        initialTrendingTopics={trendingTopics}
      />
    </main>
  );
}
