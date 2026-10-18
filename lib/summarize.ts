import OpenAI from "openai";

export interface SummarizeParams {
  title: string;
  snippet: string;
  url: string;
  isPriority?: boolean;
}

export interface SummarizeResult {
  summary: string;
  category: string;
}

export async function summarize({
  title,
  snippet,
  url,
  isPriority = false,
}: SummarizeParams): Promise<SummarizeResult> {
  const openai = new OpenAI({
    baseURL: process.env.NINEROUTER_BASE_URL,
    apiKey: process.env.NINEROUTER_API_KEY,
  });

  const priorityInstruction = isPriority
    ? "PERINGATAN: Berita ini bertopik prioritas redaksi (HIGH ATTENTION). Tekankan implikasi kritis, potensi skandal, atau dampak struktural terbesar secara mendesak."
    : "";

  const response = await openai.chat.completions.create({
    model: process.env.NINEROUTER_MODEL || "ag/claude-opus-4-6-thinking",
    messages: [
      {
        role: "system",
        content: `Kamu adalah jurnalis investigasi senior yang kritis, tegas, berani membongkar fakta, dan bernada lugas serta mendesak (hard-hitting investigative journalist).
Tugasmu adalah menganalisis dan membedah berita secara tajam dalam bahasa Indonesia, serta mengelompokkan ke kategori liputan yang tepat.
${priorityInstruction}

Pedoman penulisan:
1. Tulis ringkasan 3 sampai 4 kalimat padat yang langsung menukik ke inti persoalan, siapa yang bertanggung jawab/terdampak, kontradiksi atau anomali yang terjadi, dan urgensi dampaknya bagi publik atau sektor terkait.
2. Klasifikasikan berita ke salah satu kategori eksklusif: "POLITIK", "HUKUM", "BISNIS", "TEKNO", "INTERNASIONAL", atau "NASIONAL".
3. DILARANG membuat fakta fiktif di luar teks sumber. Jangan menyalin kalimat panjang; rumuskan ulang dengan ketajaman analisis investigatif berbobot.
4. Output WAJIB dalam format JSON valid persis seperti ini:
{
  "summary": "Isi analisis investigatif 3-4 kalimat...",
  "category": "POLITIK"
}`,
      },
      {
        role: "user",
        content: `Judul: ${title}\nURL: ${url}\nKonten/Fakta Sumber:\n${snippet}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? "";

  try {
    // Cari blok JSON jika ada backticks
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.summary) {
        return {
          summary: String(parsed.summary).trim(),
          category: String(parsed.category || "UMUM").toUpperCase(),
        };
      }
    }
  } catch {
    // Abaikan error parsing dan fallback
  }

  return {
    summary: raw || "Analisis fakta belum tersedia.",
    category: "UMUM",
  };
}
