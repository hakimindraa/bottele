import { sql } from "@/lib/db";
import OpenAI from "openai";
import { escapeHtml, sendTelegram, TelegramInlineButton } from "@/lib/telegram";

export async function generateMorningBriefing(): Promise<string> {
  // 1. Ambil artikel-artikel terbaik dalam 24-48 jam terakhir
  const rows = await sql`
    SELECT id, title, source, summary, category, is_priority, published_at
    FROM articles
    WHERE summary IS NOT NULL AND summary != ''
    ORDER BY is_priority DESC, created_at DESC
    LIMIT 12;
  `;

  if (!rows || rows.length === 0) {
    return "Tidak ada data liputan yang cukup untuk menyusun briefing pagi hari ini.";
  }

  const articlesContext = rows
    .map(
      (r, i) =>
        `${i + 1}. [${r.source} - #${r.category || "UMUM"}] ${r.title}\nRingkasan: ${r.summary}`
    )
    .join("\n\n");

  const openai = new OpenAI({
    baseURL: process.env.NINEROUTER_BASE_URL,
    apiKey: process.env.NINEROUTER_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: process.env.NINEROUTER_MODEL || "ag/claude-opus-4-6-thinking",
    messages: [
      {
        role: "system",
        content: `Kamu adalah Pemimpin Redaksi senior di AdaFakta (adafakta.web.id).
Tugasmu adalah menyusun "EXECUTIVE MORNING BRIEF" (Briefing Pagi Redaksi) untuk redaktur.
Tulis dalam bahasa Indonesia yang tegas, tajam, berorientasi fakta, dan memiliki arahan liputan jelas.

Pedoman penyusunan briefing:
1. Awali dengan salam hangat dan status pantauan radar pagi.
2. Pilih maksimal 4 sampai 5 isu terpanas dan paling mendesak dari data yang diberikan.
3. Untuk setiap isu, sertakan:
   - Judul & Sumber
   - Inti Fakta Krusial (1-2 kalimat)
   - Angle / Sudut Pandang Liputan yang Wajib Diambil Redaksi (mengapa ini penting dikawal).
4. Berikan 1 catatan penutup eksekutif mengenai fokus utama liputan hari ini.
5. Gunakan format teks yang bersih dan elegan (bisa menggunakan emoji secukupnya untuk penomoran).`,
      },
      {
        role: "user",
        content: `Berikut adalah daftar intelijen berita terbaru di radar bot:\n\n${articlesContext}`,
      },
    ],
  });

  const rawBrief = response.choices[0]?.message?.content?.trim() || "";

  // Kirim ke Telegram
  const todayStr = new Date().toLocaleDateString("id-ID", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const safeBrief = escapeHtml(rawBrief);

  const telegramMsg = [
    `☀️ <b>EXECUTIVE MORNING BRIEF</b>`,
    `📅 <i>${todayStr} | 07:00 WIB</i>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    safeBrief,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🏛️ <i>Meja Redaksi AdaFakta — Autonomous Scout Radar</i>`,
  ].join("\n");

  const buttons: TelegramInlineButton[][] = [
    [
      { text: "🌐 Buka Command Center", url: "https://bottelejurnalis.vercel.app" },
      { text: "📝 Meja Redaksi AdaFakta", url: "https://www.adafakta.web.id/admin/jurnalis" },
    ],
  ];

  await sendTelegram(telegramMsg, buttons);

  return rawBrief;
}
