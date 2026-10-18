import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isBotActive, setBotActive } from "@/lib/settings";
import { runDailyDigest } from "@/lib/pipeline";
import { escapeHtml, sendTelegram, TelegramInlineButton } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const update = await req.json().catch(() => null);
    if (!update || !update.message) {
      return NextResponse.json({ ok: true });
    }

    const { message } = update;
    const chatId = message.chat?.id;
    const text = (message.text || "").trim();

    if (!chatId || !text) {
      return NextResponse.json({ ok: true });
    }

    const authorizedChatId = String(process.env.TELEGRAM_CHAT_ID);
    if (String(chatId) !== authorizedChatId) {
      await sendTelegram(
        "⚠️ <i>Akses dibatasi. Bot ini adalah saluran internal Meja Redaksi AdaFakta.</i>",
        undefined,
        chatId
      );
      return NextResponse.json({ ok: true });
    }

    const lower = text.toLowerCase();

    // 1. Perintah /start atau /help
    if (lower === "/start" || lower === "/help") {
      const helpMsg = [
        `🤖 <b>PUSAT KENDALI JURNALIS AI (ADAFAKTA)</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `Selamat datang di asisten intelijen redaksi Anda.`,
        ``,
        `📌 <b>Daftar Perintah Eksekutif:</b>`,
        `• <b>/liput</b> : Luncurkan penyisiran berita seketika`,
        `• <b>/status</b> : Cek saklar & metrik radar terkini`,
        `• <b>/pause</b> : Jeda jadwal liputan otomatis`,
        `• <b>/resume</b> : Aktifkan kembali liputan otomatis`,
        `• <b>/cari [topik]</b> : Cari berita intelijen di database`,
        `• <b>/brief</b> : Buat & kirimkan executive morning brief`,
        `• <b>/prune</b> : Bersihkan berita basi (> 7 hari)`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `<i>Ketik perintah langsung untuk mulai mengontrol bot.</i>`,
      ].join("\n");

      await sendTelegram(helpMsg, undefined, chatId);
      return NextResponse.json({ ok: true });
    }

    // 2. Perintah /status
    if (lower === "/status") {
      const active = await isBotActive();
      const countRows = await sql`SELECT count(*)::int as cnt FROM articles;`;
      const countSent = await sql`SELECT count(*)::int as cnt FROM articles WHERE sent_at IS NOT NULL;`;
      const sourcesCount = await sql`SELECT count(*)::int as cnt FROM rss_sources WHERE active = true;`;

      const statusMsg = [
        `📊 <b>STATUS OPERASIONAL BOT JURNALIS</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `• <b>Saklar Bot</b>     : ${active ? "🟢 AKTIF (Berjalan)" : "🔴 JEDA (Berhenti)"}`,
        `• <b>Total di Radar</b> : ${countRows[0]?.cnt || 0} isu`,
        `• <b>Disetor Redaksi</b>: ${countSent[0]?.cnt || 0} draf`,
        `• <b>Kanal RSS Aktif</b>: ${sourcesCount[0]?.cnt || 6} sumber`,
        `• <b>Model LLM</b>      : ${process.env.NINEROUTER_MODEL || "Claude Opus"}`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        active
          ? `💡 <i>Ketik /pause jika ingin mengistirahatkan bot.</i>`
          : `💡 <i>Ketik /resume untuk melanjutkan liputan.</i>`,
      ].join("\n");

      await sendTelegram(statusMsg, undefined, chatId);
      return NextResponse.json({ ok: true });
    }

    // 3. Perintah /pause
    if (lower === "/pause") {
      await setBotActive(false);
      await sendTelegram(
        "🔴 <b>BOT JURNALIS DIJEDA (OFF)</b>\nSeluruh jadwal liputan otomatis dilewati sampai Anda mengaktifkannya kembali dengan /resume.",
        undefined,
        chatId
      );
      return NextResponse.json({ ok: true });
    }

    // 4. Perintah /resume
    if (lower === "/resume") {
      await setBotActive(true);
      await sendTelegram(
        "🟢 <b>BOT JURNALIS AKTIF (ON)</b>\nRadar intelijen kembali menyisir arus berita secara otomatis sesuai jadwal.",
        undefined,
        chatId
      );
      return NextResponse.json({ ok: true });
    }

    // 5. Perintah /liput atau /scout
    if (lower === "/liput" || lower === "/scout") {
      await sendTelegram("⏳ <i>Menyisir seluruh kanal berita dan menganalisis fakta... Mohon tunggu sebentar.</i>", undefined, chatId);
      try {
        const result = await runDailyDigest();
        const doneMsg = [
          `✅ <b>LIPUTAN SELESAI DIEKSEKUSI</b>`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `• Berita Disisir : <b>${result.fetched}</b>`,
          `• Draf Baru Masuk: <b>${result.inserted}</b>`,
          `• Disetor Redaksi: <b>${result.sent}</b>`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          result.sent > 0
            ? `<i>Laporan investigasi berita di atas sudah dikirimkan ke chat ini dan tersimpan di AdaFakta.</i>`
            : `<i>Belum ada berita baru yang mendesak di kanal radar saat ini.</i>`,
        ].join("\n");
        await sendTelegram(doneMsg, undefined, chatId);
      } catch (err) {
        await sendTelegram(`⚠️ Gagal menjalankan liputan: ${String(err)}`, undefined, chatId);
      }
      return NextResponse.json({ ok: true });
    }

    // 6. Perintah /cari <kata kunci>
    if (lower.startsWith("/cari")) {
      const keyword = text.replace(/^\/cari/i, "").trim();
      if (!keyword) {
        await sendTelegram("⚠️ Masukkan topik yang ingin dicari. Contoh: <code>/cari korupsi</code> atau <code>/cari jokowi</code>", undefined, chatId);
        return NextResponse.json({ ok: true });
      }

      const pattern = `%${keyword}%`;
      const matches = await sql`
        SELECT title, source, summary, url, category, published_at
        FROM articles
        WHERE title ILIKE ${pattern} OR summary ILIKE ${pattern}
        ORDER BY created_at DESC
        LIMIT 3;
      `;

      if (!matches || matches.length === 0) {
        await sendTelegram(`🔍 Tidak ditemukan berita di radar dengan kata kunci: <b>${escapeHtml(keyword)}</b>`, undefined, chatId);
        return NextResponse.json({ ok: true });
      }

      const replyLines = [
        `🔍 <b>HASIL PENCARIAN INTELIJEN: "${escapeHtml(keyword)}"</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ];

      matches.forEach((m, idx) => {
        replyLines.push(
          `<b>${idx + 1}. [${escapeHtml(m.source)}] ${escapeHtml(m.title)}</b>`,
          `🏷️ <i>#${escapeHtml(m.category || "UMUM")}</i>`,
          `${escapeHtml(m.summary || "")}`,
          `🔗 <a href="${m.url}">Buka Sumber Berita</a>`,
          ``
        );
      });

      await sendTelegram(replyLines.join("\n"), undefined, chatId);
      return NextResponse.json({ ok: true });
    }

    // 7. Perintah /brief
    if (lower === "/brief") {
      await sendTelegram("⏳ <i>Menyusun Executive Morning Brief...</i>", undefined, chatId);
      const { generateMorningBriefing } = await import("@/lib/briefing");
      await generateMorningBriefing();
      return NextResponse.json({ ok: true });
    }

    // 8. Perintah /prune (Pembersihan Data Basi)
    if (lower === "/prune") {
      await sendTelegram("⏳ <i>Menjalankan pembersihan data basi di database...</i>", undefined, chatId);
      try {
        const { pruneOldArticles } = await import("@/lib/retention");
        const res = await pruneOldArticles();
        if (res.retentionDays === null) {
          await sendTelegram("ℹ️ <i>Pembersihan dilewati karena durasi retensi saat ini sedang dimatikan.</i>", undefined, chatId);
        } else {
          await sendTelegram(
            `🧹 <b>PEMBERSIHAN DATA BASI SELESAI</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Berita basi dibersihkan: <b>${res.deletedCount}</b>\n• Batas usia retensi    : <b>${res.retentionDays} hari</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n<i>Catatan: Berita bertanda prioritas tetap tersimpan aman di database.</i>`,
            undefined,
            chatId
          );
        }
      } catch (err) {
        await sendTelegram(`⚠️ Gagal membersihkan data: ${String(err)}`, undefined, chatId);
      }
      return NextResponse.json({ ok: true });
    }

    // Perintah default tidak dikenal
    await sendTelegram(
      `❓ Perintah tidak dikenali. Ketik <b>/help</b> untuk melihat daftar perintah yang tersedia.`,
      undefined,
      chatId
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
