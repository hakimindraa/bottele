# BLUEPRINT & RENCANA KERJA: GLOBAL AI JOURNALIST INTELLIGENCE & LIVE RADAR
## (Pencarian Berita Terhangat Multi-Kategori & Lintas Negara)

Dokumen ini memuat blueprint arsitektur, cara kerja mesin pencarian berita real-time, rancangan layout antarmuka jurnalis, serta peta jalan (roadmap) fitur untuk mengembangkan **Autonomous AI Journalist (`berita-ai`)** menjadi platform **Pusat Intelijen Berita Global & Nasional**.

---

## 1. VISI & ARAH PENGEMBANGAN REDAKSI

Aplikasi ini bertransformasi dari sekadar **pembaca RSS pasif per jam** menjadi **Autonomous Newsroom & Intelligence Radar** yang mampu:
1. **Menyisir Isu Terhangat Secara Real-Time (On-Demand Live Scout)**: Mengambil berita yang sedang terjadi detik ini dari media papan atas (Detikcom, Kompas, CNN Indonesia, Tempo, BBC, Reuters) tanpa harus menunggu jadwal cron 1 jam.
2. **Pencarian Isu Spesifik (Kasus: Greenpeace, Putusan MK, dll)**: Mencari perkembangan suatu topik secara mendalam (*deep investigative scout*) beserta komparasi sudut pandang berbagai media.
3. **Multi-Kategori & Rubrik Baru**: Menambahkan kategori krusial yang saat ini sedang menjadi sorotan dunia jurnalisme, khususnya **LINGKUNGAN & IKLIM (Climate & Conservation)**, selain Politik, Hukum, Bisnis, Tekno, dan Internasional.
4. **Cakupan Multi-Negara & Geografis**: Memungkinkan redaktur berpindah radar dengan 1 klik antara **Indonesia (Nasional)**, **Global (Dunia)**, **Amerika Serikat (US)**, **Asia-Pasifik**, dan **Eropa**.

---

## 2. PENYESUAIAN KRITIS PADA SISTEM SAAT INI

| Komponen Saat Ini | Keterbatasan | Penyesuaian Baru yang Dibutuhkan |
| :--- | :--- | :--- |
| **Pencarian (Search Input)** | Hanya memfilter artikel lokal yang *sudah ada* di database. | **Hybrid Search**: Bisa memfilter database lokal DAN memiliki tombol **"⚡ Live Scout Media"** untuk menyedot langsung dari internet. |
| **Sumber Berita (RSS Feeds)** | Baru 6 sumber umum (CNBC, BBC, Antara, TechCrunch). Tidak ada Detik & CNN. | **Pembaruan Katalog Media**: Integrasi feed resmi Detikcom, CNN Indonesia, Kompas, Tempo, plus feed global (Reuters/Al Jazeera). |
| **Klasifikasi Kategori** | Hanya 5 kategori (Politik, Hukum, Bisnis, Tekno, Nasional). | Tambahkan **LINGKUNGAN & IKLIM** (wajib untuk isu seperti Greenpeace, deforestasi, tambang, polusi). |
| **Dimensi Geografis** | Semua feed dicampur tanpa penanda negara/wilayah. | Tambahkan atribut `country_code` / `scope` (`ID`, `GLOBAL`, `US`, `EU`, `ASIA`) pada sumber dan artikel. |
| **Penyajian Berita** | Satu daftar artikel linier tanpa pembedaan sudut pandang. | **Multi-Perspective Media Grouping**: Mengelompokkan artikel dengan topik sama untuk melihat framing Detik vs Kompas vs CNN. |

---

## 3. CARA KERJA PENCARIAN BERITA TERBARU & TERHANGAT

Mekanisme pencarian ini dirancang **100% cepat, andal, dan bebas biaya API berbayar** menggunakan arsitektur **Google News RSS Multi-Region Engine + Direct Media Feed Routing**:

