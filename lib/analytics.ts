export interface CategoryStat {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TrendingTopic {
  topic: string;
  count: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  POLITIK: "#dc2626", // Crimson Red
  BISNIS: "#d97706",  // Amber
  TEKNO: "#2563eb",   // Royal Blue
  HUKUM: "#7e22ce",   // Purple
  INTERNASIONAL: "#0284c7", // Sky Blue
  NASIONAL: "#16a34a", // Forest Green
  UMUM: "#64748b",     // Slate
};

const STOP_WORDS = new Set([
  // Kata sambung & preposisi Indonesia
  "dan", "di", "ke", "dari", "yang", "ini", "itu", "untuk", "pada", "adalah",
  "dengan", "ada", "bisa", "akan", "telah", "oleh", "saat", "juga", "atau",
  "karena", "lebih", "sudah", "dalam", "bagi", "tidak", "jadi", "hari", "tahun",
  "baru", "bila", "hanya", "para", "atas", "tak", "saja", "secara", "sebut",
  "kata", "sebutkan", "antara", "terhadap", "tentang", "hingga", "setelah",
  "sebelum", "dapat", "tersebut", "masih", "belum", "serta", "terus", "kembali",
  // English common words
  "the", "and", "in", "of", "to", "for", "with", "on", "at", "from", "by", "about",
  "as", "into", "like", "through", "after", "over", "between", "out", "against",
  "during", "without", "before", "under", "around", "among", "is", "are", "was",
  "were", "be", "been", "being", "have", "has", "had", "will", "would", "shall",
  "should", "can", "could", "may", "might", "must", "a", "an", "this", "that",
]);

export function calculateCategoryStats(articles: { category?: string }[]): CategoryStat[] {
  if (!articles || articles.length === 0) return [];

  const counts: Record<string, number> = {};
  let total = 0;

  for (const art of articles) {
    const cat = (art.category || "UMUM").toUpperCase().trim();
    counts[cat] = (counts[cat] || 0) + 1;
    total++;
  }

  const result: CategoryStat[] = Object.entries(counts).map(([cat, count]) => ({
    category: cat,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    color: CATEGORY_COLORS[cat] || CATEGORY_COLORS.UMUM,
  }));

  // Urutkan dari persentase terbesar
  result.sort((a, b) => b.count - a.count);

  return result;
}

export function extractTrendingTopics(
  articles: { title: string }[],
  limit = 5
): TrendingTopic[] {
  if (!articles || articles.length === 0) return [];

  const wordCounts: Record<string, number> = {};

  for (const art of articles) {
    if (!art.title) continue;

    // Bersihkan karakter non-alfanumerik
    const cleanTitle = art.title.replace(/[^\w\s-]/g, " ");
    const words = cleanTitle.split(/\s+/);

    const seenInTitle = new Set<string>();

    for (const rawWord of words) {
      const clean = rawWord.trim();
      const lower = clean.toLowerCase();

      // Abaikan kata pendek, angka murni, atau stop words
      if (
        clean.length < 4 ||
        /^\d+$/.test(clean) ||
        STOP_WORDS.has(lower)
      ) {
        continue;
      }

      // Format kata (pertahankan huruf kapital awal jika entitas/nama)
      const formatted = clean.length > 4 && clean === clean.toUpperCase()
        ? clean
        : clean.charAt(0).toUpperCase() + clean.slice(1);

      // Hitung maksimal 1x per judul berita agar tidak bias
      if (!seenInTitle.has(lower)) {
        seenInTitle.add(lower);
        wordCounts[formatted] = (wordCounts[formatted] || 0) + 1;
      }
    }
  }

  const sorted: TrendingTopic[] = Object.entries(wordCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return sorted;
}
