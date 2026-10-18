import { sql } from "@/lib/db";
import { fetchRecentItems } from "@/lib/rss";
import { summarize } from "@/lib/summarize";
import { escapeHtml, sendTelegram, TelegramInlineButton } from "@/lib/telegram";
import { sendToAdafakta } from "@/lib/adafakta";

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

  // a. Sisir feed RSS terbaru
  const items = await fetchRecentItems();
  fetched = items.length;

  const snippetMap = new Map<string, string>();
  for (const item of items) {
    snippetMap.set(item.url, item.snippet);
  }

  // b. Simpan artikel baru ke database intelijen
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

  // c. Ambil antrean berita terhangat yang belum diproses
  const maxArticles = Number(process.env.MAX_ARTICLES_PER_RUN) || 3;
  const pendingArticles = (await sql`
    SELECT * FROM articles
    WHERE sent_at IS NULL
    ORDER BY published_at DESC NULLS LAST
    LIMIT ${maxArticles}
  `) as unknown as ArticleRow[];

  // d, e, f. Bedah fakta kritis, transfer ke AdaFakta, dan tembak Telegram Pager
  for (const article of pendingArticles) {
    try {
      let currentSummary = article.summary;

      // Jika belum dianalisis, jalankan AI jurnalis investigasi
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

      // Transfer draf intelijen ke meja redaksi adafakta.web.id
      const adafaktaSuccess = await sendToAdafakta({
        title: article.title,
        source: article.source,
        url: article.url,
        published_at: article.published_at,
        summary: currentSummary,
      });

      // Format Laporan Intelijen Redaksi untuk Telegram Pager
      const safeTitle = escapeHtml(article.title);
      const safeSummary = escapeHtml(currentSummary);
      const safeSource = escapeHtml(article.source);
      const safeHref = article.url.replace(/&/g, "&amp;");
      
      const publishDateStr = article.published_at
        ? new Date(article.published_at).toLocaleString("id-ID", {
            timeZone: "Asia/Bangkok",
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "-";

      const message = [
        `🚨 <b>[ATENSI REDAKSI] LAPORAN JURNALIS AI</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `📰 <b>Kanal</b>  : ${safeSource}`,
        `🕒 <b>Terbit</b> : ${publishDateStr} WIB`,
        `📌 <b>Isu</b>    : <b>${safeTitle}</b>`,
        ``,
        `📝 <b>Bedah Fakta & Urgensi:</b>`,
        `${safeSummary}`,
        ``,
        `📊 <b>Status Distribusi:</b>`,
        adafaktaSuccess
          ? `✅ <i>Tersimpan di Meja Redaksi AdaFakta</i>`
          : `⚠️ <i>Disimpan lokal (Menunggu sync AdaFakta)</i>`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n");

      // Tombol Cepat Inline Keyboard
      const buttons: TelegramInlineButton[][] = [
        [
          { text: "🔗 Sumber Berita Asli", url: article.url },
          { text: "📝 Meja Redaksi AdaFakta", url: "https://www.adafakta.web.id/admin/jurnalis" },
        ],
      ];

      // Kirim Pager Alert ke Telegram
      await sendTelegram(message, buttons);

      // Tandai artikel telah berhasil diproses
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