```
 Pengguna Mengetik Kata Kunci: "Greenpeace"
 Memilih Negara: [🇮🇩 Indonesia] | Rentang Waktu: [24 Jam Terakhir]
                        │
                        ▼
   ┌────────────────────────────────────────────────────────┐
   │ 1. API GATEWAY ROUTER (/api/scout/live-search)         │
   └────────────────────────────────────────────────────────┘
                        │
       ┌────────────────┴────────────────┐
       ▼                                 ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│ A. Portal Target Terfokus   │   │ B. Google News Engine RSS   │
│ Query: site:detik.com OR    │   │ Query: "Greenpeace"         │
│ site:kompas.com OR          │   │ Region: gl=ID & hl=id       │
│ site:cnnindonesia.com       │   │ Time Window: when:24h       │
└─────────────────────────────┘   └─────────────────────────────┘
       │                                 │
       └────────────────┬────────────────┘
                        ▼
   ┌────────────────────────────────────────────────────────┐
   │ 2. XML EXTRACTION & NORMALIZER (rss-parser)            │
   │ - Ambil: Judul, Portal Sumber, URL Asli, Timestamp     │
   │ - Bersihkan snippet HTML & ekstrak metadata            │
   │ - Filter duplikasi URL & kemiripan judul (deduplicate) │
   └────────────────────────────────────────────────────────┘
                        │
                        ▼
   ┌────────────────────────────────────────────────────────┐
   │ 3. AI JOURNALIST SYNTHESIZER (9router / Claude / GPT)  │
   │ - Bedah 3 poin fakta mendesak                          │
   │ - Deteksi entitas utama (Tokoh/Lembaga terkait)        │
   │ - Klasifikasi rubrik otomatis (misal: LINGKUNGAN)      │
   │ - Identifikasi sudut pandang / framing media           │
   └────────────────────────────────────────────────────────┘
                        │
       ┌────────────────┴────────────────┐
       ▼                                 ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│ 4. TAMPILAN DASHBOARD       │   │ 5. TELEGRAM INSTANT DISPATCH│
│ Hasil muncul instan di tab  │   │ Opsi 1-klik untuk broadcast │
│ "⚡ Live Intelligence"       │   │ ringkasan ke redaksi Telegram│
└─────────────────────────────┘   └─────────────────────────────┘
```

### Format Query Mesin Pencarian:
1. **Pencarian Nasional Real-time (Semua Media Indonesia):**
   ```text
   https://news.google.com/rss/search?q={keyword}+when:24h&hl=id&gl=ID&ceid=ID:id
   ```
2. **Pencarian Khusus Media Raksasa (Detik + Kompas + CNN):**
   ```text
   https://news.google.com/rss/search?q={keyword}+(site:detik.com+OR+site:kompas.com+OR+site:cnnindonesia.com)+when:24h&hl=id&gl=ID&ceid=ID:id
   ```
3. **Pencarian Isu Global / Internasional:**
   ```text
   https://news.google.com/rss/search?q={keyword}+when:24h&hl=en-US&gl=US&ceid=US:en
   ```

---

## 4. DESAIN STRUKTUR LAYOUT WEB (EDITORIAL INTELLIGENCE DASHBOARD)

