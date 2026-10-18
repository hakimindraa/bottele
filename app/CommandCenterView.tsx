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
}: {
  initialArticles: ArticleItem[];
  metrics: MetricStats;
}) {
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isScouting, setIsScouting] = useState<boolean>(false);
  const [scoutMessage, setScoutMessage] = useState<string | null>(null);

  // Daftar sumber unik untuk filter pill
  const sources = [
    "ALL",
    ...Array.from(new Set(initialArticles.map((a) => a.source))).filter(Boolean),
  ];

  // Filter artikel berdasarkan sumber & pencarian
  const filteredArticles = initialArticles.filter((article) => {
    const matchesSource =
      selectedSource === "ALL" || article.source === selectedSource;
    const matchesSearch =
      searchQuery === "" ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSource && matchesSearch;
  });

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
    } catch (err) {
      setScoutMessage("❌ Kesalahan jaringan saat memicu liputan.");
    } finally {
      setIsScouting(false);
    }
  }

  return (
    <div className="command-center">
      {/* 1. TOP LIVE STATUS BAR */}
      <div className="status-bar">
        <div className="status-indicator">
          <span className="pulse-dot"></span>
          <span className="status-title">AUTONOMOUS SCOUT RADAR: ACTIVE</span>
        </div>
        <div className="status-meta">
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

      {/* ALERT MESSAGE */}
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

      {/* 5. RADAR LIVE STREAM / INTELLIGENCE FEED */}
      <div className="radar-section">
        <div className="radar-header">
          <h2 className="radar-title">📡 RADAR INTELIJEN LIPUTAN ({filteredArticles.length} Isu)</h2>
          <span className="radar-subtitle">
            Urutan investigasi terbaru siap disetor ke redaksi
          </span>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="empty-radar">
            <p>Tidak ada berita yang cocok dengan kriteria filter saat ini.</p>
            <p className="empty-sub">
              Klik <strong>Luncurkan Liputan Sekarang</strong> untuk mengambil berita baru.
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

              return (
                <div key={article.id} className="intel-card">
                  <div className="intel-top">
                    <div className="intel-badges">
                      <span className="badge-urgency">
                        {idx < 3 ? "🚨 ATENSI KRITIS" : "⚡ ISU UTAMA"}
                      </span>
                      <span className="badge-source">{article.source}</span>
                      <span className="badge-date">🕒 {dateStr} WIB</span>
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
