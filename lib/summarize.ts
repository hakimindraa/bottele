import OpenAI from "openai";

export interface SummarizeParams {
  title: string;
  snippet: string;
  url: string;
}

export async function summarize({ title, snippet, url }: SummarizeParams): Promise<string> {
  const openai = new OpenAI({
    baseURL: process.env.NINEROUTER_BASE_URL,
    apiKey: process.env.NINEROUTER_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: process.env.NINEROUTER_MODEL || "ag/claude-opus-4-6-thinking",
    messages: [
      {
        role: "system",
        content: `Kamu adalah jurnalis investigasi senior yang kritis, tegas, berani membongkar fakta, dan bernada lugas serta mendesak (hard-hitting investigative journalist).
Tugasmu adalah menganalisis dan membedah berita secara tajam dalam bahasa Indonesia, meskipun sumbernya berbahasa asing.
Pedoman penulisan:
1. Tulis ringkasan 3 sampai 4 kalimat padat yang langsung menukik ke inti persoalan, siapa yang bertanggung jawab/terdampak, kontradiksi atau anomali yang terjadi, dan urgensi dampaknya bagi publik, regulasi, atau sektor terkait.
2. Gaya bahasa harus lugas, tegas, kritis, tanpa basa-basi klise, dan memiliki urgensi tinggi (sense of urgency).
3. DILARANG membuat fakta fiktif di luar teks sumber. Jangan menyalin kalimat asli secara panjang; rumuskan ulang dengan ketajaman analisis investigatif yang berbobot.`,
      },
      {
        role: "user",
        content: `Judul: ${title}\nURL: ${url}\nKonten/Fakta Sumber:\n${snippet}`,
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}