Tata letak antarmuka dirancang untuk efisiensi tinggi seorang jurnalis / redaktur:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. HEADER UTAMA REDAKSI                                                                  │
│  [🛰️ BERITA-AI JOURNALIST COMMAND CENTER]        [🔴 BOT: AKTIF] [🌐 SUMBER] [🎯 TARGETS]│
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. REGIONAL / COUNTRY SWITCHER TABS                                                      │
│  [🇮🇩 INDONESIA (UTAMA)]   [🌍 GLOBAL]   [🇺🇸 AMERIKA]   [🇪🇺 EROPA]   [🌏 ASIA-PASIFIK]    │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. LIVE SEARCH & INTELLIGENCE SCOUT BAR                                                  │
│  ┌───────────────────────────────────────────────────┐ ┌──────────────┐ ┌──────────────┐│
│  │ 🔍 Cari topik hangat (contoh: Greenpeace, IKN, MK)│ │ ⏱️ 24 Jam    │ │ ⚡ TELUSURI  ││
│  └───────────────────────────────────────────────────┘ └──────────────┘ └──────────────┘│
│  Topik Hangat Hari Ini: [🔥 Greenpeace (14)] [🔥 Pilkada (11)] [🔥 Subsidi BBM] [🔥 KPK] │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. WIDGET RADAR TREN & MEDIA BREAKDOWN (24 Jam Terakhir)                                │
│  ┌───────────────────────────────────────┐ ┌──────────────────────────────────────────┐ │
│  │ 📊 DISTRIBUSI RUBRIK LIPUTAN          │ │ ⚖️ VOLUME SUMBER MEDIA HARI INI          │ │
│  │ [Politik 30% | Lingkungan 25% | Bisnis]│ │ Detik (16) | CNN (12) | Kompas (10)      │ │
│  └───────────────────────────────────────┘ └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 5. RUBRIK FILTER BAR                                                                     │
│  [SEMUA] [🌱 LINGKUNGAN] [🏛️ POLITIK] [⚖️ HUKUM] [💼 BISNIS] [🚀 TEKNO] [🌐 INTERNASIONAL]│
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 6. DUAL STREAM INTELLIGENCE VIEW (Tampilan 2 Kolom atau Tab Switcher)                    │
│                                                                                          │
│  ┌───────────────────────────────────────────┐ ┌───────────────────────────────────────┐ │
│  │ ⚡ KOLOM A: LIVE SCOUT HASIL INTERNET     │ │ 🗄️ KOLOM B: ARSIP MONITORING REDAKSI │ │
│  │ (Berita Terhangat Baru Ditemukan)         │ │ (Tersimpan & Terdokumentasi di DB)    │ │
│  │                                           │ │                                       │ │
│  │ 🟢 [Detikcom] 15 menit lalu               │ │ 📁 [Antara] 1 jam lalu                │ │
│  │ "Aksi Damai Greenpeace di Depan ESDM..."  │ │ "KPK Periksa 5 Saksi Dugaan Korupsi.."│ │
│  │ 💡 AI Sintesis: Aktivis menuntut...       │ │ 💡 Ringkasan Analisis Investigasi     │ │
│  │ [📲 Kirim Telegram] [💾 Simpan ke Radar]  │ │ [✅ Sudah Terkirim ke Telegram]       │ │
│  │                                           │ │                                       │ │
│  │ 🔵 [CNN Indonesia] 35 menit lalu          │ │ 📁 [CNBC] 2 jam lalu                  │ │
│  │ "Respons Menteri Terhadap Laporan Iklim.."│ │ "Nilai Tukar Rupiah Melemah Imbas.."  │ │
│  │ 💡 AI Sintesis: Pemerintah berjanji...    │ │ 💡 Ringkasan Analisis Finansial       │ │
│  │ [📲 Kirim Telegram] [💾 Simpan ke Radar]  │ │ [✅ Sudah Terkirim ke Telegram]       │ │
│  └───────────────────────────────────────────┘ └───────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. REKOMENDASI FITUR BARU

### Fitur 1: "Live Deep Scout" (Pencarian Berita Terhangat Lintas Portal)
* **Deskripsi:** Form input cerdas di bagian atas dashboard yang memungkinkan user mengetikkan topik apa pun (seperti `Greenpeace`), memilih cakupan negara (Indonesia atau Luar Negeri), lalu menekan tombol **"⚡ Telusuri Media"**.
* **Output:** Sistem langsung menyajikan 5–10 artikel terbaru dari Detik, Kompas, CNN, Tempo, dsb yang terbit dalam 24 jam terakhir, lengkap dengan ringkasan poin kritis instan dari AI.

