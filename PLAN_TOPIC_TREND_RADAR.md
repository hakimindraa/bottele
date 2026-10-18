# RENCANA KERJA: RADAR TREN ISU & FREKUENSI RUBRIK (TOPIC TREND RADAR RINGAN)

Dokumen ini memuat arsitektur, kalkulasi analitik, antarmuka visual, dan alur kerja implementasi untuk fitur **Radar Tren Isu & Frekuensi Rubrik (Topic Trend Radar Ringan)** pada proyek **Autonomous AI Journalist (`berita-ai`)**.

---

## 1. TUJUAN & NILAI TAMBAH REDAKSI

### Nilai Utama:
* Memberikan ringkasan eksekutif secara visual (*visual intelligence*) dalam 3 detik mengenai arah isu dan fokus pemberitaan media massa dalam 24 jam terakhir.
* **0 KB Ekstra Dependensi (Zero-Weight Chart)**: Tidak mengimpor pustaka grafik yang berat (seperti Chart.js atau Recharts ratusan KB). Seluruh visualisasi menggunakan **Pure CSS Segmented Progress Bar & Inline SVG Mini-Badges** yang langsung ter-render dalam milidetik.
* **Interaktif & Terhubung**:
  1. Klik pada segmen rubrik ➔ otomatis memfilter radar berita ke rubrik tersebut.
  2. Klik pada chip kata kunci trending ➔ otomatis mengisi kotak pencarian (*Search Input*) untuk menyaring berita terkait.

---

## 2. ARSITEKTUR STRUKTUR VISUAL WIDGET

Widget ini ditempatkan tepat di bawah **4 Kartu Metrik Operasional** dan di atas **Tactical Action Bar**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 2. OPERATIONAL METRICS RIBBON                                          │
│ [178 Berita Radar]  [26 Disetor Redaksi]  [24 Telegram]  [6 Kanal RSS] │
├────────────────────────────────────────────────────────────────────────┤
│ 2.1. 📈 WIDGET RADAR TREN ISU & FREKUENSI (24 JAM TERAKHIR)            │
│ ┌───────────────────────────────────┐ ┌──────────────────────────────┐ │
│ │ 📊 DISTRIBUSI RUBRIK LIPUTAN      │ │ 🔥 TOPIK TERHANGAT 24 JAM    │ │
│ │                                   │ │                              │ │
│ │ [████████|██████|████|███|██]     │ │ [PSSI (8x)]  [Prabowo (7x)]  │ │
│ │ • Politik: 35% (14 isu)           │ │ [Futsal (5x)] [KPK (4x)]     │ │
│ │ • Bisnis : 25% (10 isu)           │ │ [Gas Industri (4x)]          │ │
│ │ • Tekno  : 20% (8 isu)            │ │                              │ │
│ │ • Lainnya: 20% (8 isu)            │ │ *Klik topik untuk filter isu │ │
│ └───────────────────────────────────┘ └──────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ 3. TACTICAL ACTION BAR                                                 │
│ [🚀 LUNCURKAN LIPUTAN]  [🌐 KANAL RSS]  [🎯 FOKUS TOPIK]  [Cari Isu..]│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. MEKANISME KALKULASI DATA (SERVER-SIDE EFFICIENCY)

Kalkulasi analitik dilakukan di sisi server (`app/page.tsx`) saat data dimuat, sehingga tidak membebani browser pengguna:

### A. Distribusi Rubrik (Category Aggregation)
Mengambil agregasi jumlah artikel per kategori dalam rentang waktu 24 jam terakhir:
```sql
SELECT 
  COALESCE(UPPER(category), 'UMUM') as category,
  count(*)::int as count
FROM articles
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY category
ORDER BY count DESC;
```
Hasil dikonversi ke persentase:
$$\text{Persentase} = \left(\frac{\text{Jumlah per Rubrik}}{\text{Total Berita 24 Jam}}\right) \times 100\%$$

