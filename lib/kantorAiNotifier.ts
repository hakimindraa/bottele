/**
 * lib/kantorAiNotifier.ts
 * Notifier webhook asinkron ke Kantor AI 3D Virtual Newsroom (adafakta 3D dashboard)
 * Menjamin zero-blocking dan zero-crash dengan timeout ketat 1.5 detik.
 */

export interface KantorAiPayload {
  action: "bottele_rss_scraped" | "bottele_dispatch_telegram" | "bottele_synced_adafakta";
  title: string;
  source?: string;
  category?: string;
}

export async function notifyKantorAI(payload: KantorAiPayload): Promise<void> {
  try {
    const rawEndpoint = process.env.KANTORAI_URL || "https://aikantoradafakta.vercel.app";
    const endpoint = rawEndpoint.replace(/\/+$/, ""); // Hapus trailing slash jika ada
    const secret =
      process.env.KANTORAI_WEBHOOK_SECRET ||
      "jsfhohoijmOIOIIUOJlknf894560257yrhuehflh884750wuehflhfehUYUYUHIhr4764357847eieohdlskfreoyt8373940";

    // Timeout ketat 1.5 detik non-blocking
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    fetch(`${endpoint}/api/incoming-news`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-token": secret,
      },
      body: JSON.stringify({
        ...payload,
        source: payload.source || "Radar Bot Jurnalis Telegram",
        category: payload.category || "Teknologi",
      }),
      signal: controller.signal,
    })
      .catch(() => {
        // Diamkan kegagalan jaringan agar Bot Tele tetap 100% berjalan normal
      })
      .finally(() => clearTimeout(timeout));
  } catch {
    // Zero-crash guarantee
  }
}