### Fitur 2: Rubrik Khusus "Lingkungan & Iklim (Environment)"
* **Deskripsi:** Menjadikan isu lingkungan hidup (AMDAL, deforestasi, transisi energi, polusi, aktivisme lingkungan) sebagai rubrik resmi berdampingan dengan Politik, Hukum, dan Bisnis.
* **Output:** Semua berita bertopik Greenpeace, Walhi, BMKG, polusi udara, tambang, otomatis diklasifikasikan ke kategori `LINGKUNGAN` dengan aksen warna hijau emerald (`#059669`).

### Fitur 3: Switcher Negara & Wilayah (Regional News Pulse)
* **Deskripsi:** Tab pemilih wilayah cepat di bawah header:
  * 🇮🇩 **Indonesia (Nasional)**: Pantauan Detik, CNN Indo, Kompas, Antara, Tempo, CNBC Indo.
  * 🌍 **Global / Internasional**: Pantauan Reuters, BBC World, Al Jazeera, AP News.
  * 🇺🇸 **Amerika Serikat**: Pantauan The Washington Post, NYT, Bloomberg.
* **Output:** Memungkinkan jurnalis memantau isu lokal maupun perkembangan geopolitik dunia tanpa berpindah aplikasi.

### Fitur 4: Multi-Perspective Media Angle (Komparasi Framing Berita)
* **Deskripsi:** Fitur analisis AI yang mendeteksi perbedaan narasi media pada isu yang sama:
  * Misal isu *Greenpeace*:
    * *Detikcom* fokus pada fakta di lapangan dan potensi kemacetan / ketertiban.
    * *Kompas* fokus pada data saintifik dan kerusakan lingkungan.
    * *CNN Indonesia* fokus pada pernyataan sanggahan pejabat pemerintah.
* **Output:** Membantu redaktur menyusun liputan investigasi yang berimbang (*cover both sides*).

### Fitur 5: "1-Click Telegram Broadcast & Save to Archive"
* **Deskripsi:** Pada setiap kartu hasil Live Scout, terdapat dua tombol tindakan cepat:
  1. `📲 Kirim ke Telegram`: Langsung memformat ringkasan jurnalis dan mengirimkannya ke channel/grup Telegram redaksi.
  2. `💾 Simpan ke Database`: Memasukkan artikel tersebut secara permanen ke database Postgres Neon untuk diarsipkan.

---

## 6. RENCANA TAHAPAN IMPLEMENTASI (ROADMAP)

### Tahap 1: Backend Live Search Engine & Multi-Source Feeds
1. Tambahkan kanal resmi **Detikcom** (`https://news.detik.com/rss`) dan **CNN Indonesia** (`https://www.cnnindonesia.com/nasional/rss`) ke seeding `lib/schema.ts`.
2. Buat utilitas pencarian real-time `lib/liveSearch.ts` yang memproses parameter Google News RSS (keyword, timeframe, region `hl`/`gl`).
3. Buat endpoint API `/api/scout/live-search` yang memadukan ekstraksi berita, deduplikasi, dan ringkasan AI via 9router.

### Tahap 2: Penambahan Kategori "LINGKUNGAN" & Klasifikasi AI
1. Perbarui prompt sistem di `lib/summarize.ts` untuk mengenali rubrik `LINGKUNGAN`.
2. Tambahkan filter kategori `LINGKUNGAN` di [CommandCenterView.tsx](file:///e:/porto/bottele/berita-ai/app/CommandCenterView.tsx) dengan styling badge hijau emerald.

### Tahap 3: Antarmuka UI Live Scout & Regional Switcher
1. Rombak bilah pencarian menjadi **Super Scout Bar** (Input kata kunci + Pilihan Waktu + Tombol Live Scout).
2. Tambahkan tab **Regional Switcher** (Indonesia vs Global).
3. Bangun panel hasil **Live Scout Intelligence Cards** dengan tombol kirim Telegram dan simpan ke database.

### Tahap 4: Verifikasi & Pengujian Lapangan
1. Uji pencarian langsung topik riil seperti `"Greenpeace"`, `"Pilkada"`, dan `"KPK"`.
2. Verifikasi kecepatan respons (<3 detik untuk live fetching).
3. Pastikan format pesan Telegram rapi dan link rujukan aktif.
