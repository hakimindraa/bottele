import { NextResponse } from "next/server";
import { escapeHtml, sendTelegram, DEFAULT_PERSISTENT_KEYBOARD } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      url,
      source = "Portal Berita",
      summary,
      snippet,
      category = "UMUM",
      publishedAt,
    } = body;

    if (!title || !url) {
      return NextResponse.json(
        { success: false, error: "Title dan URL wajib disertakan" },
        { status: 400 }
      );
    }

    const categoryEmoji: Record<string, string> = {
      LINGKUNGAN: "🌱",
      POLITIK: "🏛️",
      HUKUM: "⚖️",
      BISNIS: "💼",
      TEKNO: "🚀",
      INTERNASIONAL: "🌐",
      NASIONAL: "🇮🇩",
      UMUM: "📰",
    };

    const emoji = categoryEmoji[category.toUpperCase()] || "📰";
    const contentText = summary?.trim() || snippet?.trim() || "Liputan kilat redaksi AI.";

    const message = [
      `⚡ <b>[RADAR LIVE INTEL]</b> • <i>${escapeHtml(source)}</i>`,
      `${emoji} <b>Kategori:</b> #${escapeHtml(category.toUpperCase())}`,
      "",
      `📰 <b><a href="${escapeHtml(url)}">${escapeHtml(title)}</a></b>`,
      "",
      `💡 <b>Analisis Cepat Redaksi:</b>`,
      `${escapeHtml(contentText)}`,
      "",
      `🕒 <i>Dipantau: ${new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</i>`,
    ].join("\n");

    const inlineButtons = [
      [
        {
          text: "Buka Berita Asli ↗️",
          url,
        },
      ],
    ];

    await sendTelegram(message, inlineButtons, undefined, DEFAULT_PERSISTENT_KEYBOARD);

    return NextResponse.json({
      success: true,
      message: "Berita intelijen berhasil disiarkan ke Telegram!",
    });
  } catch (error) {
    console.error("Gagal menyiarkan live intel ke Telegram:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menyiarkan ke Telegram",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
