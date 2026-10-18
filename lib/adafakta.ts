export interface AdafaktaPayload {
  title: string;
  source: string;
  url: string;
  published_at?: string | Date | null;
  summary: string;
}

export async function sendToAdafakta(payload: AdafaktaPayload): Promise<boolean> {
  const apiUrl = process.env.ADAFAKTA_API_URL;
  const apiKey = process.env.ADAFAKTA_API_KEY;

  // Jika URL atau API Key belum diatur, lewati dengan aman
  if (!apiUrl || !apiKey) {
    return false;
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        title: payload.title,
        source: payload.source,
        url: payload.url,
        published_at: payload.published_at,
        summary: payload.summary,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Gagal mengirim ke adafakta.web.id (${res.status}):`, errText);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Koneksi ke adafakta.web.id gagal:", error);
    return false;
  }
}
