import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isBotActive, setBotActive } from "@/lib/settings";
import { runDailyDigest } from "@/lib/pipeline";
import {
  escapeHtml,
  sendTelegram,
  answerCallbackQuery,
  editTelegramMessage,
  DEFAULT_PERSISTENT_KEYBOARD,
  TelegramInlineButton,
} from "@/lib/telegram";
import { searchLiveNews } from "@/lib/liveSearch";
import { extractTrendingTopics, calculateCategoryStats } from "@/lib/analytics";
import { sendToAdafakta } from "@/lib/adafakta";
import { pruneOldArticles, getRetentionDays } from "@/lib/retention";

export const dynamic = "force-dynamic";

/**
 * Helper: Validasi ID Pengirim Telegram
 */
function isAuthorizedChat(chatId: string | number): boolean {
  const authorizedChatId = String(process.env.TELEGRAM_CHAT_ID || "").trim();
  if (!authorizedChatId) return true; // Jika tidak diatur, izinkan sementara
  return String(chatId).trim() === authorizedChatId;
}

/**
 * 1. Tampilkan Menu Sambutan Utama (/start atau /help)
 */
async function sendWelcomeMenu(chatId: string | number) {
  const welcomeMsg = [
    `🤖 <b>PUSAT KENDALI JURNALIS AI • ADAFAKTA</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Selamat datang di <b>Autonomous Newsroom Radar</b>.`,
    `Asisten intelijen yang memantau arus informasi, memverifikasi fakta, dan menyusun draf berita secara real-time.`,
    ``,
    `📌 <b>NAVIGASI CEPAT (PILIH TOMBOL DI BAWAH):</b>`,
    `• <b>⚡ Live Scout Media</b> : Sisir berita internet detik ini`,
    `• <b>📰 Radar Berita</b> : Pantau draf investigasi lokal`,
    `• <b>🏷️ Filter Kategori</b> : Filter per rubrik berita`,
    `• <b>📈 Topik Hangat</b> : Analisis klaster isu trending`,
    `• <b>☀️ Morning Brief</b> : Rangkuman eksekutif pagi`,
    `• <b>⚙️ Pusat Kendali</b> : Pengaturan bot & metrik radar`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💡 <i>Ketik langsung kata kunci apa saja (contoh: <code>Greenpeace</code> atau <code>Putusan MK</code>) untuk menyisir berita seketika.</i>`,
  ].join("\n");

  await sendTelegram(welcomeMsg, undefined, chatId, DEFAULT_PERSISTENT_KEYBOARD);
}

/**
 * 2. Tampilkan Menu Live Scout
 */
async function sendLiveScoutMenu(chatId: string | number) {
  const msg = [
    `⚡ <b>LIVE SCOUT RADAR MEDIA INTERNET</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Menyisir berita secara langsung dari portal berita terkemuka (Kompas, Detik, CNN, Tempo, Reuters, dll).`,
    ``,
    `Silakan pilih <b>wilayah pantauan</b> di bawah, atau langsung <b>ketik topik</b> yang ingin dicari (contoh: <code>Greenpeace</code> atau <code>IKN</code>):`,
  ].join("\n");

  const inlineButtons: TelegramInlineButton[][] = [
    [
      { text: "🇮🇩 Top Nasional (ID)", callback_data: "cb:scout:region:ID" },
      { text: "🌐 Global Dunia", callback_data: "cb:scout:region:GLOBAL" },
    ],
    [
      { text: "🇺🇸 Amerika Serikat", callback_data: "cb:scout:region:US" },
      { text: "🇪🇺 Eropa", callback_data: "cb:scout:region:EU" },
      { text: "🌏 Asia-Pasifik", callback_data: "cb:scout:region:ASIA" },
    ],
  ];

  await sendTelegram(msg, inlineButtons, chatId, DEFAULT_PERSISTENT_KEYBOARD);
}

/**
 * 3. Tampilkan Menu Filter Kategori
 */
async function sendCategoryMenu(chatId: string | number) {
  const msg = [
    `🏷️ <b>PILIH KATEGORI RUBRIK BERITA</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Pilih rubrik untuk memfilter laporan intelijen yang sedang aktif di radar:`,
  ].join("\n");

  const inlineButtons: TelegramInlineButton[][] = [
    [
      { text: "🌱 LINGKUNGAN", callback_data: "cb:cat:LINGKUNGAN" },
      { text: "🏛️ POLITIK", callback_data: "cb:cat:POLITIK" },
    ],
    [
      { text: "⚖️ HUKUM", callback_data: "cb:cat:HUKUM" },
      { text: "💼 BISNIS", callback_data: "cb:cat:BISNIS" },
    ],
    [
      { text: "🚀 TEKNO", callback_data: "cb:cat:TEKNO" },
      { text: "🌐 INTERNASIONAL", callback_data: "cb:cat:INTERNASIONAL" },
    ],
    [
      { text: "🇮🇩 NASIONAL", callback_data: "cb:cat:NASIONAL" },
      { text: "📋 SEMUA BERITA", callback_data: "cb:cat:ALL" },
    ],
  ];

  await sendTelegram(msg, inlineButtons, chatId, DEFAULT_PERSISTENT_KEYBOARD);
}

/**
 * 4. Tampilkan Topik Hangat & Analisis Klaster
 */
async function sendTrendingTopics(chatId: string | number) {
  const rawArticles = await sql`
    SELECT title, category FROM articles
    ORDER BY created_at DESC
    LIMIT 50;
  `;

  const articles = (rawArticles || []).map((r) => ({
    title: String(r.title || ""),
    category: String(r.category || "UMUM"),
  }));

  const trends = extractTrendingTopics(articles, 5);
  const catStats = calculateCategoryStats(articles);

  const lines = [
    `📈 <b>RADAR TOPIK & ISU TERHANGAT (MEDIA CLUSTER)</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Berikut adalah isu dan kata kunci yang paling mendominasi pemberitaan 24-48 jam terakhir:`,
    ``,
  ];

  if (!trends || trends.length === 0) {
    lines.push(`<i>Belum ada cukup data artikel untuk menghitung tren saat ini.</i>`);
  } else {
    trends.forEach((t, i) => {
      const badge = i === 0 ? "🔥" : i === 1 ? "⚡" : "📌";
      lines.push(`${badge} <b>${i + 1}. ${escapeHtml(t.topic)}</b> (Disebut di <b>${t.count}</b> berita)`);
    });
  }

  if (catStats && catStats.length > 0) {
    lines.push(``, `📊 <b>Distribusi Rubrik Terbanyak:</b>`);
    catStats.slice(0, 4).forEach((c) => {
      lines.push(`• <b>#${escapeHtml(c.category)}</b>: ${c.count} berita (${c.percentage}%)`);
    });
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`💡 <i>Klik tombol di bawah untuk langsung menyisir berita terhangat isu tersebut:</i>`);

  const inlineButtons: TelegramInlineButton[][] = [];
  if (trends && trends.length > 0) {
    const row: TelegramInlineButton[] = [];
    for (let i = 0; i < Math.min(2, trends.length); i++) {
      row.push({
        text: `🔍 Sisir "${trends[i].topic}"`,
        callback_data: `cb:livesearch:${trends[i].topic.slice(0, 30)}`,
      });
    }
    inlineButtons.push(row);
  }

  await sendTelegram(lines.join("\n"), inlineButtons, chatId, DEFAULT_PERSISTENT_KEYBOARD);
}