### B. Ekstraksi Topik Terhangat (Trending Keywords Extraction)
1. Server mengambil judul semua artikel yang masuk dalam 24 jam terakhir.
2. Memfilter daftar kata henti umum (*stopwords* bahasa Indonesia & Inggris seperti: *dan, di, ke, dari, yang, ini, itu, untuk, pada, ada, dengan, the, in, of, and, dll.*).
3. Menghitung frekuensi kata bermakna (panjang kata $\ge 4$ karakter, nama entitas, atau kata kunci prioritas).
4. Mengembalikan **5 kata kunci teratas** dengan frekuensi kemunculan tertinggi.

---

## 4. RANCANGAN ANTARMUKA & DESAIN (LIGHT MODE EDITORIAL)

### A. Panel Kiri: Distribusi Rubrik (Category Distribution)
* **Visual Stacked Progress Bar**: Satu baris garis melengkung (*rounded multi-color bar*) yang terbagi menjadi segmen warna rubrik:
  * Politik: Merah (`#dc2626`)
  * Bisnis: Kuning Emas (`#d97706`)
  * Tekno: Biru (`#2563eb`)
  * Hukum: Ungu (`#7e22ce`)
  * Internasional: Biru Langit (`#0284c7`)
  * Nasional / Umum: Abu Slate (`#64748b`)
* **Daftar Legenda**: Setiap rubrik memiliki persentase dan badge jumlah isu yang dapat diklik langsung untuk memfilter radar.

### B. Panel Kanan: Topik Terhangat 24 Jam (Trending Keywords Pulse)
* **Interactive Pulse Chips**: Tag-tag chip bergaya clean editorial dengan aksen api oranye lembut (`#fff7ed` dengan border `#fed7aa`).
* **Interaksi Klik**: Saat redaktur mengeklik salah satu chip (misal: `PSSI`), sistem otomatis:
  1. Mengisi kolom input pencarian dengan kata tersebut.
  2. Menyaring radar berita seketika untuk menampilkan seluruh investigasi terkait topik tersebut.

---

## 5. FILE YANG DIBUAT & DIMODIFIKASI

| File | Tipe | Peran & Modifikasi |
| :--- | :--- | :--- |
| `lib/analytics.ts` | **Baru** | Fungsi kalkulasi: `getCategoryDistribution(articles)` dan `getTrendingKeywords(articles)` |
| `app/page.tsx` | **Modifikasi** | Menghitung data analitik distribusi & trending, lalu meneruskannya sebagai props |
| `app/CommandCenterView.tsx` | **Modifikasi** | Menambahkan komponen visual widget di bawah ribbon metrik dengan event handler interaktif |
| `app/globals.css` | **Modifikasi** | Menambahkan kelas styling `.trends-grid`, `.trend-card`, `.segmented-bar`, `.trend-chip`, dll. |

---

## 6. TAHAPAN EKSEKUSI (STEP-BY-STEP ROADMAP)

1. **Tahap 1: Utilitas Analitik (`lib/analytics.ts`)**
   * Buat algoritma pembersihan kata henti (*stopwords*) dan penghitungan frekuensi kata kunci serta persentase kategori.
2. **Tahap 2: Pengambilan Data Server (`app/page.tsx`)**
   * Integrasikan pembacaan data 24 jam terakhir dan kirimkan ke komponen tampilan.
3. **Tahap 3: Desain Styling Light Mode (`app/globals.css`)**
   * Tambahkan CSS untuk kartu analitik ganda, multi-segment progress bar, dan chip topik interaktif.
4. **Tahap 4: Integrasi Komponen UI (`app/CommandCenterView.tsx`)**
   * Pasang widget di bawah 4 kartu metrik dengan kemampuan klik untuk memfilter rubrik dan kata kunci pencarian.
5. **Tahap 5: Verifikasi Build & Pengujian Tampilan**
   * Eksekusi `npm run build` dan ambil tangkapan layar browser untuk memastikan tampilan presisi dan responsif.
