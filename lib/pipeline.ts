import { sql } from "@/lib/db";
import { fetchRecentItems } from "@/lib/rss";
import { summarize } from "@/lib/summarize";
import { escapeHtml, sendTelegram } from "@/lib/telegram";

export interface ArticleRow {
  id: number;
  source: string;
  title: string;
  url: string;
  published_at: string | Date | null;
  summary: string | null;
  sent_at: string | Date | null;
  created_at: string | Date;
}

export interface DigestResult {
  fetched: number;
  inserted: number;
  sent: number;
  failed: number;
}

export async function runDailyDigest(): Promise<DigestResult> {
  let fetched = 0;
  let inserted = 0;
  let sent = 0;
  let failed = 0;

  // a. Panggil fetchRecentItems()
  const items = await fetchRecentItems();
  fetched = items.length;

  const snippetMap = new Map<string, string>();
  for (const item of items) {
    snippetMap.set(item.url, item.snippet);
  }

  // b. Simpan artikel baru ke database, lewati yang URL-nya sudah ada
  for (const item of items) {
    try {
      const res = await sql`
        INSERT INTO articles (source, title, url, published_at)
        VALUES (${item.source}, ${item.title}, ${item.url}, ${item.publishedAt.toISOString()})
        ON CONFLICT (url) DO NOTHING
        RETURNING id
      `;
      if (res && res.length > 0) {
        inserted++;
      }
    } catch (error) {
      console.error(`Gagal menyimpan artikel ${item.url}:`, error);
    }
  }

  // c. Ambil artikel yang belum dikirim
  const maxArticles = Number(process.env.MAX_ARTICLES_PER_RUN) || 3;
  const pendingArticles = (await sql`
    SELECT * FROM articles
    WHERE sent_at IS NULL
    ORDER BY published_at DESC NULLS LAST
    LIMIT ${maxArticles}
  `) as unknown as ArticleRow[];

  // d, e, f. Ringkas, kirim ke Telegram, dan catat status pengiriman
  for (const article of pendingArticles) {
    try {
      let currentSummary = article.summary;

      // Jika summary kosong, buat ringkasan lalu simpan ke database
      if (!currentSummary || !currentSummary.trim()) {
        const snippet = snippetMap.get(article.url) || article.title;
        currentSummary = await summarize({
          title: article.title,
          snippet,
          url: article.url,
        });

        if (!currentSummary || !currentSummary.trim()) {
          throw new Error(`Ringkasan kosong untuk artikel id ${article.id}`);
        }

        await sql`
          UPDATE articles
          SET summary = ${currentSummary}
          WHERE id = ${article.id}
        `;
      }

      // Format pesan Telegram
      const safeTitle = escapeHtml(article.title);
      const safeSummary = escapeHtml(currentSummary);
      const safeSource = escapeHtml(article.source);
      const safeHref = article.url.replace(/&/g, "&amp;");

      const message = `<b>${safeTitle}</b>\n\n${safeSummary}\n\n<a href="${safeHref}">Baca selengkapnya</a>\n<i>Sumber: ${safeSource}</i>`;

      // Kirim ke Telegram
      await sendTelegram(message);

      // Tandai artikel telah berhasil dikirim
      await sql`
        UPDATE articles
        SET sent_at = now()
        WHERE id = ${article.id}
      `;

      sent++;
    } catch (error) {
      failed++;
      console.error(`Gagal memproses artikel id ${article.id}:`, error);
    }
  }

  return { fetched, inserted, sent, failed };
}