/**
 * 5. Tampilkan Pusat Kendali & Metrik Radar
 */
async function sendSettingsControlPanel(chatId: string | number) {
  const active = await isBotActive();
  const countRows = await sql`SELECT count(*)::int as cnt FROM articles;`;
  const countSent = await sql`SELECT count(*)::int as cnt FROM articles WHERE sent_at IS NOT NULL;`;
  const countSynced = await sql`SELECT count(*)::int as cnt FROM articles WHERE is_synced_adafakta = true;`;
  const sourcesCount = await sql`SELECT count(*)::int as cnt FROM rss_sources WHERE active = true;`;
  const retentionDays = await getRetentionDays();

  const statusMsg = [
    `⚙️ <b>PUSAT KENDALI OPERASIONAL BOT</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `• <b>Status Bot</b>        : ${active ? "🟢 AKTIF (Liputan Berjalan)" : "🔴 JEDA (Berhenti)"}`,
    `• <b>Total di Radar</b>    : ${countRows[0]?.cnt || 0} artikel`,
    `• <b>Disetor Redaksi</b>   : ${countSent[0]?.cnt || 0} draf`,
    `• <b>Tersinkron AdaFakta</b>: ${countSynced[0]?.cnt || 0} artikel`,
    `• <b>Retensi Berita</b>    : ${retentionDays ? `${retentionDays} Hari` : "Dimatikan"}`,
    `• <b>Kanal RSS Aktif</b>   : ${sourcesCount[0]?.cnt || 0} sumber`,
    `• <b>Model LLM</b>         : ${process.env.NINEROUTER_MODEL || "Claude Opus / Gemini"}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Pilih tindakan cepat di bawah:`,
  ].join("\n");

  const inlineButtons: TelegramInlineButton[][] = [
    [
      active
        ? { text: "🔴 Jeda Bot (Pause)", callback_data: "cb:ctrl:pause" }
        : { text: "🟢 Aktifkan Bot (Resume)", callback_data: "cb:ctrl:resume" },
      { text: "🚀 Sisir Sekarang", callback_data: "cb:ctrl:run_digest" },
    ],
    [
      { text: "☀️ Morning Brief", callback_data: "cb:ctrl:brief" },
      { text: "🧹 Bersihkan Basi", callback_data: "cb:ctrl:prune" },
    ],
  ];

  await sendTelegram(statusMsg, inlineButtons, chatId, DEFAULT_PERSISTENT_KEYBOARD);
}

/**
 * 6. Tampilkan Daftar Artikel Lokal dengan Format Card
 */
async function sendArticlesList(chatId: string | number, articles: any[], headerTitle: string) {
  if (!articles || articles.length === 0) {
    await sendTelegram(
      `ℹ️ Tidak ada artikel yang ditemukan untuk: <b>${escapeHtml(headerTitle)}</b>`,
      undefined,
      chatId,
      DEFAULT_PERSISTENT_KEYBOARD
    );
    return;
  }

  await sendTelegram(
    `📋 <b>${escapeHtml(headerTitle)}</b> (${articles.length} Isu Terpilih)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    undefined,
    chatId,
    DEFAULT_PERSISTENT_KEYBOARD
  );

  for (const art of articles.slice(0, 3)) {
    const safeTitle = escapeHtml(art.title);
    const safeSource = escapeHtml(art.source || "Portal");
    const safeCategory = escapeHtml(art.category || "UMUM");
    const safeSummary = escapeHtml(art.summary || "Ringkasan draf intelijen redaksi.");
    const isSynced = art.is_synced_adafakta === true;

    const cardMsg = [
      `🚨 <b>[RADAR INTEL]</b> • <i>${safeSource}</i>`,
      `🏷️ <b>Rubrik</b>: #${safeCategory}`,
      `📌 <b>Isu</b>: <b>${safeTitle}</b>`,
      ``,
      `📝 <b>Bedah Fakta & Analisis:</b>`,
      `${safeSummary}`,
      ``,
      `📊 <b>Distribusi:</b> ${isSynced ? "✅ Tersimpan di AdaFakta" : "⚠️ Disimpan lokal di radar"}`,
    ].join("\n");

    const buttons: TelegramInlineButton[][] = [
      [
        { text: "🔗 Sumber Berita Asli", url: art.url },
        isSynced
          ? { text: "📝 Cek di AdaFakta", url: "https://www.adafakta.web.id/admin/jurnalis" }
          : { text: "📤 Setor ke AdaFakta", callback_data: `cb:adafakta:sync:${art.id}` },
      ],
    ];

    await sendTelegram(cardMsg, buttons, chatId, DEFAULT_PERSISTENT_KEYBOARD);
  }
}

