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
        content:
          "Kamu meringkas berita. Tulis ringkasan 3 sampai 4 kalimat dalam bahasa Indonesia, walaupun sumbernya berbahasa lain. Sebutkan poin utama dan dampaknya. Jangan menambahkan fakta di luar teks. Jangan menyalin kalimat asli secara panjang.",
      },
      {
        role: "user",
        content: `Judul: ${title}\nURL: ${url}\nKonten: ${snippet}`,
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}
