"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/Icons";
import { CategoryStat, TrendingTopic } from "@/lib/analytics";

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
}

export interface MetricStats {
  totalMonitored: number;
  totalTransferred: number;
  totalSentTelegram: number;
  activeFeedsCount: number;
}

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
}: {
  initialArticles: ArticleItem[];
  metrics: MetricStats;
  initialBotActive: boolean;
  initialSources: RssSourceItem[];
  initialKeywords: KeywordItem[];
  initialRetentionDays?: number | null;
  initialCategoryStats?: CategoryStat[];
  initialTrendingTopics?: TrendingTopic[];
}) {
  const router = useRouter();

  // Filter States
  const [selectedSource, setSelectedSource] = useState<string>("ALL");
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

  const [sourcesList, setSourcesList] = useState<RssSourceItem[]>(initialSources);
  const [keywordsList, setKeywordsList] = useState<KeywordItem[]>(initialKeywords);

  // Form input tambah RSS
  const [newRssName, setNewRssName] = useState("");
  const [newRssUrl, setNewRssUrl] = useState("");
  const [newRssCat, setNewRssCat] = useState("UMUM");

  // Form input tambah Kata Kunci
  const [newKeywordInput, setNewKeywordInput] = useState("");

  // Kategori unik
  const categories = [
    "ALL",
    "POLITIK",
    "HUKUM",
    "BISNIS",
    "TEKNO",
    "INTERNASIONAL",
    "NASIONAL",
  ];

  // Sumber unik
  const sources = [
    "ALL",
    ...Array.from(new Set(initialArticles.map((a) => a.source))).filter(Boolean),
  ];

  // Filter artikel
  const filteredArticles = initialArticles.filter((article) => {
    const matchesSource =
      selectedSource === "ALL" || article.source === selectedSource;
    const matchesCategory =
      selectedCategory === "ALL" ||
      (article.category || "UMUM").toUpperCase() === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSource && matchesCategory && matchesSearch;
  });

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
      `Yakin ingin menghapus ${selectedIds.length} berita terpilih dari radar?`
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
      "PERINGATAN: Yakin ingin mengosongkan SELURUH radar berita? Semua riwayat radar di bot akan dibersihkan."
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

  // Manual Scout Trigger
  async function handleTriggerScout() {
    setIsScouting(true);
    setScoutMessage(null);
    try {
      const res = await fetch("/api/scout", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setScoutMessage(
          `Liputan selesai! ${data.result.fetched} berita dipantau, ${data.result.inserted} berita baru disimpan, ${data.result.sent} disetor ke AdaFakta & Telegram.`
        );
        router.refresh();
      } else {
        setScoutMessage(`Gagal menjalankan liputan: ${data.message || data.error}`);
      }
    } catch {
      setScoutMessage("Kesalahan jaringan saat memicu liputan.");
    } finally {
      setIsScouting(false);
    }
  }

  // Ubah Pengaturan Durasi Retensi
  async function handleChangeRetention(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const targetDays = val === "disabled" ? "disabled" : Number(val);

    try {
      const res = await fetch("/api/settings/retention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: targetDays }),
      });
      const data = await res.json();
      if (data.success) {
        setRetentionDays(val === "disabled" ? null : Number(val));
        setScoutMessage(data.message);
      }
    } catch {
      alert("Gagal mengubah pengaturan retensi.");
    }
  }

  // Pemicu Pembersihan Data Basi Manual
  async function handleManualPrune() {
    if (retentionDays === null) {
      alert("Retensi data sedang dimatikan.");
      return;
    }

    const confirmPrune = window.confirm(
      `Pangkas seluruh berita basi yang berusia lebih dari ${retentionDays} hari?\n(Catatan: Berita bertanda prioritas redaksi tetap aman tersimpan).`
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

  return (
    <div className="command-center">
      {/* 1. TOP LIVE STATUS BAR (LIGHT EDITORIAL) */}
      <div className="status-bar">
        <div className="status-indicator">
          <span
            className={`pulse-dot ${botActive ? "pulse-active" : "pulse-paused"}`}
          ></span>
          <span className="status-title">
            {botActive
              ? "AUTONOMOUS SCOUT RADAR: ACTIVE"
              : "AUTONOMOUS SCOUT RADAR: PAUSED / JEDA"}
          </span>
        </div>

        <div className="status-meta">
          {/* SAKLAR TOGGLE BOT ON / OFF */}
          <button
            onClick={handleToggleBot}
            disabled={isTogglingBot}
            className={`btn-bot-switch ${botActive ? "switch-on" : "switch-off"}`}
            title="Klik untuk mengaktifkan atau menjeda bot"
          >
            <Icons.Power size={13} />
            <span>
              {isTogglingBot
                ? "Memproses..."
                : botActive
                ? "SAKLAR: BOT AKTIF"
                : "SAKLAR: BOT JEDA (OFF)"}
            </span>
          </button>

          <span className="meta-badge pulse-green">
            ● ADAFAKTA.WEB.ID SYNCED
          </span>
          <span className="meta-badge pulse-blue">
            ● TELEGRAM PAGER ONLINE
          </span>
          <span className="meta-badge">PERSONA: KRITIS & TEGAS</span>
        </div>
      </div>

      {/* 2. OPERATIONAL METRICS RIBBON (LIGHT) */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">TOTAL BERITA DIPANTAU</span>
            <div className="metric-icon-wrap">
              <Icons.Radar size={18} />
            </div>
          </div>
          <div className="metric-value">{metrics.totalMonitored}</div>
          <div className="metric-desc">Arus berita terdeteksi di database</div>
        </div>

        <div className="metric-card highlight-green">
          <div className="metric-header">
            <span className="metric-label">DISETOR KE ADAFAKTA</span>
            <div className="metric-icon-wrap">
              <Icons.Inbox size={18} />
            </div>
          </div>
          <div className="metric-value">{metrics.totalTransferred}</div>
          <div className="metric-desc">Bahan draf liputan di meja redaksi</div>
        </div>

        <div className="metric-card highlight-blue">
          <div className="metric-header">
            <span className="metric-label">TELEGRAM DISPATCH</span>
            <div className="metric-icon-wrap">
              <Icons.Telegram size={18} />
            </div>
          </div>
          <div className="metric-value">{metrics.totalSentTelegram}</div>
          <div className="metric-desc">Alarm intelijen terkirim ke redaktur</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">KANAL AKTIF 24/7</span>
            <div className="metric-icon-wrap">
              <Icons.Globe size={18} />
            </div>
          </div>
          <div className="metric-value">{metrics.activeFeedsCount}</div>
          <div className="metric-desc">
            {sourcesList.length > 0
              ? `${sourcesList.filter((s) => s.active).length} sumber RSS media aktif`
              : "CNBC, TechCrunch, DailySocial, Antara, BBC"}
          </div>
        </div>
      </div>

      {/* 2.1. TOPIC TREND RADAR & RUBRIK DISTRIBUTION WIDGET */}
      <div className="trends-grid">
        {/* Panel Kiri: Distribusi Rubrik Liputan */}
        <div className="trend-card">
          <div className="trend-card-header">
            <span className="trend-card-title">
              <Icons.Target size={15} /> DISTRIBUSI RUBRIK LIPUTAN
            </span>
            <span className="trend-card-subtitle">
              {initialCategoryStats.reduce((acc, curr) => acc + curr.count, 0)} Isu Terdeteksi
            </span>
          </div>

          {/* Segmented Multi-Color Progress Bar */}
          <div className="segmented-bar">
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
                  title={`${item.category}: ${item.percentage}% (${item.count} isu) - Klik untuk memfilter`}
                />
              ))
            ) : (
              <div style={{ width: "100%", backgroundColor: "#e2e8f0" }} />
            )}
          </div>

          {/* Legenda Rubrik Interaktif */}
          <div className="category-legend-grid">
            {initialCategoryStats.map((item) => (
              <button
                key={item.category}
                onClick={() => setSelectedCategory(item.category)}
                className="legend-item"
                title={`Klik untuk memfilter rubrik ${item.category}`}
              >
                <span className="legend-dot" style={{ backgroundColor: item.color }} />
                <span>{item.category}:</span>
                <span className="legend-pct">{item.percentage}%</span>
              </button>
            ))}
          </div>
        </div>

        {/* Panel Kanan: Topik Terhangat 24 Jam */}
        <div className="trend-card">
          <div className="trend-card-header">
            <span className="trend-card-title">
              <Icons.Radar size={15} /> TOPIK TERHANGAT 24 JAM
            </span>
            <span className="trend-card-subtitle">Top Entitas & Isu Media</span>
          </div>

          {/* Trending Topic Chips */}
          <div className="trend-chips-wrap">
            {initialTrendingTopics.length > 0 ? (
              initialTrendingTopics.map((item) => (
                <button
                  key={item.topic}
                  onClick={() => setSearchQuery(item.topic)}
                  className="trend-chip"
                  title={`Klik untuk menyaring "${item.topic}" di radar`}
                >
                  <span>🔥 {item.topic}</span>
                  <span className="trend-chip-count">{item.count}x</span>
                </button>
              ))
            ) : (
              <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                Belum ada kata kunci yang dominan saat ini.
              </span>
            )}
          </div>

          <span className="trend-help-text">
            * Klik salah satu topik di atas untuk menyaring radar berita secara otomatis
          </span>
        </div>
      </div>

      {/* 3. TACTICAL ACTION BAR (LIGHT) */}
      <div className="action-bar">
        <div className="action-left">
          <button
            onClick={handleTriggerScout}
            disabled={isScouting}
            className={`btn-trigger ${isScouting ? "btn-loading" : ""}`}
          >
            {isScouting ? (
              <>
                <span className="spinner"></span> Menyisir Isu Hangat...
              </>
            ) : (
              <>
                <Icons.Rocket size={16} /> LUNCURKAN LIPUTAN SEKARANG
              </>
            )}
          </button>

          <button
            onClick={() => setIsRssModalOpen(true)}
            className="btn-outline-action"
          >
            <Icons.Rss size={15} /> Kelola Kanal RSS ({sourcesList.length})
          </button>

          <button
            onClick={() => setIsKeywordModalOpen(true)}
            className="btn-outline-action"
          >
            <Icons.Target size={15} /> Fokus Topik ({keywordsList.length})
          </button>

          <a
            href="https://www.adafakta.web.id/admin/jurnalis"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-redaksi"
          >
            Meja Redaksi AdaFakta <Icons.ExternalLink size={13} />
          </a>
        </div>

        <div className="action-right">
          <div className="search-box">
            <span className="search-icon-inside">
              <Icons.Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Cari isu, figur, peristiwa kritis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* ALERT TOAST */}
      {scoutMessage && (
        <div className="scout-toast">
          <span>{scoutMessage}</span>
          <button onClick={() => setScoutMessage(null)} className="toast-close">
            <Icons.Close size={16} />
          </button>
        </div>
      )}

      {/* 4. DUAL FILTER STRIP (LIGHT) */}
      <div className="filter-container">
        {/* Baris 1: Filter Rubrik Kategori AI */}
        <div className="filter-row">
          <span className="filter-label">RUBRIK AI:</span>
          <div className="filter-pills">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`pill-btn ${selectedCategory === cat ? "pill-active" : ""}`}
              >
                {cat === "ALL" ? "Semua Rubrik" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Baris 2: Filter Sumber Kanal Berita */}
        <div className="filter-row">
          <span className="filter-label">KANAL RSS:</span>
          <div className="filter-pills">
            {sources.map((src) => (
              <button
                key={src}
                onClick={() => setSelectedSource(src)}
                className={`pill-btn ${selectedSource === src ? "pill-active" : ""}`}
              >
                {src === "ALL" ? "Semua Kanal Media" : src}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. RADAR LIVE STREAM DENGAN BATCH SELECT & DELETE */}
      <div className="radar-section">
        <div className="radar-header">
          <div>
            <h2 className="radar-title">
              <Icons.Radar size={20} /> RADAR INTELIJEN LIPUTAN (
              {filteredArticles.length} Isu)
            </h2>
            <span className="radar-subtitle">
              Urutan investigasi terbaru siap disetor ke redaksi AdaFakta
            </span>
          </div>

          {/* BATCH ACTION CONTROLS */}
          {filteredArticles.length > 0 && (
            <div className="batch-actions">
              <label className="batch-select-all">
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
                  className="btn-batch-delete"
                >
                  <Icons.Trash size={14} /> Hapus ({selectedIds.length} Terpilih)
                </button>
              )}

              <button
                onClick={handleClearAllRadar}
                disabled={isDeleting}
                className="btn-clear-all"
              >
                <Icons.Broom size={14} /> Bersihkan Semua
              </button>

              {/* KONTROL RETENSI DATA BASI */}
              <div className="retention-wrap">
                <label className="retention-label">
                  <Icons.Clock size={12} /> Retensi:
                </label>
                <select
                  value={retentionDays === null ? "disabled" : String(retentionDays)}
                  onChange={handleChangeRetention}
                  className="retention-select"
                  title="Pilih durasi retensi data basi"
                >
                  <option value="3">3 Hari</option>
                  <option value="7">7 Hari (Default)</option>
                  <option value="14">14 Hari</option>
                  <option value="30">30 Hari</option>
                  <option value="disabled">Matikan (Simpan Abadi)</option>
                </select>
                <button
                  onClick={handleManualPrune}
                  disabled={isPruning || retentionDays === null}
                  className="btn-prune-now"
                  title="Pangkas data basi berusia > batas retensi sekarang"
                >
                  <Icons.Broom size={12} /> {isPruning ? "Memangkas..." : "Pangkas Basi"}
                </button>
              </div>
            </div>
          )}
        </div>

        {filteredArticles.length === 0 ? (
          <div className="empty-radar">
            <p>Tidak ada berita di radar untuk filter saat ini.</p>
            <p className="empty-sub">
              Klik <strong>Luncurkan Liputan Sekarang</strong> untuk mulai
              menyisir berita baru.
            </p>
          </div>
        ) : (
          <div className="radar-list">
            {filteredArticles.map((article, idx) => {
              const dateObj = article.published_at || article.created_at;
              const dateStr = dateObj
                ? new Date(dateObj).toLocaleString("id-ID", {
                    timeZone: "Asia/Bangkok",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "-";

              const isChecked = selectedIds.includes(article.id);
              const isUltraPriority = article.is_priority || idx === 0;

              return (
                <div
                  key={article.id}
                  className={`intel-card ${isChecked ? "card-selected" : ""}`}
                >
                  <div className="intel-top">
                    <div className="intel-left-wrap">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSelectOne(article.id)}
                        className="custom-checkbox card-check"
                      />
                      <div className="intel-badges">
                        {isUltraPriority ? (
                          <span className="badge-priority">
                            <Icons.AlertTriangle size={12} /> ULTRA HIGH PRIORITY
                          </span>
                        ) : (
                          <span className="badge-urgency">
                            <Icons.Target size={12} /> ISU UTAMA
                          </span>
                        )}

                        <span className="badge-category">
                          #{article.category || "UMUM"}
                        </span>
                        <span className="badge-source">{article.source}</span>
                        <span className="badge-date">
                          <Icons.Clock size={12} /> {dateStr} WIB
                        </span>
                      </div>
                    </div>

                    <div className="intel-sync-status">
                      <span className="sync-pill-adafakta">
                        <Icons.CheckCircle size={12} /> Disetor ke AdaFakta
                      </span>
                      {article.sent_at && (
                        <span className="sync-pill-tele">
                          <Icons.Telegram size={12} /> Telegram OK
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="intel-title">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {article.title}
                    </a>
                  </h3>

                  <div className="intel-body">
                    <div className="intel-summary-label">
                      BEDAH FAKTA & URGENSI:
                    </div>
                    <p className="intel-summary-text">{article.summary}</p>
                  </div>

                  <div className="intel-footer">
                    <div className="intel-actions">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-source"
                      >
                        Buka Sumber Asli <Icons.ExternalLink size={12} />
                      </a>
                      <a
                        href="https://www.adafakta.web.id/admin/jurnalis"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-newsroom"
                      >
                        Buka Meja Redaksi AdaFakta <Icons.ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. MODAL KELOLA KANAL RSS */}
      {isRssModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                <Icons.Rss size={18} /> Manajemen Kanal Berita (RSS Sources)
              </h3>
              <button
                onClick={() => setIsRssModalOpen(false)}
                className="modal-close-btn"
              >
                <Icons.Close size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Form Tambah Sumber */}
              <form onSubmit={handleAddSource} className="form-group">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <input
                    type="text"
                    placeholder="Nama Media (misal: Tempo, Kompas)"
                    value={newRssName}
                    onChange={(e) => setNewRssName(e.target.value)}
                    className="form-input"
                    required
                  />
                  <select
                    value={newRssCat}
                    onChange={(e) => setNewRssCat(e.target.value)}
                    className="form-input"
                  >
                    <option value="UMUM">Rubrik: UMUM</option>
                    <option value="POLITIK">Rubrik: POLITIK</option>
                    <option value="HUKUM">Rubrik: HUKUM</option>
                    <option value="BISNIS">Rubrik: BISNIS</option>
                    <option value="TEKNO">Rubrik: TEKNO</option>
                    <option value="INTERNASIONAL">Rubrik: INTERNASIONAL</option>
                    <option value="NASIONAL">Rubrik: NASIONAL</option>
                  </select>
                </div>
                <input
                  type="url"
                  placeholder="URL RSS Feed (contoh: https://tempo.co/rss)"
                  value={newRssUrl}
                  onChange={(e) => setNewRssUrl(e.target.value)}
                  className="form-input"
                  required
                />
                <button
                  type="submit"
                  className="btn-trigger"
                  style={{ alignSelf: "flex-start", marginTop: "4px" }}
                >
                  <Icons.Plus size={15} /> Tambah Sumber RSS Baru
                </button>
              </form>

              {/* Daftar Sumber */}
              <table className="item-list-table">
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
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                          {src.url}
                        </div>
                      </td>
                      <td>
                        <span className="badge-category">#{src.category || "UMUM"}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleSource(src.id, src.active)}
                          className={`btn-small-toggle ${src.active ? "is-active" : "is-inactive"}`}
                        >
                          {src.active ? "🟢 Aktif" : "⚪ Nonaktif"}
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteSource(src.id)}
                          className="btn-small-danger"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setIsRssModalOpen(false)}
                className="btn-outline-action"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL FOKUS KATA KUNCI PRIORITAS */}
      {isKeywordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                <Icons.Target size={18} /> Fokus Topik & Kata Kunci Prioritas
              </h3>
              <button
                onClick={() => setIsKeywordModalOpen(false)}
                className="modal-close-btn"
              >
                <Icons.Close size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Berita yang mengandung kata kunci di bawah ini akan otomatis
                diprioritaskan oleh bot, diberi label{" "}
                <strong>🚨 ULTRA HIGH PRIORITY</strong>, dan dianalisis secara
                lebih mendesak.
              </p>

              {/* Form Tambah Kata Kunci */}
              <form onSubmit={handleAddKeyword} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Ketik topik (contoh: Korupsi, Pilkada, KPK, Pajak)..."
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  className="form-input"
                  style={{ flex: 1 }}
                  required
                />
                <button type="submit" className="btn-trigger">
                  <Icons.Plus size={15} /> Tambah
                </button>
              </form>

              {/* Tag Cloud Kata Kunci */}
              <div className="tag-cloud" style={{ marginTop: "12px" }}>
                {keywordsList.map((kw) => (
                  <span key={kw.id} className="keyword-tag">
                    🎯 {kw.keyword}
                    <button
                      onClick={() => handleDeleteKeyword(kw.id)}
                      className="keyword-tag-delete"
                      title="Hapus kata kunci"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setIsKeywordModalOpen(false)}
                className="btn-outline-action"
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
