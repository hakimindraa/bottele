import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN belum diset" }, { status: 500 });
  }

  // Gunakan domain produksi Vercel yang valid HTTPS untuk Webhook Telegram
  const webhookUrl = "https://bottelejurnalis.vercel.app/api/telegram/webhook";

  const results: Record<string, any> = {};

  try {
    // 1. Daftarkan Webhook Telegram
    const webhookRes = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    );
    results.webhook = await webhookRes.json();

    // 2. Daftarkan Menu Perintah Cepat (setMyCommands) agar muncul di samping kolom chat
    const commandsPayload = {
      commands: [
        { command: "start", description: "🤖 Buka menu utama & keyboard navigasi" },
        { command: "scout", description: "⚡ Live Scout media internet real-time" },
        { command: "radar", description: "📰 Pantau draf intelijen berita lokal" },
        { command: "kategori", description: "🏷️ Filter berita per rubrik redaksi" },
        { command: "trend", description: "📈 Analisis topik & isu terhangat" },
        { command: "brief", description: "☀️ Dapatkan executive morning brief" },
        { command: "settings", description: "⚙️ Pusat kendali operasional & metrik" },
        { command: "liput", description: "🚀 Luncurkan penyisiran berita seketika" },
        { command: "help", description: "📖 Panduan lengkap bot jurnalis AI" },
      ],
    };

    const cmdRes = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(commandsPayload),
    });
    results.commands = await cmdRes.json();

    // 3. Pastikan Tombol Menu Telegram diaktifkan (setChatMenuButton)
    const menuBtnPayload = {
      menu_button: {
        type: "commands",
      },
    };
    const menuRes = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menuBtnPayload),
    });
    results.menuButton = await menuRes.json();

    return NextResponse.json({
      success: true,
      webhookUrl,
      results,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error), results }, { status: 500 });
  }
}