/**
 * 7. Jalankan Pencarian Live Scout (Internet) & Tampilkan
 */
async function executeLiveScout(
  chatId: string | number,
  query: string,
  region: "ID" | "GLOBAL" | "US" | "EU" | "ASIA" = "ID"
) {
  await sendTelegram(
    `⏳ <i>Menyisir portal berita internet untuk: "<b>${escapeHtml(query)}</b>" (${region})... Mohon tunggu.</i>`,
    undefined,
    chatId,
    DEFAULT_PERSISTENT_KEYBOARD
  );

  try {
    const liveItems = await searchLiveNews({
      query,
      region,
      timeRange: "24h",
      mediaScope: region === "ID" ? "top_national" : "global_elite",
      limit: 3,
    });

    if (!liveItems || liveItems.length === 0) {
      await sendTelegram(
        `🔍 Tidak ditemukan berita terhangat di internet untuk kata kunci: <b>${escapeHtml(query)}</b> dalam 24 jam terakhir.`,
        undefined,
        chatId,
        DEFAULT_PERSISTENT_KEYBOARD
      );
      return;
    }

    const header = [
      `⚡ <b>HASIL LIVE SCOUT INTERNET: "${escapeHtml(query)}"</b>`,
      `🌍 <b>Wilayah:</b> ${region} | 🕒 <b>Rentang:</b> 24 Jam Terakhir`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ].join("\n");

    await sendTelegram(header, undefined, chatId, DEFAULT_PERSISTENT_KEYBOARD);

    for (const item of liveItems) {
      const cardMsg = [
        `📰 <b>[${escapeHtml(item.source)}] ${escapeHtml(item.title)}</b>`,
        `🏷️ <i>#${escapeHtml(item.category)} • ${item.timeAgo}</i>`,
        ``,
        `${escapeHtml(item.snippet)}`,
      ].join("\n");

      const buttons: TelegramInlineButton[][] = [
        [
          { text: "🔗 Buka Sumber Berita", url: item.url },
        ],
      ];

      await sendTelegram(cardMsg, buttons, chatId, DEFAULT_PERSISTENT_KEYBOARD);
    }
  } catch (error) {
    await sendTelegram(
      `⚠️ Gagal menyisir berita live: ${String(error)}`,
      undefined,
      chatId,
      DEFAULT_PERSISTENT_KEYBOARD
    );
  }
}

