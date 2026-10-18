# REVISI RENCANA KERJA: REDESAIN LIGHT MODE & EKSPANSI JURNALIS COMMAND CENTER

Dokumen ini memuat revisi menyeluruh untuk proyek **Autonomous AI Journalist (`berita-ai`)**, yang mencakup:
1. **Redesain Antarmuka ke Light Mode (Tema Redaksi Editorial Bersih & Elegan)**
2. **Standardisasi Ikon Ringan (Mengganti emoji dengan Inline SVG Vector kustom, 0kb bundle tambahan)**
3. **5 Fitur Ekspansi Strategis**:
   - 📱 Kontrol Bot Dua Arah via Telegram (Webhook & Commands)
   - 🌐 Manajemen Kanal Berita Dinamis (RSS Manager di Dashboard)
   - 🎯 Radar Fokus Topik & Kata Kunci Prioritas (Topic Targeting)
   - ☀️ Morning Executive Briefing (Rangkuman Pagi Pukul 07.00 WIB)
   - 🏷️ Kategori Otomatis AI (AI Categorization & Filter Pills)

---

## 1. MOCKUP DESAIN LAYOUT BARU (EDITORIAL LIGHT THEME)

Berikut rancangan visual antarmuka Command Center dalam mode **Editorial Light Mode**:

