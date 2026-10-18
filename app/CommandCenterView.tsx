"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ArticleItem {
  id: number;
  source: string;
  title: string;
  url: string;
  published_at: string | Date | null;
  summary: string;
  sent_at: string | Date | null;
  created_at: string | Date;
}

export interface MetricStats {
  totalMonitored: number;
  totalTransferred: number;
  totalSentTelegram: number;
  activeFeedsCount: number;
}

export default function CommandCenterView({
  initialArticles,
  metrics,
  initialBotActive,
}: {
  initialArticles: ArticleItem[];
  metrics: MetricStats;
  initialBotActive: boolean;
}) {
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isScouting, setIsScouting] = useState<boolean>(false);
  const [scoutMessage, setScoutMessage] = useState<string | null>(null);

  // Saklar Bot Aktif / Jeda
  const [botActive, setBotActive] = useState<boolean>(initialBotActive);
  const [isTogglingBot, setIsTogglingBot] = useState<boolean>(false);

  // Seleksi Massal (Pilih Semua & Hapus)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Sumber unik untuk filter pills
  const sources = [
    "ALL",
    ...Array.from(new Set(initialArticles.map((a) => a.source))).filter(Boolean),
  ];

  // Filter artikel
  const filteredArticles = initialArticles.filter((article) => {
    const matchesSource =
      selectedSource === "ALL" || article.source === selectedSource;
    const matchesSearch =
      searchQuery === "" ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSource && matchesSearch;
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
        setScoutMessage(`🗑️ ${data.message}`);
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
        setScoutMessage("🧹 Seluruh radar berita telah berhasil dikosongkan.");
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
          `✅ Liputan selesai! ${data.result.fetched} berita dipantau, ${data.result.inserted} berita baru disimpan, ${data.result.sent} disetor ke AdaFakta & Telegram.`
        );
        router.refresh();
      } else {
        setScoutMessage(`⚠️ Gagal menjalankan liputan: ${data.message || data.error}`);
      }
    } catch {
      setScoutMessage("❌ Kesalahan jaringan saat memicu liputan.");
    } finally {
      setIsScouting(false);
    }
  }

  return (
    <div className="command-center">
      {/* 1. TOP LIVE STATUS BAR DENGAN SAKLAR ON/OFF */}
      <div className="status-bar">
        <div className="status-indicator">
          <span className={`pulse-dot ${botActive ? "pulse-active" : "pulse-paused"}`}></span>
          <span className="status-title">
            {botActive ? "AUTONOMOUS SCOUT RADAR: ACTIVE" : "AUTONOMOUS SCOUT RADAR: PAUSED / JEDA"}
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
            {isTogglingBot ? "Memproses..." : botActive ? "🟢 SAKLAR: BOT AKTIF" : "🔴 SAKLAR: BOT JEDA (OFF)"}
          </button>

          <span className="meta-badge pulse-green">● ADAFAKTA.WEB.ID SYNCED</span>
          <span className="meta-badge pulse-blue">● TELEGRAM PAGER ONLINE</span>
          <span className="meta-badge">PERSONA: KRITIS & TEGAS</span>
        </div>
      </div>

      {/* 2. OPERATIONAL METRICS */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">TOTAL BERITA DIPANTAU</span>
            <span className="metric-icon">📡</span>
          </div>
          <div className="metric-value">{metrics.totalMonitored}</div>
          <div className="metric-desc">Arus berita terdeteksi di database</div>
        </div>

        <div className="metric-card highlight-green">
          <div className="metric-header">
            <span className="metric-label">DISETOR KE ADAFAKTA</span>
            <span className="metric-icon">📥</span>
          </div>
          <div className="metric-value">{metrics.totalTransferred}</div>
          <div className="metric-desc">Bahan draf liputan di meja redaksi</div>
        </div>

        <div className="metric-card highlight-blue">
          <div className="metric-header">
            <span className="metric-label">TELEGRAM DISPATCH</span>
            <span className="metric-icon">⚡</span>
          </div>
          <div className="metric-value">{metrics.totalSentTelegram}</div>
          <div className="metric-desc">Alarm intelijen terkirim ke redaktur</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">KANAL AKTIF 24/7</span>
            <span className="metric-icon">🌐</span>
          </div>
          <div className="metric-value">{metrics.activeFeedsCount}</div>
          <div className="metric-desc">CNBC, TechCrunch, DailySocial, Antara, BBC</div>
        </div>
      </div>

      {/* 3. TACTICAL ACTION BAR */}
      <div className="action-bar">
        <div className="action-left">
          <button
            onClick={handleTriggerScout}
            disabled={isScouting}
            className={`btn-trigger ${isScouting ? "btn-loading" : ""}`}
          >
            {isScouting ? (
              <>
                <span className="spinner"></span> Menyisir & Menganalisis Isu Hangat...
              </>
            ) : (
              <>🚀 LUNCURKAN LIPUTAN SEKARANG</>
            )}
          </button>
          <a
            href="https://www.adafakta.web.id/admin/jurnalis"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-redaksi"
          >
            Buka Meja Redaksi AdaFakta ↗
          </a>
        </div>

        <div className="action-right">
          <input
            type="text"
            placeholder="Cari isu, figur, peristiwa kritis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* ALERT TOAST */}
      {scoutMessage && (
        <div className="scout-toast">
          <span>{scoutMessage}</span>
          <button onClick={() => setScoutMessage(null)} className="toast-close">
            ✕
          </button>
        </div>
      )}

      {/* 4. FILTER PILLS */}
      <div className="filter-scroll">
        <div className="filter-pills">
          {sources.map((src) => (
            <button
              key={src}
              onClick={() => setSelectedSource(src)}
              className={`pill-btn ${selectedSource === src ? "pill-active" : ""}`}
            >
              {src === "ALL" ? "Semua Kanal Berita" : src}
            </button>
          ))}
        </div>
      </div>

      {/* 5. RADAR LIVE STREAM DENGAN BATCH SELECT & DELETE */}
      <div className="radar-section">
        <div className="radar-header">
          <div>
            <h2 className="radar-title">📡 RADAR INTELIJEN LIPUTAN ({filteredArticles.length} Isu)</h2>
            <span className="radar-subtitle">
              Urutan investigasi terbaru siap disetor ke redaksi
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
                  🗑️ Hapus ({selectedIds.length} Terpilih)
                </button>
              )}

              <button
                onClick={handleClearAllRadar}
                disabled={isDeleting}
                className="btn-clear-all"
              >
                🧹 Bersihkan Semua
              </button>
            </div>
          )}
        </div>

        {filteredArticles.length === 0 ? (
          <div className="empty-radar">
            <p>Tidak ada berita di radar saat ini.</p>
            <p className="empty-sub">
              Klik <strong>Luncurkan Liputan Sekarang</strong> untuk mulai menyisir berita baru.
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
                        <span className="badge-urgency">
                          {idx < 3 ? "🚨 ATENSI KRITIS" : "⚡ ISU UTAMA"}
                        </span>
                        <span className="badge-source">{article.source}</span>
                        <span className="badge-date">🕒 {dateStr} WIB</span>
                      </div>
                    </div>

                    <div className="intel-sync-status">
                      <span className="sync-pill-adafakta">
                        ✅ Disetor ke AdaFakta
                      </span>
                      {article.sent_at && (
                        <span className="sync-pill-tele">
                          📱 Telegram OK
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="intel-title">
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      {article.title}
                    </a>
                  </h3>

                  <div className="intel-body">
                    <div className="intel-summary-label">BEDAH FAKTA & URGENSI:</div>
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
                        ↗ Buka Sumber Berita Asli
                      </a>
                      <a
                        href="https://www.adafakta.web.id/admin/jurnalis"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-newsroom"
                      >
                        🌐 Buka Meja Redaksi AdaFakta
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