/**
 * Handler Callback Query (Klik Tombol Inline)
 */
async function handleCallbackQuery(cq: any) {
  const cqId = cq.id;
  const data = String(cq.data || "").trim();
  const message = cq.message;
  const chatId = message?.chat?.id;

  if (!chatId) {
    await answerCallbackQuery(cqId);
    return;
  }

  if (!isAuthorizedChat(chatId)) {
    await answerCallbackQuery(cqId, "Akses dibatasi.", true);
    return;
  }

  // 1. Filter Kategori: cb:cat:<KATEGORI>
  if (data.startsWith("cb:cat:")) {
    await answerCallbackQuery(cqId, "Memuat artikel rubrik...");
    const cat = data.replace("cb:cat:", "").trim().toUpperCase();

    const articles = cat === "ALL"
      ? await sql`
          SELECT id, title, source, summary, url, category, published_at, is_synced_adafakta
          FROM articles
          ORDER BY created_at DESC
          LIMIT 3;
        `
      : await sql`
          SELECT id, title, source, summary, url, category, published_at, is_synced_adafakta
          FROM articles
          WHERE UPPER(category) = ${cat}
          ORDER BY created_at DESC
          LIMIT 3;
        `;

    await sendArticlesList(chatId, articles, `Rubrik: #${cat}`);
    return;
  }

  // 2. Live Scout Wilayah: cb:scout:region:<REGION>
  if (data.startsWith("cb:scout:region:")) {
    const region = data.replace("cb:scout:region:", "").trim() as "ID" | "GLOBAL" | "US" | "EU" | "ASIA";
    await answerCallbackQuery(cqId, `Menyisir berita ${region}...`);
    const defaultQuery = region === "ID" ? "berita terkini" : "breaking news";
    await executeLiveScout(chatId, defaultQuery, region);
    return;
  }

  // 3. Setor ke Meja Redaksi AdaFakta: cb:adafakta:sync:<ARTICLE_ID>
  if (data.startsWith("cb:adafakta:sync:")) {
    const artId = parseInt(data.replace("cb:adafakta:sync:", ""), 10);
    if (isNaN(artId)) {
      await answerCallbackQuery(cqId, "ID artikel tidak valid.", true);
      return;
    }

    const rows = await sql`
      SELECT id, title, source, url, published_at, summary, category
      FROM articles
      WHERE id = ${artId}
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) {
      await answerCallbackQuery(cqId, "Artikel tidak ditemukan di radar.", true);
      return;
    }

    const art = rows[0];
    const success = await sendToAdafakta({
      title: art.title,
      source: art.source,
      url: art.url,
      published_at: art.published_at,
      summary: art.summary || "Draf liputan intelijen.",
      category: art.category || "UMUM",
    });

    if (success) {
      await sql`UPDATE articles SET is_synced_adafakta = true WHERE id = ${artId};`;
      await answerCallbackQuery(cqId, "✅ Berhasil disetor ke Meja Redaksi AdaFakta!", true);

      // Ubah tombol di pesan tersebut jika memungkinkan
      if (message?.message_id) {
        const updatedButtons: TelegramInlineButton[][] = [
          [
            { text: "🔗 Sumber Berita Asli", url: art.url },
            { text: "📝 Cek di AdaFakta", url: "https://www.adafakta.web.id/admin/jurnalis" },
          ],
        ];
        await editTelegramMessage(
          chatId,
          message.message_id,
          message.text + "\n\n✅ <i>Berhasil disetor ke AdaFakta oleh Redaktur.</i>",
          updatedButtons
        );
      }
    } else {
      await answerCallbackQuery(cqId, "⚠️ Gagal setor ke AdaFakta. Periksa API Key atau koneksi.", true);
    }
    return;
  }

  // 4. Kontrol: Pause / Resume Bot
  if (data === "cb:ctrl:pause") {
    await setBotActive(false);
    await answerCallbackQuery(cqId, "🔴 Bot dijeda.");
    await sendSettingsControlPanel(chatId);
    return;
  }

  if (data === "cb:ctrl:resume") {
    await setBotActive(true);
    await answerCallbackQuery(cqId, "🟢 Bot diaktifkan kembali.");
    await sendSettingsControlPanel(chatId);
    return;
  }

  // 5. Kontrol: Jalankan Liputan Sekarang
  if (data === "cb:ctrl:run_digest") {
    await answerCallbackQuery(cqId, "🚀 Meluncurkan penyisiran berita...");
    await sendTelegram("⏳ <i>Menyisir seluruh kanal berita dan menganalisis fakta... Mohon tunggu.</i>", undefined, chatId, DEFAULT_PERSISTENT_KEYBOARD);
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
      await sendTelegram(doneMsg, undefined, chatId, DEFAULT_PERSISTENT_KEYBOARD);
    } catch (err) {
      await sendTelegram(`⚠️ Gagal menjalankan liputan: ${String(err)}`, undefined, chatId, DEFAULT_PERSISTENT_KEYBOARD);
    }
    return;
  }

  // 6. Kontrol: Morning Brief
  if (data === "cb:ctrl:brief") {
    await answerCallbackQuery(cqId, "☀️ Menyusun Morning Brief...");
    await sendTelegram("⏳ <i>Menyusun Executive Morning Brief...</i>", undefined, chatId, DEFAULT_PERSISTENT_KEYBOARD);
    const { generateMorningBriefing } = await import("@/lib/briefing");
    await generateMorningBriefing();
    return;
  }

  // 7. Kontrol: Prune Berita Basi
  if (data === "cb:ctrl:prune") {
    await answerCallbackQuery(cqId, "🧹 Membersihkan data basi...");
    const res = await pruneOldArticles();
    if (res.retentionDays === null) {
      await sendTelegram("ℹ️ <i>Pembersihan dilewati karena retensi dimatikan.</i>", undefined, chatId, DEFAULT_PERSISTENT_KEYBOARD);
    } else {
      await sendTelegram(
        `🧹 <b>PEMBERSIHAN DATA BASI SELESAI</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Berita dibersihkan: <b>${res.deletedCount}</b>\n• Batas usia retensi : <b>${res.retentionDays} hari</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        undefined,
        chatId,
        DEFAULT_PERSISTENT_KEYBOARD
      );
    }
    return;
  }

  // 8. Live Search dari Topik Tren: cb:livesearch:<QUERY>
  if (data.startsWith("cb:livesearch:")) {
    const query = data.replace("cb:livesearch:", "").trim();
    await answerCallbackQuery(cqId, `Menyisir topik "${query}"...`);
    await executeLiveScout(chatId, query, "ID");
    return;
  }

  await answerCallbackQuery(cqId);
}