![Mockup Editorial Light Command Center](file:///C:/Users/akem/.gemini/antigravity-ide/brain/414a4911-f538-4b6b-971a-3727a75c5e30/light_newsroom_layout_1792304189363.jpg)

### Konsep Desain:
* **Nuansa Redaksi Modern (*Clean Newsroom Intelligence*)**: Mengubah nuansa gelap (night mode) menjadi palet terang profesional yang nyaman di mata untuk pemantauan berita di siang hari.
* **Tipografi Berkontras Tinggi**: Menggunakan perpaduan font sans-serif modern berbobot tegas (`#0f172a`) untuk judul berita dan teks ringkasan tajam (`#334155`).
* **Visual Hierarchy**: White card berkontur lembut di atas latar belakang abu-abu terang (`#f8fafc`), dengan aksen merah jurnalisme investigatif (`#dc2626`) untuk menandai fakta mendesak.

---

## 2. SISTEM TOKEN WARNA & IKON VEKTOR RINGAN

### A. Palet Warna Light Mode (`globals.css`)

| Elemen UI | Nilai Hex / Variabel | Keterangan |
| :--- | :--- | :--- |
| **Latar Belakang Utama** | `#f8fafc` (`--bg-main`) | Slate 50 lembut, tidak silau |
| **Latar Kartu / Panel** | `#ffffff` (`--bg-card`) | Putih bersih berbayang halus |
| **Hover Kartu / Sub-panel** | `#f1f5f9` (`--bg-card-hover`) | Slate 100 untuk state interaksi |
| **Garis Pembatas (Border)** | `#e2e8f0` (`--border-subtle`) | Slate 200 tipis & rapi |
| **Garis Aksen** | `#cbd5e1` (`--border-accent`) | Slate 300 untuk elemen aktif |
| **Teks Utama** | `#0f172a` (`--text-primary`) | Slate 900 kontras tinggi |
| **Teks Ringkasan / Deskripsi** | `#334155` (`--text-secondary`) | Slate 700 mudah dibaca |
| **Teks Muted / Tanggal** | `#64748b` (`--text-muted`) | Slate 500 informatif |
| **Aksen Merah Liputan** | `#dc2626` / `#b91c1c` | Identitas berita kritis & investigatif |
| **Aksen Biru Redaksi** | `#2563eb` / `#1d4ed8` | Identitas link dan meja redaksi |
| **Aksen Hijau Status** | `#16a34a` / `#15803d` | Indikator bot & webhook aktif |
| **Aksen Kuning Urgensi** | `#d97706` / `#b45309` | Indikator isu breaking / atensi |

### B. Standardisasi Ikon Inline SVG Ringan (Zero-Weight)

Untuk menjaga aplikasi **tetap super ringan tanpa menambah beban dependensi package icon**, seluruh ikon emoji repetitif digantikan dengan komponen SVG inline kustom:

```typescript
// Contoh Ikon Ringan (0 KB Package, Skalabel & Beresolusi Tinggi)
export const Icons = {
  Radar: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
      <path d="M12 6a6 6 0 1 0 6 6M12 10a2 2 0 1 0 2 2" />
    </svg>
  ),
  Inbox: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  Telegram: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Rocket: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-2.05 11a22.25 22.25 0 0 1-3.95 2z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Globe: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Target: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
};
```

---

## 3. ARSITEKTUR STRUKTUR LAYOUT HALAMAN

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. TOP LIVE STATUS BAR (Light Slate Card)                             │
│ [● LIVE] AUTONOMOUS SCOUT RADAR: ACTIVE     [SAKLAR ON/OFF] [SYNC]    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. OPERATIONAL METRICS RIBBON (4 Clean White Cards)                    │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐ │
│ │ 178          │ │ 26           │ │ 24           │ │ 6               │ │
│ │ Berita Radar │ │ Disetor Redaksi│ │ Telegram Alert│ │ Kanal Aktif     │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ 3. ACTION & CONTROLS BAR                                               │
│ [🚀 LUNCURKAN LIPUTAN]  [🌐 KANAL RSS]  [🎯 FOKUS TOPIK]  [Cari Isu..]│
├────────────────────────────────────────────────────────────────────────┤
│ 4. DUAL FILTER STRIP (Clean Rounded Pills)                             │
│ Kategori: [Semua] [Politik] [Hukum] [Bisnis] [Tekno] [Internasional]   │
│ Sumber:   [Semua] [Antara] [CNBC] [BBC Indo] [TechCrunch] [DailySocial]│
├────────────────────────────────────────────────────────────────────────┤
│ 5. INTEL RADAR STREAM                                                  │
│ [☑ Pilih Semua]                           [🗑️ Hapus (X)] [🧹 Bersihkan] │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ☑ [🚨 ATENSI KRITIS] [POLITIK] [Antara] 18 Okt, 12:25 WIB [Synced]│ │
│ │ Sekjen FFI apresiasi dukungan PSSI dan Kemenpora                   │ │
│ │ ┌─ BEDAH FAKTA & URGENSI ────────────────────────────────────────┐ │ │
│ │ │ Menpora memberikan dukungan pendanaan dan pelatihan intensif... │ │ │
│ │ └────────────────────────────────────────────────────────────────┘ │ │
│ │ ↗ Buka Sumber Asli                   🌐 Buka Meja Redaksi AdaFakta │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. RENCANA 5 FITUR EKSPANSI (LOGIKA & DATABASE)

### 1. 📱 Kontrol Bot Dua Arah via Telegram (Webhook)
* **Endpoint Webhook**: `app/api/telegram/webhook/route.ts`
* **Fitur Perintah Chat**:
  * `/liput`: Memicu proses penyisiran berita seketika dan melaporkan ke chat.
  * `/status`: Laporan status saklar bot, jumlah berita di radar, dan setoran ke AdaFakta.
  * `/pause`: Mematikan bot (menghentikan pipeline cron secara aman).
  * `/resume`: Mengaktifkan bot kembali.
  * `/cari <kata kunci>`: Menampilkan berita terbaru yang sesuai topik.
* **Security Guard**: Verifikasi `chat.id === 6064813455` dan token secret header Telegram.

### 2. 🌐 Manajemen Kanal Berita Dinamis (Modal RSS Manager)
* **Tabel Database**:
  ```sql
  CREATE TABLE IF NOT EXISTS rss_sources (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    category TEXT DEFAULT 'UMUM',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
* **Komponen**: Modal popup `Kelola Kanal RSS` untuk menambah URL RSS media massa baru, menonaktifkan dengan saklar, atau menghapusnya.

### 3. 🎯 Radar Fokus Topik & Kata Kunci Prioritas
* **Tabel Database**:
  ```sql
  CREATE TABLE IF NOT EXISTS priority_keywords (
    id SERIAL PRIMARY KEY,
    keyword TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
* **Logika**: Berita yang memuat kata kunci prioritas otomatis ditandai `🚨 ULTRA HIGH PRIORITY`, diinvestigasi dengan prioritas tertinggi oleh AI, dan dikirimkan dengan alarm khusus ke Telegram.

### 4. ☀️ Morning Executive Briefing (Pukul 07.00 WIB)
* **Endpoint**: `GET /api/cron/morning-brief` (dipicu setiap jam 07:00 WIB oleh cron).
* **Mekanisme**: AI merangkum 5 isu terpanas dalam 24 jam terakhir menjadi satu laporan briefing eksekutif padat di Telegram untuk memandu redaksi sebelum memulai jam kerja.

### 5. 🏷️ Kategori Otomatis AI & Filter Rubrik
* Menambahkan kolom `category TEXT DEFAULT 'UMUM'` di tabel `articles`.
* AI mengklasifikasikan isu ke rubrik: `POLITIK`, `HUKUM`, `BISNIS`, `TEKNO`, `INTERNASIONAL`, `SOSIAL`.
* Filter pill kategori terpasang di antarmuka web dan metadata kategori otomatis disalurkan ke `adafakta.web.id`.

---

## 5. TAHAP EKSEKUSI (STEP-BY-STEP ROADMAP)

| Tahap | Fokus Pekerjaan | Aksi Konkret |
| :--- | :--- | :--- |
| **Fase 1** | **Redesain Light Mode & SVG Icons** | Update `app/globals.css`, pasang komponen ikon inline SVG ringan, transformasi tampilan dashboard ke Editorial Light |
| **Fase 2** | **Kategori Otomatis AI & Dual Filter** | Update kolom database `category`, perbarui prompt AI 9router, pasang filter pills rubrik di UI |
| **Fase 3** | **Manajemen Kanal RSS Dinamis** | Buat tabel `rss_sources`, endpoint `/api/sources`, dan Modal Kelola RSS di web |
| **Fase 4** | **Radar Fokus Kata Kunci Prioritas** | Buat tabel `priority_keywords`, endpoint `/api/keywords`, dan tagging `🚨 ULTRA HIGH PRIORITY` |
| **Fase 5** | **Telegram Webhook Dua Arah** | Buat route `/api/telegram/webhook`, implementasi handler perintah `/liput`, `/status`, `/pause`, `/resume`, `/cari` |
| **Fase 6** | **Morning Executive Briefing** | Buat route `/api/cron/morning-brief` dan prompt sintesis briefing pagi |
| **Fase 7** | **Pengujian & Deployment** | `npm run build`, testing lokal, commit & push ke GitHub `main` untuk live di Vercel |
