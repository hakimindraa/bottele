import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Article {
  id: number;
  source: string;
  title: string;
  url: string;
  published_at: string | Date | null;
  summary: string;
  created_at: string | Date;
}

export default async function Page() {
  let articles: Article[] = [];
  let error: string | null = null;

  try {
    const rows = await sql`
      SELECT id, source, title, url, published_at, summary, created_at
      FROM articles
      WHERE summary IS NOT NULL AND summary != ''
      ORDER BY created_at DESC
      LIMIT 50
    `;
    articles = rows as unknown as Article[];
  } catch (err) {
    console.error("Gagal mengambil daftar artikel:", err);
    error = "Belum dapat terhubung ke database. Pastikan DATABASE_URL sudah diatur.";
  }

  return (
    <main className="container">
      <header className="header">
        <h1 className="title">Berita AI</h1>
        <p className="subtitle">
          Ringkasan berita harian terkini dari berbagai RSS feed bertenaga AI.
        </p>
      </header>

      {error && <div className="alert-error">{error}</div>}

      {!error && articles.length === 0 && (
        <div className="empty-state">
          <p>Belum ada artikel yang diringkas.</p>
          <p className="empty-sub">
            Jalankan cron job untuk mengambil berita terbaru dan membuat ringkasan.
          </p>
        </div>
      )}

      <div className="articles-list">
        {articles.map((article) => {
          const dateSource = article.published_at || article.created_at;
          const formattedDate = dateSource
            ? new Date(dateSource).toLocaleString("id-ID", {
                timeZone: "Asia/Bangkok",
              })
            : "-";

          return (
            <article key={article.id} className="article-card">
              <h2 className="article-title">
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  {article.title}
                </a>
              </h2>
              <div className="article-meta">
                <span className="source-name">{article.source}</span>
                <span className="separator">•</span>
                <time className="publish-time">{formattedDate}</time>
              </div>
              <p className="article-summary">{article.summary}</p>
            </article>
          );
        })}
      </div>
    </main>
  );
}