/**
 * Handler Pesan Teks (Perintah Keyboard & Command)
 */
async function handleTextMessage(message: any) {
  const chatId = message.chat?.id;
  const rawText = (message.text || "").trim();

  if (!chatId || !rawText) return;

  if (!isAuthorizedChat(chatId)) {
    await sendTelegram(
      "⚠️ <i>Akses dibatasi. Bot ini adalah saluran internal Meja Redaksi AdaFakta.</i>",
      undefined,
      chatId
    );
    return;
  }

  const lower = rawText.toLowerCase();

  // 1. Menu Utama / Start / Help
  if (lower === "/start" || lower === "/help" || lower === "menu" || lower === "bantuan") {
    await sendWelcomeMenu(chatId);
    return;
  }

  // 2. Live Scout Media
  if (lower === "⚡ live scout media" || lower === "/scout" || lower === "/livescout") {
    await sendLiveScoutMenu(chatId);
    return;
  }

  // 3. Radar Berita (Draf Terbaru di Database)
  if (lower === "📰 radar berita" || lower === "/radar" || lower === "/berita") {
    const articles = await sql`
      SELECT id, title, source, summary, url, category, published_at, is_synced_adafakta
      FROM articles
      ORDER BY created_at DESC
      LIMIT 3;
    `;
    await sendArticlesList(chatId, articles, "Radar Berita Terkini");
    return;
  }

  // 4. Filter Kategori
  if (lower === "🏷️ filter kategori" || lower === "/kategori" || lower === "/category") {
    await sendCategoryMenu(chatId);
    return;
  }

  // 5. Topik Hangat
  if (lower === "📈 topik hangat" || lower === "/trend" || lower === "/topik") {
    await sendTrendingTopics(chatId);
    return;
  }

  // 6. Executive Morning Brief
  if (lower === "☀️ morning brief" || lower === "/brief" || lower === "/briefing") {
    await sendTelegram("⏳ <i>Menyusun Executive Morning Brief dengan analisis redaksi mendalam...</i>", undefined, chatId, DEFAULT_PERSISTENT_KEYBOARD);
    const { generateMorningBriefing } = await import("@/lib/briefing");
    await generateMorningBriefing();
    return;
  }

  // 7. Pusat Kendali / Status / Settings
  if (lower === "⚙️ pusat kendali" || lower === "/settings" || lower === "/status") {
    await sendSettingsControlPanel(chatId);
    return;
  }

  // 8. Perintah Cepat Tambahan
  if (lower === "/liput") {
    await sendTelegram("⏳ <i>Menyisir seluruh kanal berita dan menganalisis fakta... Mohon tunggu.</i>", undefined, chatId, DEFAULT_PERSISTENT_KEYBOARD);
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
      await sendTelegram(doneMsg, undefined, chatId, DEFAULT_PERSISTENT_KEYBOARD);
    } catch (err) {
      await sendTelegram(`⚠️ Gagal menjalankan liputan: ${String(err)}`, undefined, chatId, DEFAULT_PERSISTENT_KEYBOARD);
    }
    return;
  }

  if (lower === "/pause") {
    await setBotActive(false);
    await sendTelegram("🔴 <b>BOT JURNALIS DIJEDA (OFF)</b>\nSeluruh jadwal liputan otomatis dilewati.", undefined, chatId, DEFAULT_PERSISTENT_KEYBOARD);
    return;
  }

  if (lower === "/resume") {
    await setBotActive(true);
    await sendTelegram("🟢 <b>BOT JURNALIS AKTIF (ON)</b>\nRadar intelijen kembali menyisir arus berita secara otomatis.", undefined, chatId, DEFAULT_PERSISTENT_KEYBOARD);
    return;
  }

  if (lower === "/prune") {
    const res = await pruneOldArticles();
    await sendTelegram(
      `🧹 <b>PEMBERSIHAN DATA BASI SELESAI</b>\n• Berita dibersihkan: <b>${res.deletedCount}</b>\n• Batas retensi: <b>${res.retentionDays || "-"} hari</b>`,
      undefined,
      chatId,
      DEFAULT_PERSISTENT_KEYBOARD
    );
    return;
  }

  // 9. Intelligent Search (Bisa diawali /cari atau teks langsung)
  let searchQuery = rawText;
  if (lower.startsWith("/cari") || lower.startsWith("/scout")) {
    searchQuery = rawText.replace(/^\/(cari|scout)/i, "").trim();
  }

  if (searchQuery.length >= 2) {
    // Cari di database lokal terlebih dahulu
    const pattern = `%${searchQuery}%`;
    const localMatches = await sql`
      SELECT id, title, source, summary, url, category, published_at, is_synced_adafakta
      FROM articles
      WHERE title ILIKE ${pattern} OR summary ILIKE ${pattern}
      ORDER BY created_at DESC
      LIMIT 2;
    `;

    if (localMatches && localMatches.length > 0) {
      await sendArticlesList(chatId, localMatches, `Ditemukan di Radar Lokal: "${searchQuery}"`);
    }

    // Selalu tawarkan atau jalankan Live Scout dari internet
    await executeLiveScout(chatId, searchQuery, "ID");
    return;
  }

  // Default fallback
  await sendWelcomeMenu(chatId);
}

/**
 * Main Webhook Entrypoint (POST)
 */
export async function POST(req: Request) {
  try {
    const update = await req.json().catch(() => null);
    if (!update) {
      return NextResponse.json({ ok: true });
    }

    // Tangani Callback Query (Tombol Inline diklik)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return NextResponse.json({ ok: true });
    }

    // Tangani Pesan Teks (Keyboard atau Perintah Chat)
    if (update.message) {
      await handleTextMessage(update.message);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
