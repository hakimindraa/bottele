"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/Icons";
import { CategoryStat, TrendingTopic } from "@/lib/analytics";
import { LiveSearchItem } from "@/lib/liveSearch";

export interface ArticleItem {
  id: number;
  source: string;
  title: string;
  url: string;
  published_at: string | Date | null;
  summary: string;
  sent_at: string | Date | null;
  created_at: string | Date;
  category?: string;
  is_priority?: boolean;
  is_synced_adafakta?: boolean;
}

export interface MetricStats {
  totalMonitored: number;
  totalTransferred: number;
  totalSentTelegram: number;
  activeFeedsCount: number;
}

export interface CategoryBreakdownItem {
  monitored: number;
  sent: number;
  synced: number;
}

export type CategoryBreakdownMap = Record<string, CategoryBreakdownItem>;

export interface RssSourceItem {
  id: number;
  name: string;
  url: string;
  category?: string;
  active: boolean;
}

export interface KeywordItem {
  id: number;
  keyword: string;
}

export default function CommandCenterView({
  initialArticles,
  metrics,
  initialBotActive,
  initialSources,
  initialKeywords,
  initialRetentionDays = 7,
  initialCategoryStats = [],
  initialTrendingTopics = [],
  initialCategoryBreakdown = {},
}: {
  initialArticles: ArticleItem[];
  metrics: MetricStats;
  initialBotActive: boolean;
  initialSources: RssSourceItem[];
  initialKeywords: KeywordItem[];
  initialRetentionDays?: number | null;
  initialCategoryStats?: CategoryStat[];
  initialTrendingTopics?: TrendingTopic[];
  initialCategoryBreakdown?: CategoryBreakdownMap;
}) {
  const router = useRouter();

  // Geo Scope & Region
  const [selectedRegion, setSelectedRegion] = useState<
    "ID" | "GLOBAL" | "US" | "EU" | "ASIA"
  >("ID");
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "30m" | "1h" | "90m" | "2h" | "4h" | "24h" | "7d" | "all"
  >("30m");
  const [selectedMediaScope, setSelectedMediaScope] = useState<
    "all" | "top_national" | "global_elite"
  >("top_national");

  // Live Scout States
  const [isLiveSearching, setIsLiveSearching] = useState<boolean>(false);
  const [liveSearchResults, setLiveSearchResults] = useState<LiveSearchItem[]>(
    []
  );
  const [liveSearchQuery, setLiveSearchQuery] = useState<string>("");

  // Status Aksi Live Items
  const [dispatchedTeleIds, setDispatchedTeleIds] = useState<string[]>([]);
  const [savedDbIds, setSavedDbIds] = useState<string[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [syncingAdafaktaId, setSyncingAdafaktaId] = useState<number | null>(
    null
  );

  // Filter Rubrik & Pencarian
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Operation States
  const [isScouting, setIsScouting] = useState<boolean>(false);
  const [scoutMessage, setScoutMessage] = useState<string | null>(null);

  // Saklar Bot Aktif / Jeda
  const [botActive, setBotActive] = useState<boolean>(initialBotActive);
  const [isTogglingBot, setIsTogglingBot] = useState<boolean>(false);

  // Seleksi Massal (Pilih Semua & Hapus)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Retensi Data Basi (Auto-Prune)
  const [retentionDays, setRetentionDays] = useState<number | null>(
    initialRetentionDays ?? 7
  );
  const [isPruning, setIsPruning] = useState<boolean>(false);

  // Modal RSS & Kata Kunci
  const [isRssModalOpen, setIsRssModalOpen] = useState<boolean>(false);
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState<boolean>(false);

  const [sourcesList, setSourcesList] =
    useState<RssSourceItem[]>(initialSources);
  const [keywordsList, setKeywordsList] =
    useState<KeywordItem[]>(initialKeywords);

  // Form input tambah RSS
  const [newRssName, setNewRssName] = useState("");
  const [newRssUrl, setNewRssUrl] = useState("");
  const [newRssCat, setNewRssCat] = useState("UMUM");

  // Form input tambah Kata Kunci
  const [newKeywordInput, setNewKeywordInput] = useState("");

  // Rubrik Utama Broadsheet
  const editorialRubrics = [
    { id: "ALL", label: "Semua Liputan", isTech: false },
    { id: "TEKNO", label: "Radar Teknologi & AI", isTech: true },
    { id: "POLITIK", label: "Politik & Pemilu", isTech: false },
    { id: "HUKUM", label: "Hukum & Kriminal", isTech: false },
    { id: "LINGKUNGAN", label: "Lingkungan & Iklim", isTech: false },
    { id: "BISNIS", label: "Bisnis & Ekonomi", isTech: false },
    { id: "INTERNASIONAL", label: "Internasional", isTech: false },
  ];

  const isTechMode = selectedCategory === "TEKNO";
  const isAllCategory = selectedCategory === "ALL";

  // Filter artikel di radar
  const filteredArticles = initialArticles.filter((article) => {
    // Jika mode Teknologi aktif: hanya ambil kategori TEKNO dan filter ketat
    if (isTechMode) {
      const artCat = (article.category || "").toUpperCase();
      const isTechCat = artCat === "TEKNO" || artCat === "TECH";
      const isTechSource =
        article.source.toLowerCase().includes("tech") ||
        article.source.toLowerCase().includes("daily") ||
        article.source.toLowerCase().includes("inet");
      if (!isTechCat && !isTechSource) return false;
    } else if (selectedCategory !== "ALL") {
      const artCat = (article.category || "UMUM").toUpperCase();
      if (artCat !== selectedCategory) return false;
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchesTitle = article.title.toLowerCase().includes(q);
      const matchesSummary = article.summary.toLowerCase().includes(q);
      const matchesSource = article.source.toLowerCase().includes(q);
      if (!matchesTitle && !matchesSummary && !matchesSource) return false;
    }

    return true;
  });

  // Metrik Reaktif Dinamis Mengikuti Kategori yang Dipilih
  const dynamicMonitored = isAllCategory
    ? metrics.totalMonitored
    : initialCategoryBreakdown[selectedCategory]?.monitored ??
      filteredArticles.length;

  const dynamicTransferred = isAllCategory
    ? metrics.totalTransferred
    : initialCategoryBreakdown[selectedCategory]?.synced ??
      initialArticles.filter(
        (a) =>
          (a.category || "").toUpperCase() === selectedCategory &&
          a.is_synced_adafakta
      ).length;

  const dynamicSentTelegram = isAllCategory
    ? metrics.totalSentTelegram
    : initialCategoryBreakdown[selectedCategory]?.sent ??
      initialArticles.filter(
        (a) =>
          (a.category || "").toUpperCase() === selectedCategory && a.sent_at
      ).length;

  const activeFeedsForCategory = isAllCategory
    ? sourcesList.filter((s) => s.active)
    : sourcesList.filter(
        (s) =>
          s.active &&
          (s.category || "").toUpperCase() === selectedCategory
      );

  const dynamicActiveFeedsCount = activeFeedsForCategory.length;

  const dynamicFeedsSubtext = isAllCategory
    ? sourcesList.length > 0
      ? `${activeFeedsForCategory.length} portal berita terverifikasi`
      : "Tempo, Kompas, CNN, CNBC, BBC"
    : activeFeedsForCategory.length > 0
    ? activeFeedsForCategory.map((s) => s.name).join(", ")
    : `Belum ada kanal khusus untuk rubrik ${selectedCategory}`;

  const dynamicMonitoredSubtext = isAllCategory
    ? "Seluruh arsip berita tersimpan di database"
    : `Arsip berita kategori ${selectedCategory} di database`;

  const allFilteredIds = filteredArticles.map((a) => a.id);
  const isAllSelected =
    allFilteredIds.length > 0 &&
    allFilteredIds.every((id) => selectedIds.includes(id));

  // Toggle saklar Bot Active / Pause
  async function handleToggleBot() {
    setIsTogglingBot(true);
    try {
      const res = await fetch("/api/settings/toggle-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !botActive }),
      });
      const data = await res.json();
      if (data.success) {
        setBotActive(data.active);
        setScoutMessage(data.message);
        if (data.active) {
          setTimeout(() => {
            router.refresh();
          }, 3500);
        }
      }
    } catch {
      alert("Gagal mengubah status saklar bot.");
    } finally {
      setIsTogglingBot(false);
    }
  }

  // Pilih Semua
  function handleToggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFilteredIds);
    }
  }

  // Pilih Satu per Satu
  function handleToggleSelectOne(id: number) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  // Hapus Terpilih
  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return;
    const confirmDelete = window.confirm(
      `Hapus ${selectedIds.length} berita terpilih dari radar redaksi?`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/articles/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (data.success) {
        setScoutMessage(data.message);
        setSelectedIds([]);
        router.refresh();
      } else {
        alert(data.error || "Gagal menghapus berita terpilih");
      }
    } catch {
      alert("Terjadi kesalahan jaringan saat menghapus.");
    } finally {
      setIsDeleting(false);
    }
  }

  // Bersihkan Seluruh Radar
  async function handleClearAllRadar() {
    const confirmClear = window.confirm(
      "PERINGATAN: Yakin ingin mengosongkan SELURUH radar berita? Semua arsip radar akan dibersihkan."
    );
    if (!confirmClear) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/articles/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (data.success) {
        setScoutMessage("Seluruh radar berita telah berhasil dikosongkan.");
        setSelectedIds([]);
        router.refresh();
      } else {
        alert(data.error || "Gagal membersihkan radar");
      }
    } catch {
      alert("Terjadi kesalahan jaringan saat membersihkan radar.");
    } finally {
      setIsDeleting(false);
    }
  }

  // Eksekusi Live Search Real-Time
  async function handleLiveSearch(queryOverride?: string) {
    const q = (queryOverride || searchQuery).trim();
    if (!q) {
      alert(
        isTechMode
          ? "Masukkan topik teknologi (contoh: OpenAI, Semikonduktor, Startup, Apple)"
          : "Masukkan topik pencarian (contoh: Kebijakan Energi, KPK, Pilkada)"
      );
      return;
    }

    setIsLiveSearching(true);
    setLiveSearchQuery(q);

    try {
      const activeCat = selectedCategory !== "ALL" ? selectedCategory : undefined;
      const res = await fetch("/api/scout/live-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: isTechMode ? `${q} teknologi tech` : q,
          region: selectedRegion,
          timeRange: selectedTimeRange,
          mediaScope: selectedMediaScope,
          category: activeCat,
          limit: 8,
          synthesizeAi: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLiveSearchResults(data.items || []);
        if (data.items?.length === 0) {
          setScoutMessage(
            `Tidak ditemukan liputan baru tentang "${q}" dalam rentang waktu yang dipilih.`
          );
        } else {
          setScoutMessage(
            `Ditemukan ${data.items.length} berita terbaru tentang "${q}".`
          );
        }
      } else {
        alert(data.error || "Gagal melakukan pencarian live scout.");
      }
    } catch {
      alert("Gagal terhubung ke layanan pencarian real-time.");
    } finally {
      setIsLiveSearching(false);
    }
  }

  // Siarkan Item Live ke Telegram
  async function handleDispatchLiveTelegram(item: LiveSearchItem) {
    setActionLoadingId(`tele-${item.id}`);
    try {
      const res = await fetch("/api/telegram/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          source: item.source,
          url: item.url,
          summary: item.summary || item.snippet,
          category: item.category || (isTechMode ? "TEKNO" : "UMUM"),
          isPriority: item.isPriority,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDispatchedTeleIds((prev) => [...prev, item.id]);
        setScoutMessage(`Berita "${item.title.slice(0, 45)}..." disiarkan ke Telegram.`);
      } else {
        alert(data.error || "Gagal mengirim ke Telegram");
      }
    } catch {
      alert("Gagal menyiarkan berita ke Telegram");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Simpan Item Live ke Database Radar
  async function handleSaveLiveToDb(item: LiveSearchItem) {
    setActionLoadingId(`save-${item.id}`);
    try {
      const res = await fetch("/api/articles/save-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          source: item.source,
          url: item.url,
          summary: item.summary || item.snippet,
          category: item.category || (isTechMode ? "TEKNO" : "UMUM"),
          isPriority: item.isPriority,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedDbIds((prev) => [...prev, item.id]);
        setScoutMessage(`Berita disimpan ke database radar.`);
        router.refresh();
      } else {
        alert(data.error || "Gagal menyimpan ke radar");
      }
    } catch {
      alert("Gagal menyimpan berita ke database");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Setor Berita ke Meja Redaksi AdaFakta
  async function handleSyncToAdafakta(articleId: number) {
    setSyncingAdafaktaId(articleId);
    try {
      const res = await fetch("/api/articles/sync-adafakta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: articleId }),
      });
      const data = await res.json();
      if (data.success) {
        setScoutMessage(`Draf liputan disetor ke redaksi AdaFakta.`);
        router.refresh();
      } else {
        alert(data.error || "Gagal menyetor ke AdaFakta");
      }
    } catch {
      alert("Gagal menyambung ke server AdaFakta.");
    } finally {
      setSyncingAdafaktaId(null);
    }
  }

  // Trigger Scout Manual (bisa target kategori seperti TEKNO, INTERNASIONAL, dll.)
  async function handleTriggerScout(targetCat?: string) {
    const cat = targetCat !== undefined ? targetCat : (selectedCategory !== "ALL" ? selectedCategory : undefined);
    setIsScouting(true);
    setScoutMessage(null);
    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat }),
      });
      const data = await res.json();
      if (data.success) {
        setScoutMessage(data.message);
        router.refresh();
      } else {
        setScoutMessage(`Peringatan: ${data.message || "Gagal menyisir berita"}`);
      }
    } catch {
      setScoutMessage("Terjadi kesalahan jaringan saat menyisir berita.");
    } finally {
      setIsScouting(false);
    }
  }

  // Ubah Pengaturan Durasi Retensi
  async function handleChangeRetention(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const val = e.target.value;
    const newDays = val === "disabled" ? null : parseInt(val, 10);
    setRetentionDays(newDays);

    try {
      const res = await fetch("/api/settings/retention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: newDays }),
      });
      const data = await res.json();
      if (data.success) {
        setScoutMessage(
          newDays === null
            ? "Retensi dinonaktifkan: Data berita disimpan permanen."
            : `Kebijakan retensi diperbarui: Otomatis pangkas setelah ${newDays} hari.`
        );
      }
    } catch {
      alert("Gagal memperbarui pengaturan retensi.");
    }
  }

  // Pangkas Berita Basi Manual
  async function handleManualPrune() {
    if (retentionDays === null) return;
    const confirmPrune = window.confirm(
      `Pangkas seluruh berita basi berusia lebih dari ${retentionDays} hari?\n(Berita prioritas redaksi tetap tersimpan aman).`
    );
    if (!confirmPrune) return;

    setIsPruning(true);
    try {
      const res = await fetch("/api/articles/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: retentionDays }),
      });
      const data = await res.json();
      if (data.success) {
        setScoutMessage(data.message);
        router.refresh();
      } else {
        alert(data.error || "Gagal memangkas data basi");
      }
    } catch {
      alert("Terjadi kesalahan jaringan saat memangkas data.");
    } finally {
      setIsPruning(false);
    }
  }

  // RSS Handlers
  async function handleAddSource(e: React.FormEvent) {
    e.preventDefault();
    if (!newRssName.trim() || !newRssUrl.trim()) return;

    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRssName.trim(),
          url: newRssUrl.trim(),
          category: newRssCat,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSourcesList((prev) => [...prev, data.source]);
        setNewRssName("");
        setNewRssUrl("");
        setScoutMessage(`Kanal RSS "${data.source.name}" ditambahkan.`);
      }
    } catch {
      alert("Gagal menambahkan sumber RSS");
    }
  }

  async function handleToggleSource(id: number, currentActive: boolean) {
    try {
      const res = await fetch("/api/sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !currentActive }),
      });
      if (res.ok) {
        setSourcesList((prev) =>
          prev.map((s) => (s.id === id ? { ...s, active: !currentActive } : s))
        );
      }
    } catch {
      alert("Gagal memperbarui status sumber");
    }
  }

  async function handleDeleteSource(id: number) {
    if (!confirm("Hapus sumber RSS ini dari pemantauan?")) return;
    try {
      const res = await fetch(`/api/sources?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSourcesList((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      alert("Gagal menghapus sumber RSS");
    }
  }

  // Keyword Handlers
  async function handleAddKeyword(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeywordInput.trim()) return;

    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: newKeywordInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywordsList((prev) => [...prev, data.keyword]);
        setNewKeywordInput("");
      }
    } catch {
      alert("Gagal menambahkan kata kunci");
    }
  }

  async function handleDeleteKeyword(id: number) {
    try {
      const res = await fetch(`/api/keywords?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeywordsList((prev) => prev.filter((k) => k.id !== id));
      }
    } catch {
      alert("Gagal menghapus kata kunci");
    }
  }

  // Lead Story (Headline Utama Pertama)
  const leadStory = filteredArticles.length > 0 ? filteredArticles[0] : null;
  const secondaryStories =
    filteredArticles.length > 1 ? filteredArticles.slice(1) : [];

  // Topik Cepat (Kontekstual: Jika mode teknologi, tampilkan topik teknologi)
  const quickTopics = isTechMode
    ? [
        "Artificial Intelligence",
        "Nvidia",
        "OpenAI",
        "Cybersecurity",
        "Startup Indonesia",
        "Semikonduktor",
        "Gadget & Mobile",
      ]
    : [
        "Pilkada Serentak",
        "Greenpeace",
        "KPK",
        "IKN Nusantara",
        "Subsidi BBM",
        "Transisi Energi",
        "Kebijakan Pajak",
      ];

  const currentDateFormatted = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getScoutButtonConfig = (cat: string) => {
    switch (cat) {
      case "TEKNO":
        return {
          label: "Tarik Berita Teknologi Sekarang",
          loadingLabel: "Menyisir Portal Teknologi...",
          icon: <Icons.Cpu size={14} />,
          style: { backgroundColor: "var(--tech)", borderColor: "var(--tech)" },
        };
      case "INTERNASIONAL":
        return {
          label: "Tarik Berita Internasional Sekarang",
          loadingLabel: "Menyisir Portal Internasional...",
          icon: <Icons.Globe size={14} />,
          style: { backgroundColor: "#1e3a8a", borderColor: "#1e3a8a" },
        };
      case "POLITIK":
        return {
          label: "Tarik Berita Politik Sekarang",
          loadingLabel: "Menyisir Portal Politik...",
          icon: <Icons.Target size={14} />,
          style: { backgroundColor: "var(--crimson)", borderColor: "var(--crimson)" },
        };
      case "LINGKUNGAN":
        return {
          label: "Tarik Berita Lingkungan Sekarang",
          loadingLabel: "Menyisir Portal Lingkungan...",
          icon: <Icons.Leaf size={14} />,
          style: { backgroundColor: "var(--forest)", borderColor: "var(--forest)" },
        };
      case "BISNIS":
        return {
          label: "Tarik Berita Bisnis Sekarang",
          loadingLabel: "Menyisir Portal Bisnis...",
          icon: <Icons.Newspaper size={14} />,
          style: { backgroundColor: "#0f766e", borderColor: "#0f766e" },
        };
      case "HUKUM":
        return {
          label: "Tarik Berita Hukum Sekarang",
          loadingLabel: "Menyisir Portal Hukum...",
          icon: <Icons.Filter size={14} />,
          style: { backgroundColor: "#854d0e", borderColor: "#854d0e" },
        };
      default:
        return {
          label: "Luncurkan Liputan Semua Rubrik",
          loadingLabel: "Menyisir Semua Kanal Media...",
          icon: <Icons.Rocket size={14} />,
          style: {},
        };
    }
  };

  const currentScoutConfig = getScoutButtonConfig(selectedCategory);

  return (
    <div className="broadsheet-container">
      {/* 1. MASTHEAD & TOP EDITORIAL BAR */}
      <header className="masthead-wrapper">
        <div className="masthead-topline">
          <div className="dateline-group">
            <span>EDISI REDAKSI</span>
            <span className="dateline-dot">•</span>
            <span>{currentDateFormatted}</span>
            <span className="dateline-dot">•</span>
            <span>JAKARTA, INDONESIA</span>
          </div>

          <div className="masthead-controls">
            {/* Saklar Bot */}
            <button
              onClick={handleToggleBot}
              disabled={isTogglingBot}
              className={`btn-bot-toggle ${botActive ? "active" : "paused"}`}
              title="Aktifkan atau jeda pemantauan otomatis"
            >
              <Icons.Power size={11} />
              <span>
                {isTogglingBot
                  ? "MEMPROSES..."
                  : botActive
                  ? "RADAR AKTIF 24/7"
                  : "RADAR DIJEDA (OFF)"}
              </span>
            </button>

            {/* Link Meja Redaksi */}
            <a
              href="https://www.adafakta.web.id/admin/jurnalis"
              target="_blank"
              rel="noopener noreferrer"
              className="link-newsroom-portal"
            >
              MEJA REDAKSI ADAFAKTA <Icons.ExternalLink size={11} />
            </a>
          </div>
        </div>

        <div className="masthead-main">
          <div className="masthead-brand">
            <h1 className="masthead-title">ADAFAKTA INTELLIGENCE RADAR</h1>
            <p className="masthead-tagline">
              Pusat investigasi, verifikasi fakta, dan kurasi berita harian
              bertenaga kecerdasan buatan untuk jurnalisme berwibawa.
            </p>
          </div>

          <div className="masthead-actions">
            <button
              onClick={() => handleTriggerScout()}
              disabled={isScouting}
              className="btn-scout-lead"
              style={currentScoutConfig.style}
            >
              {currentScoutConfig.icon}
              <span>
                {isScouting
                  ? currentScoutConfig.loadingLabel
                  : currentScoutConfig.label}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. DATA RIBBON (METRIK TERINTEGRASI REAKTIF PER KATEGORI) */}
      <section className="data-ribbon">
        <div className="data-ribbon-item">
          <div className="ribbon-label">
            BERITA TERPANTAU {isAllCategory ? "" : `(${selectedCategory})`}
          </div>
          <div className="ribbon-value">{dynamicMonitored}</div>
          <div className="ribbon-sub" title={dynamicMonitoredSubtext}>
            {dynamicMonitoredSubtext}
          </div>
        </div>

        <div className="data-ribbon-item">
          <div className="ribbon-label">
            DISETOR KE ADAFAKTA {isAllCategory ? "" : `(${selectedCategory})`}
          </div>
          <div className="ribbon-value">{dynamicTransferred}</div>
          <div className="ribbon-sub">Bahan investigasi di meja redaktur</div>
        </div>

        <div className="data-ribbon-item">
          <div className="ribbon-label">
            TELEGRAM DISPATCH {isAllCategory ? "" : `(${selectedCategory})`}
          </div>
          <div className="ribbon-value">{dynamicSentTelegram}</div>
          <div className="ribbon-sub">Alarm intelijen terkirim ke bot redaksi</div>
        </div>

        <div className="data-ribbon-item">
          <div className="ribbon-label">
            KANAL RSS AKTIF {isAllCategory ? "" : `(${selectedCategory})`}
          </div>
          <div className="ribbon-value">{dynamicActiveFeedsCount}</div>
          <div className="ribbon-sub" title={dynamicFeedsSubtext}>
            {dynamicFeedsSubtext}
          </div>
        </div>
      </section>

      {/* 3. EDITORIAL RUBRICS (NAVIGATION BAR) */}
      <nav className="rubric-navbar">
        <div className="rubric-tabs-left">
          {editorialRubrics.map((rubric) => {
            const isActive = selectedCategory === rubric.id;
            return (
              <button
                key={rubric.id}
                onClick={() => setSelectedCategory(rubric.id)}
                className={`rubric-tab ${rubric.isTech ? "tab-tech" : ""} ${
                  isActive ? "active" : ""
                }`}
              >
                {rubric.isTech && (
                  <Icons.Cpu size={13} className="rubric-tab-icon" />
                )}
                {rubric.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* CALLOUT BANNER KANAL EKSKLUSIF TEKNOLOGI */}
      {isTechMode && (
        <div className="tech-mode-banner">
          <div className="tech-banner-text">
            <span className="tech-badge-exclusive">KANAL EKSKLUSIF</span>
            <span>
              Mode Radar Teknologi & AI Aktif — Seluruh berita politik dan isu
              hukum difilter keluar.
            </span>
          </div>
          <button
            onClick={() => setSelectedCategory("ALL")}
            className="btn-exit-tech"
          >
            Tampilkan Semua Liputan ✕
          </button>
        </div>
      )}

      {/* 4. ASYMMETRICAL 2-COLUMN EDITORIAL GRID */}
      <div className="editorial-grid">
        {/* KOLOM KIRI: ARUS BERITA INTELIJEN (68%) */}
        <main className="news-stream-col">
          {/* HASIL LIVE SCOUT JIKA AKTIF */}
          {liveSearchResults.length > 0 && (
            <div className="live-results-section">
              <div className="live-results-header">
                <span className="live-results-title">
                  <Icons.Zap size={14} /> LIVE SCOUT: &ldquo;{liveSearchQuery}&rdquo; (
                  {liveSearchResults.length} Laporan)
                </span>
                <button
                  onClick={() => setLiveSearchResults([])}
                  className="btn-close-live"
                >
                  Tutup Hasil Live ✕
                </button>
              </div>

              <div className="live-cards-stream">
                {liveSearchResults.map((item, idx) => {
                  const isTeleSent = dispatchedTeleIds.includes(item.id);
                  const isDbSaved = savedDbIds.includes(item.id);
                  const isTeleLoading = actionLoadingId === `tele-${item.id}`;
                  const isSaveLoading = actionLoadingId === `save-${item.id}`;

                  return (
                    <article key={`${item.id}-${idx}`} className="live-item-card">
                      <div className="live-item-meta">
                        <span style={{ fontWeight: 800 }}>{item.source}</span>
                        <span>•</span>
                        <span>#{item.category || (isTechMode ? "TEKNO" : "UMUM")}</span>
                        <span>•</span>
                        <span>{item.timeAgo}</span>
                        {item.freshnessTier && (
                          <>
                            <span>•</span>
                            <span
                              style={{
                                color: "var(--crimson)",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                fontSize: "0.68rem",
                                letterSpacing: "0.04em",
                              }}
                            >
                              Tier {item.freshnessTier}
                            </span>
                          </>
                        )}
                      </div>

                      <h4 className="live-item-title">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.title}
                        </a>
                      </h4>

                      <p className="live-item-summary">
                        {item.summary || item.snippet}
                      </p>

                      <div className="live-item-actions">
                        <button
                          onClick={() => handleDispatchLiveTelegram(item)}
                          disabled={isTeleSent || isTeleLoading}
                          className="btn-sync-small"
                        >
                          <Icons.Telegram size={12} />
                          {isTeleLoading
                            ? "Mengirim..."
                            : isTeleSent
                            ? "Terkirim ke Telegram"
                            : "Kirim Telegram"}
                        </button>

                        <button
                          onClick={() => handleSaveLiveToDb(item)}
                          disabled={isDbSaved || isSaveLoading}
                          className="btn-sync-small"
                        >
                          <Icons.Bookmark size={12} />
                          {isSaveLoading
                            ? "Menyimpan..."
                            : isDbSaved
                            ? "Tersimpan di Radar"
                            : "Simpan ke Radar"}
                        </button>

                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-read-source"
                        >
                          Sumber Asli <Icons.ExternalLink size={10} />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* STREAM HEADER & BATCH ACTION CONTROLS */}
          <div className="stream-header">
            <div className="stream-title-group">
              <h2>
                {isTechMode
                  ? "Radar Khusus Teknologi & Inovasi"
                  : selectedCategory === "ALL"
                  ? "Arus Intelijen Berita Redaksi"
                  : `Rubrik: ${selectedCategory}`}
              </h2>
              <span className="stream-subtitle">
                {filteredArticles.length} isu terdeteksi dan dianalisis
              </span>
            </div>

            {filteredArticles.length > 0 && (
              <div className="stream-toolbar">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="custom-checkbox"
                  />
                  <span>Pilih Semua</span>
                </label>

                {selectedIds.length > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    className="btn-toolbar-action btn-toolbar-danger"
                  >
                    <Icons.Trash size={12} /> Hapus ({selectedIds.length})
                  </button>
                )}

                <button
                  onClick={handleClearAllRadar}
                  disabled={isDeleting}
                  className="btn-toolbar-action"
                  title="Kosongkan seluruh feed radar berita"
                >
                  <Icons.Broom size={12} /> Bersihkan Feed
                </button>
              </div>
            )}
          </div>

          {/* STREAM BERITA */}
          {filteredArticles.length === 0 ? (
            <div className="empty-state-editorial">
              <h3>Tidak ada berita untuk filter saat ini</h3>
              <p>
                {isTechMode
                  ? "Belum ada berita teknologi di arsip. Gunakan kolom Live Scout di samping kanan untuk menyisir berita teknologi terbaru."
                  : "Gunakan tombol Luncurkan Liputan Sekarang untuk mulai menyisir portal media."}
              </p>
            </div>
          ) : (
            <div>
              {/* LEAD STORY (HEADLINE UTAMA) */}
              {leadStory && (
                <article className="lead-story-card">
                  <div className="lead-meta">
                    {leadStory.is_priority ? (
                      <span className="badge-lead-priority">
                        PRIORITAS REDAKSI
                      </span>
                    ) : isTechMode ? (
                      <span className="badge-lead-tech">TEKNOLOGI UTAMA</span>
                    ) : (
                      <span className="badge-lead-category">
                        #{leadStory.category || "UMUM"}
                      </span>
                    )}

                    <span className="lead-source">{leadStory.source}</span>
                    <span className="lead-dateline">
                      {leadStory.published_at || leadStory.created_at
                        ? new Date(
                            leadStory.published_at || leadStory.created_at
                          ).toLocaleString("id-ID", {
                            timeZone: "Asia/Bangkok",
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "-"}{" "}
                      WIB
                    </span>
                  </div>

                  <h2 className="lead-title">
                    <a
                      href={leadStory.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {leadStory.title}
                    </a>
                  </h2>

                  <div className="lead-body">
                    <p>{leadStory.summary}</p>
                  </div>

                  <div className="lead-footer">
                    <div className="lead-actions-left">
                      {leadStory.is_synced_adafakta ? (
                        <span className="badge-synced">
                          <Icons.CheckCircle size={12} /> Disetor ke AdaFakta
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSyncToAdafakta(leadStory.id)}
                          disabled={syncingAdafaktaId === leadStory.id}
                          className="btn-sync-adafakta-lead"
                        >
                          <Icons.Rocket size={12} />
                          {syncingAdafaktaId === leadStory.id
                            ? "Menyetor..."
                            : "Setor ke Meja Redaksi"}
                        </button>
                      )}

                      {leadStory.sent_at && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontFamily: "var(--font-masthead)",
                            fontWeight: 800,
                            color: "var(--ink-muted)",
                          }}
                        >
                          <Icons.Telegram size={12} /> Terkirim ke Telegram
                        </span>
                      )}
                    </div>

                    <a
                      href={leadStory.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-read-source"
                    >
                      Buka Sumber Asli <Icons.ExternalLink size={11} />
                    </a>
                  </div>
                </article>
              )}

              {/* SECONDARY STORIES (BROADSHEET 2-COLUMN GRID) */}
              {secondaryStories.length > 0 && (
                <div className="secondary-grid">
                  {secondaryStories.map((story) => {
                    const isChecked = selectedIds.includes(story.id);
                    const dateObj = story.published_at || story.created_at;
                    const dateStr = dateObj
                      ? new Date(dateObj).toLocaleDateString("id-ID", {
                          timeZone: "Asia/Bangkok",
                          month: "short",
                          day: "numeric",
                        })
                      : "-";

                    return (
                      <article
                        key={story.id}
                        className={`story-card ${isChecked ? "is-checked" : ""}`}
                      >
                        <div>
                          <div className="story-meta">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectOne(story.id)}
                              className="custom-checkbox"
                            />
                            <span style={{ fontWeight: 800 }}>
                              {story.source}
                            </span>
                            <span>•</span>
                            <span>#{story.category || "UMUM"}</span>
                            <span>•</span>
                            <span style={{ color: "var(--ink-faint)" }}>
                              {dateStr}
                            </span>
                          </div>

                          <h3 className="story-title">
                            <a
                              href={story.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {story.title}
                            </a>
                          </h3>

                          <p className="story-summary">{story.summary}</p>
                        </div>

                        <div className="story-footer">
                          {story.is_synced_adafakta ? (
                            <span className="badge-synced-small">
                              <Icons.CheckCircle size={10} /> Disetor
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSyncToAdafakta(story.id)}
                              disabled={syncingAdafaktaId === story.id}
                              className="btn-sync-small"
                            >
                              {syncingAdafaktaId === story.id
                                ? "Menyetor..."
                                : "Setor Redaksi"}
                            </button>
                          )}

                          <a
                            href={story.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-read-source"
                            style={{ fontSize: "0.7rem" }}
                          >
                            Sumber <Icons.ExternalLink size={10} />
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>

        {/* KOLOM KANAN: EDITORIAL SIDEBAR (32%) */}
        <aside className="editorial-sidebar-col">
          {/* SECTION 1: LIVE SEARCH & SCOUT */}
          <div className="sidebar-section">
            <div className="sidebar-header">
              <span className="sidebar-title">
                <Icons.Search size={14} />{" "}
                {isTechMode ? "Pencarian Berita Teknologi" : "Penelusuran Live Media"}
              </span>
            </div>

            <div className="scout-form-group">
              <input
                type="text"
                placeholder={
                  isTechMode
                    ? "Cari AI, startup, gadget, chip..."
                    : "Ketik isu, figur, peristiwa kritis..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLiveSearch();
                  }
                }}
                className="scout-input-field"
              />

              <div className="scout-options-row">
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                  className="scout-select-field"
                >
                  <option value="30m">⚡ 30 Menit (Bertahap)</option>
                  <option value="1h">⏱️ 1 Jam Terakhir</option>
                  <option value="90m">⏱️ 1.5 Jam Terakhir</option>
                  <option value="2h">⏱️ 2 Jam Terakhir</option>
                  <option value="4h">⏱️ 4 Jam Terakhir</option>
                  <option value="24h">📅 24 Jam Terakhir</option>
                  <option value="7d">📅 7 Hari Terakhir</option>
                  <option value="all">🌐 Semua Waktu</option>
                </select>

                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value as any)}
                  className="scout-select-field"
                >
                  <option value="ID">Indonesia</option>
                  <option value="GLOBAL">Global / Internasional</option>
                  <option value="US">Amerika Serikat</option>
                  <option value="ASIA">Asia Pasifik</option>
                </select>
              </div>

              <button
                onClick={() => handleLiveSearch()}
                disabled={isLiveSearching}
                className="btn-scout-submit"
              >
                <Icons.Zap size={14} />
                <span>{isLiveSearching ? "Menelusuri..." : "Telusuri Berita"}</span>
              </button>
            </div>

            {/* QUICK TOPIC CHIPS */}
            <div style={{ marginTop: "12px" }}>
              <div
                style={{
                  fontSize: "0.68rem",
                  fontFamily: "var(--font-masthead)",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  marginBottom: "6px",
                }}
              >
                {isTechMode ? "TOPIK TEKNOLOGI KILAT:" : "TOPIK HANGAT REDAKSI:"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {quickTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => {
                      setSearchQuery(topic);
                      handleLiveSearch(topic);
                    }}
                    style={{
                      padding: "3px 7px",
                      fontSize: "0.72rem",
                      border: "1px solid var(--hairline)",
                      backgroundColor: "var(--paper)",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2: INDEKS TOPIK HANGAT 24 JAM */}
          <div className="sidebar-section">
            <div className="sidebar-header">
              <span className="sidebar-title">
                <Icons.Target size={14} /> Indeks Isu Terhangat
              </span>
            </div>

            <div className="trending-index-list">
              {initialTrendingTopics.length > 0 ? (
                initialTrendingTopics.map((item, idx) => (
                  <button
                    key={item.topic}
                    onClick={() => setSearchQuery(item.topic)}
                    className="trending-index-item"
                    title={`Klik untuk menyaring topik "${item.topic}"`}
                  >
                    <span className="trending-rank">{idx + 1}.</span>
                    <span className="trending-name">{item.topic}</span>
                    <span className="trending-count">{item.count} liputan</span>
                  </button>
                ))
              ) : (
                <div style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>
                  Belum ada topik dominan.
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: DISTRIBUSI RUBRIK LIPUTAN */}
          <div className="sidebar-section">
            <div className="sidebar-header">
              <span className="sidebar-title">
                <Icons.Newspaper size={14} /> Distribusi Rubrik
              </span>
            </div>

            <div className="editorial-segmented-bar">
              {initialCategoryStats.length > 0 ? (
                initialCategoryStats.map((item) => (
                  <div
                    key={item.category}
                    className="bar-segment"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                    onClick={() => setSelectedCategory(item.category)}
                    title={`${item.category}: ${item.percentage}% (${item.count} isu)`}
                  />
                ))
              ) : (
                <div style={{ width: "100%", backgroundColor: "#e2ded8" }} />
              )}
            </div>

            <div className="distribution-legend">
              {initialCategoryStats.map((item) => (
                <button
                  key={item.category}
                  onClick={() => setSelectedCategory(item.category)}
                  className="legend-btn"
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        backgroundColor: item.color,
                        display: "inline-block",
                      }}
                    />
                    <span>{item.category}</span>
                  </span>
                  <span style={{ fontWeight: 700 }}>{item.percentage}%</span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 4: KELOLA SUMBER & RETENSI DATA */}
          <div className="sidebar-section">
            <div className="sidebar-header">
              <span className="sidebar-title">
                <Icons.Clock size={14} /> Manajemen Redaksi
              </span>
            </div>

            <div className="quick-tools-grid">
              <button
                onClick={() => setIsRssModalOpen(true)}
                className="btn-sidebar-tool"
              >
                <Icons.Rss size={13} /> Kanal RSS ({sourcesList.length})
              </button>

              <button
                onClick={() => setIsKeywordModalOpen(true)}
                className="btn-sidebar-tool"
              >
                <Icons.Target size={13} /> Kata Kunci ({keywordsList.length})
              </button>
            </div>

            {/* RETENSI DATA BASI */}
            <div style={{ marginTop: "12px" }}>
              <div
                style={{
                  fontSize: "0.68rem",
                  fontFamily: "var(--font-masthead)",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  marginBottom: "4px",
                }}
              >
                Retensi Data Basi:
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <select
                  value={
                    retentionDays === null ? "disabled" : String(retentionDays)
                  }
                  onChange={handleChangeRetention}
                  className="scout-select-field"
                  style={{ flex: 1 }}
                >
                  <option value="3">Pangkas &gt; 3 Hari</option>
                  <option value="7">Pangkas &gt; 7 Hari</option>
                  <option value="14">Pangkas &gt; 14 Hari</option>
                  <option value="30">Pangkas &gt; 30 Hari</option>
                  <option value="disabled">Simpan Permanen</option>
                </select>

                <button
                  onClick={handleManualPrune}
                  disabled={isPruning || retentionDays === null}
                  className="btn-sidebar-tool"
                  title="Pangkas data basi sekarang"
                >
                  <Icons.Broom size={12} />
                  <span>{isPruning ? "Memangkas..." : "Pangkas"}</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* TOAST NOTIFIKASI */}
      {scoutMessage && (
        <div className="editorial-toast">
          <span>{scoutMessage}</span>
          <button
            onClick={() => setScoutMessage(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            <Icons.Close size={14} />
          </button>
        </div>
      )}

      {/* MODAL KELOLA KANAL RSS */}
      {isRssModalOpen && (
        <div className="editorial-modal-overlay">
          <div className="editorial-modal-box">
            <div className="editorial-modal-header">
              <span className="editorial-modal-title">
                Manajemen Kanal Media (RSS Sources)
              </span>
              <button
                onClick={() => setIsRssModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Icons.Close size={16} />
              </button>
            </div>

            <div className="editorial-modal-body">
              <form onSubmit={handleAddSource} style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Nama Media (misal: Tempo, TechCrunch)"
                    value={newRssName}
                    onChange={(e) => setNewRssName(e.target.value)}
                    className="scout-input-field"
                    required
                  />
                  <select
                    value={newRssCat}
                    onChange={(e) => setNewRssCat(e.target.value)}
                    className="scout-select-field"
                  >
                    <option value="UMUM">Rubrik: UMUM</option>
                    <option value="TEKNO">Rubrik: TEKNO</option>
                    <option value="POLITIK">Rubrik: POLITIK</option>
                    <option value="HUKUM">Rubrik: HUKUM</option>
                    <option value="BISNIS">Rubrik: BISNIS</option>
                    <option value="LINGKUNGAN">Rubrik: LINGKUNGAN</option>
                    <option value="INTERNASIONAL">Rubrik: INTERNASIONAL</option>
                  </select>
                </div>
                <input
                  type="url"
                  placeholder="URL RSS Feed (contoh: https://tempo.co/rss)"
                  value={newRssUrl}
                  onChange={(e) => setNewRssUrl(e.target.value)}
                  className="scout-input-field"
                  style={{ marginBottom: "8px" }}
                  required
                />
                <button type="submit" className="btn-scout-submit">
                  <Icons.Plus size={14} /> Tambah Kanal RSS
                </button>
              </form>

              <table className="modal-table">
                <thead>
                  <tr>
                    <th>MEDIA</th>
                    <th>RUBRIK</th>
                    <th>STATUS</th>
                    <th>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {sourcesList.map((src) => (
                    <tr key={src.id}>
                      <td>
                        <strong>{src.name}</strong>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--ink-faint)",
                          }}
                        >
                          {src.url}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>
                          #{src.category || "UMUM"}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleSource(src.id, src.active)}
                          style={{
                            padding: "3px 6px",
                            fontSize: "0.68rem",
                            fontFamily: "var(--font-masthead)",
                            fontWeight: 800,
                            border: "1px solid var(--hairline)",
                            background: src.active ? "var(--forest-subtle)" : "transparent",
                            color: src.active ? "var(--forest)" : "var(--ink-faint)",
                            cursor: "pointer",
                          }}
                        >
                          {src.active ? "AKTIF" : "NONAKTIF"}
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteSource(src.id)}
                          style={{
                            color: "var(--crimson)",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="editorial-modal-footer">
              <button
                onClick={() => setIsRssModalOpen(false)}
                className="btn-toolbar-action"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KELOLA KATA KUNCI PRIORITAS */}
      {isKeywordModalOpen && (
        <div className="editorial-modal-overlay">
          <div className="editorial-modal-box">
            <div className="editorial-modal-header">
              <span className="editorial-modal-title">
                Fokus Isu & Kata Kunci Prioritas
              </span>
              <button
                onClick={() => setIsKeywordModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Icons.Close size={16} />
              </button>
            </div>

            <div className="editorial-modal-body">
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--ink-muted)",
                  marginBottom: "12px",
                }}
              >
                Berita yang mengandung kata kunci ini akan otomatis diprioritaskan
                sebagai <strong>PRIORITAS REDAKSI</strong> dan ditempatkan di
                posisi teratas.
              </p>

              <form
                onSubmit={handleAddKeyword}
                style={{ display: "flex", gap: "8px", marginBottom: "14px" }}
              >
                <input
                  type="text"
                  placeholder="Ketik topik (contoh: Greenpeace, AI, KPK, Subsidi)..."
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  className="scout-input-field"
                  style={{ flex: 1 }}
                  required
                />
                <button type="submit" className="btn-scout-submit">
                  <Icons.Plus size={14} /> Tambah
                </button>
              </form>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {keywordsList.map((kw) => (
                  <span
                    key={kw.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 8px",
                      background: "var(--canvas-subtle)",
                      border: "1px solid var(--hairline)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    <span>{kw.keyword}</span>
                    <button
                      onClick={() => handleDeleteKeyword(kw.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--crimson)",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="editorial-modal-footer">
              <button
                onClick={() => setIsKeywordModalOpen(false)}
                className="btn-toolbar-action"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
