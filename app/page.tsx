import { sql } from "@/lib/db";
import CommandCenterView, {
  ArticleItem,
  MetricStats,
} from "./CommandCenterView";

export const dynamic = "force-dynamic";

export default async function Page() {
  let articles: ArticleItem[] = [];
  const activeFeeds = (process.env.RSS_FEEDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const metrics: MetricStats = {
    totalMonitored: 0,
    totalTransferred: 0,
    totalSentTelegram: 0,
    activeFeedsCount: activeFeeds.length || 6,
  };

  try {
    const rows = await sql`
      SELECT id, source, title, url, published_at, summary, sent_at, created_at
      FROM articles
      WHERE summary IS NOT NULL AND summary != ''
      ORDER BY created_at DESC
      LIMIT 100;
    `;
    articles = rows as unknown as ArticleItem[];

    const countAll = await sql`SELECT count(*)::int as count FROM articles;`;
    const countSent = await sql`SELECT count(*)::int as count FROM articles WHERE sent_at IS NOT NULL;`;

    metrics.totalMonitored = countAll[0]?.count || articles.length;
    metrics.totalTransferred = articles.length;
    metrics.totalSentTelegram = countSent[0]?.count || 0;
  } catch (err) {
    console.error("Gagal mengambil data Command Center:", err);
  }

  return (
    <main className="main-wrapper">
      <CommandCenterView initialArticles={articles} metrics={metrics} />
    </main>
  );
}
