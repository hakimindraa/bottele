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
  category?: string;
  is_priority?: boolean;
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

  // Ambil daftar kata kunci prioritas
  let priorityKeywords: string[] = [];
  try {
    const kwRows = await sql`SELECT keyword FROM priority_keywords;`;
    priorityKeywords = kwRows.map((r) => String(r.keyword).toLowerCase().trim());
  } catch (e) {
    console.warn("Gagal memuat priority_keywords:", e);
  }

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
      // Cek apakah judul atau snippet mengandung kata kunci prioritas
      const textToScan = `${item.title} ${item.snippet}`.toLowerCase();
      const isPriority = priorityKeywords.some((kw) => kw && textToScan.includes(kw));

      const res = await sql`
        INSERT INTO articles (source, title, url, published_at, is_priority)
        VALUES (${item.source}, ${item.title}, ${item.url}, ${item.publishedAt.toISOString()}, ${isPriority})
        ON CONFLICT (url) DO NOTHING
        RETURNING id;
      `;
      if (res && res.length > 0) {
        inserted++;
      }
    } catch (error) {
      console.error(`Gagal menyimpan artikel ${item.url}:`, error);
    }
  }

  // c. Ambil antrean berita terhangat yang belum diproses (utamakan berita berstatus priority)
  const maxArticles = Number(process.env.MAX_ARTICLES_PER_RUN) || 3;
  const pendingArticles = (await sql`
    SELECT id, source, title, url, published_at, summary, sent_at, created_at, category, is_priority
    FROM articles
    WHERE sent_at IS NULL
    ORDER BY is_priority DESC, published_at DESC NULLS LAST
    LIMIT ${maxArticles};
  `) as unknown as ArticleRow[];

  // d, e, f. Bedah fakta kritis, klasifikasi kategori, transfer ke AdaFakta, dan tembak Telegram Pager
  for (const article of pendingArticles) {
    try {
      let currentSummary = article.summary;
      let currentCategory = article.category || "UMUM";

      // Cek apakah artikel prioritas
      const textToScan = `${article.title} ${currentSummary || ""}`.toLowerCase();
      const isPriority = article.is_priority || priorityKeywords.some((kw) => kw && textToScan.includes(kw));

      // Jika belum dianalisis, jalankan AI jurnalis investigasi
      if (!currentSummary || !currentSummary.trim()) {
        const snippet = snippetMap.get(article.url) || article.title;
        const analysis = await summarize({
          title: article.title,
          snippet,
          url: article.url,
          isPriority,
        });

        currentSummary = analysis.summary;
        currentCategory = analysis.category;

        if (!currentSummary || !currentSummary.trim()) {
          throw new Error(`Ringkasan kosong untuk artikel id ${article.id}`);
        }

        await sql`
          UPDATE articles
          SET summary = ${currentSummary}, category = ${currentCategory}, is_priority = ${isPriority}
          WHERE id = ${article.id};
        `;
      }

      // Transfer draf intelijen ke meja redaksi adafakta.web.id
      const adafaktaSuccess = await sendToAdafakta({
        title: article.title,
        source: article.source,
        url: article.url,
        published_at: article.published_at,
        summary: currentSummary,
        category: currentCategory,
      });

      // Format Laporan Intelijen Redaksi untuk Telegram Pager
      const safeTitle = escapeHtml(article.title);
      const safeSummary = escapeHtml(currentSummary);
      const safeSource = escapeHtml(article.source);
      const safeCategory = escapeHtml(currentCategory);
      
      const publishDateStr = article.published_at
        ? new Date(article.published_at).toLocaleString("id-ID", {
            timeZone: "Asia/Bangkok",
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "-";

      const headerTitle = isPriority
        ? `🔥 <b>[ULTRA HIGH PRIORITY] ATENSI REDAKSI KHUSUS</b>`
        : `🚨 <b>[ATENSI REDAKSI] LAPORAN JURNALIS AI</b>`;

      const message = [
        headerTitle,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `📰 <b>Kanal</b>   : ${safeSource}`,
        `🏷️ <b>Rubrik</b>  : #${safeCategory}`,
        `🕒 <b>Terbit</b>  : ${publishDateStr} WIB`,
        `📌 <b>Isu</b>     : <b>${safeTitle}</b>`,
        ``,
        `📝 <b>Bedah Fakta & Urgensi:</b>`,
        `${safeSummary}`,
        ``,
        `📊 <b>Status Distribusi:</b>`,
        adafaktaSuccess
          ? `✅ <i>Tersimpan di Meja Redaksi AdaFakta</i>`
          : `⚠️ <i>Disimpan lokal di radar bot</i>`,
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

      // Tandai sudah terkirim
      await sql`
        UPDATE articles
        SET sent_at = now()
        WHERE id = ${article.id};
      `;

      sent++;
    } catch (error) {
      console.error(`Gagal memproses draf artikel id ${article.id}:`, error);
      failed++;
    }
  }

  // g. Jalankan pembersihan otomatis data basi (Auto-Prune Retention)
  try {
    const { pruneOldArticles } = await import("@/lib/retention");
    await pruneOldArticles();
  } catch (pruneErr) {
    console.warn("[Auto-Prune] Gagal menjalankan pemangkasan otomatis:", pruneErr);
  }

  return { fetched, inserted, sent, failed };
}

