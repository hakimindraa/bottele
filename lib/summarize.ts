import OpenAI from "openai";
import { getAiModel } from "@/lib/settings";
import { detectNewsCategory } from "@/lib/liveSearch";

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
  const activeModel = await getAiModel();
  const priorityInstruction = isPriority
    ? "PERINGATAN: Berita ini bertopik prioritas redaksi (HIGH ATTENTION). Tekankan implikasi kritis, potensi skandal, atau dampak struktural terbesar secara mendesak."
    : "";

  try {
    const openai = new OpenAI({
      baseURL: process.env.NINEROUTER_BASE_URL || "http://node7.botkeep.cloud:40022/v1",
      apiKey: process.env.NINEROUTER_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: activeModel,
      messages: [
        {
          role: "system",
          content: `Kamu adalah jurnalis investigasi senior yang kritis, tegas, berani membongkar fakta, dan bernada lugas serta mendesak (hard-hitting investigative journalist).
Tugasmu adalah menganalisis dan membedah berita secara tajam dalam bahasa Indonesia, serta mengelompokkan ke kategori liputan yang tepat.
${priorityInstruction}

Pedoman penulisan:
1. Tulis ringkasan 3 sampai 4 kalimat padat yang langsung menukik ke inti persoalan, siapa yang bertanggung jawab/terdampak, kontradiksi atau anomali yang terjadi, dan urgensi dampaknya bagi publik atau sektor terkait.
2. Klasifikasikan berita ke salah satu kategori eksklusif: "LINGKUNGAN", "POLITIK", "HUKUM", "BISNIS", "TEKNO", "INTERNASIONAL", atau "NASIONAL". Jika isu menyangkut lingkungan hidup, krisis iklim, Greenpeace, deforestasi, polusi, tambang & AMDAL, atau transisi energi, prioritaskan kategori "LINGKUNGAN".
3. DILARANG membuat fakta fiktif di luar teks sumber. Jangan menyalin kalimat panjang; rumuskan ulang dengan ketajaman analisis investigatif berbobot.
4. Output WAJIB dalam format JSON valid persis seperti ini:
{
  "summary": "Isi analisis investigatif 3-4 kalimat...",
  "category": "LINGKUNGAN"
}`,
        },
        {
          role: "user",
          content: `Judul: ${title}\nURL: ${url}\nKonten/Fakta Sumber:\n${snippet}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";

    // Parse respons JSON dari LLM
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.summary && parsed.summary.trim()) {
        return {
          summary: String(parsed.summary).trim(),
          category: String(parsed.category || detectNewsCategory(`${title} ${snippet}`)).toUpperCase(),
        };
      }
    }

    if (raw && raw.length > 20) {
      return {
        summary: raw,
        category: detectNewsCategory(`${title} ${snippet}`),
      };
    }
  } catch (aiError) {
    // JARING PENGAMAN (OPSI B): Tangani kegagalan AI secara elegan agar pipeline bot tidak macet
    console.warn(`[AI Summarize Fallback] Model ${activeModel} gagal/offline (${aiError instanceof Error ? aiError.message : String(aiError)}). Menggunakan fallback draf cerdas.`);
  }

  // Fallback cerdas: Deteksi kategori via kata kunci & susun ringkasan dari snippet asli
  const fallbackCat = detectNewsCategory(`${title} ${snippet}`);
  const cleanSnippet = snippet
    ? snippet.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : "";

  const emergencySummary = cleanSnippet.length > 30
    ? `${cleanSnippet} (Laporan liputan intelijen dipantau via radar redaksi).`
    : `Laporan terkini mengenai ${title}. Informasi lengkap terlampir pada tautan sumber berita asli.`;

  return {
    summary: emergencySummary,
    category: fallbackCat,
  };
}
