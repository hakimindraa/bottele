# BLUEPRINT & RANCANA REDESAIN UI: EDITORIAL BROAD SHEET (ANTI-AI SLOP)
## Meja Redaksi Intelijen Jurnalisme • AdaFakta Command Center

Dokumen ini merinci rencana transformasi total (*full redesign*) antarmuka web **Berita AI / AdaFakta Command Center**. Desain ini mengadopsi gaya **Editorial Broadsheet Klasik** (estetika surat kabar investigasi berwibawa seperti *The New York Times*, *Tempo Investigasi*, dan *Financial Times*), menghapus 100% pola tampilan *AI slop / generic SaaS dashboard*, serta menyiapkan ruang khusus untuk kanal **Berita Teknologi (Tech News Exclusive)**.

---

## 1. ELIMINASI "AI SLOP" & TEMPLATE TELLS

Berdasarkan pedoman `.agents/skills/no-ai-slop` (`SKILL.md` & `TELLS.md`), berikut daftar elemen lama yang **dihapus total**:

| Elemen Lama (AI Slop / Generic Template) | Solusi Desain Baru (Editorial Broadsheet) |
| :--- | :--- |
| **Emoji sebagai Ikon Chrome** (`⚡`, `🔥`, `🚨`, `🎯`, `📰`, `🌍`) | Dihapus total. Navigasi menggunakan tipografi kuat, label aksi tegas (*action verbs*), dan garis pemisah tegas. |
| **Kotak Metrik Seragam ("Feature Soup")** (4 card identik di atas) | Diganti menjadi **Data Ribbon Redaksi** yang terintegrasi di bawah masthead koran dengan angka `tabular-nums`. |
| **Pill Badges Berwarna-warni Bertumpuk** | Diganti sistem etiket redaksi minimalis: tag teks datar (*uppercase tracking*), border hairline tipis, kontras tinggi. |
| **Bayangan Kabur Lembut (*Soft Blurry Shadows*)** | Nol bayangan kabur (`box-shadow: none`). Pemisahan ruang 100% menggunakan ruang negatif (*whitespace*) dan garis hairline tipis 1px. |
| **Sudut Melengkung Berlebihan (`rounded-xl` / 12-16px)** | Sudut tegas berkarakter (*crisp radius* 2px–4px atau kotak *square* 0px) khas surat kabar fisik. |
| **Font Sistem Generik Tanpa Karakter** | Dipasang font kurasi resmi: **Archivo** (Display & Chrome) + **Plus Jakarta Sans** (Body & Intisari) + **Newsreader / Serif** untuk headline artikel. |
| **Tumpukan Form Pencarian Terpisah-pisah** | Disatukan ke dalam **Editorial Sidebar** yang terstruktur rapi. |

---

## 2. SISTEM DESAIN (DESIGN TOKENS & TYPOGRAPHY)

### A. Tipografi (Typography Stack)
- **Masthead & Navigasi**: `Archivo` (Weight: 800/900, uppercase, tracking: `0.05em`). Memberikan kesan kepala berita (*broadsheet masthead*) yang tegas, solid, dan berwibawa.
- **Judul Artikel (Headlines)**: `Newsreader` (Serif elegan, weight 700, optical sizing). Mengusung karakter jurnalisme tempo dulu yang matang dan mudah dibaca cepat.
- **Body & Intisari Berita**: `Plus Jakarta Sans` (Weight: 400 & 500, font-size: 15px, line-height: 1.6, color: `#1c1917`). Nyaman untuk membaca investigasi panjang tanpa kelelahan mata.
- **Data & Timestamp**: `Archivo` / `Plus Jakarta Sans` dengan `font-variant-numeric: tabular-nums`.

### B. Palet Warna & Permukaan (Color & Surfaces)
- **Kertas Dasar (*Newsprint Paper*)**: `#ffffff` (Area kerja utama) dengan latar belakang luar `#f9fafb` atau `#f4f4f5`.
- **Tinta Utama (*Deep Ink*)**: `#111827` (Hitam pekat alami surat kabar).
- **Tinta Sekunder (*Muted Ink*)**: `#4b5563` (Kontras tinggi, lolos uji aksesibilitas WCAG AAA).
- **Garis Hairline (*Rules*)**: `#e5e7eb` (Pemisah artikel) dan `#111827` (Garis pembatas edisi masthead 2px solid).
- **Satu Aksen Redaksi (*Single Accent*)**: **Editorial Crimson** (`#b91c1c` / `#991b1b`) — digunakan secara sangat selektif hanya untuk berita berkategori *Breaking / Prioritas Tinggi* dan indikator aktif.

---

## 3. STRUKTUR TATA LETAK UI (EDITORIAL BROAD SHEET WIREFRAME)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📰 MASTHEAD: ADAFAKTA INTELLIGENCE RADAR            [Edisi: 3 Nov 2026]     │
│ [STATUS: SISTEM MEMANTAU 24/7]       [SAKLAR BOT: AKTIF]   [MEJA REDAKSI ↗]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ DATA RIBBON:  142 Berita Terpantau  │  48 Masuk Redaksi  │  6 Kanal RSS     │
├─────────────────────────────────────────────────────────────────────────────┤
│ KANAL UTAMA:                                                                │
│ [ SEMUA LIPUTAN ]   [ ⚡ RADAR TEKNOLOGI ]   [ INVESTIGASI ]   [ BISNIS ]   │
├───────────────────────────────────────────────────┬─────────────────────────┤
│ KOLOM UTAMA (65%): ARUS INTELIJEN LIPUTAN         │ KOLOM KANAN (35%):      │
│                                                   │ PUSAT PENCARIAN & TREN  │
│ ┌───────────────────────────────────────────────┐ │ ┌─────────────────────┐ │
│ │ BERITA UTAMA (LEAD STORY / PRIORITAS)         │ │ │ PENELUSURAN LIVE    │ │
│ │ Kategori: LINGKUNGAN • Tempo • 12 mnt lalu    │ │ │ [Cari isu/figur...] │ │
│ │ Judul: Kebijakan Transisi Energi 2026 dan     │ │ │ [Rentang: 24 Jam]   │ │
│ │ Dampaknya Terhadap Industri Tambang           │ │ │ [Wilayah: ID/Global]│ │
│ │                                               │ │ │ [Tombol Telusuri]   │ │
│ │ Intisari Redaksi:                             │ │ └─────────────────────┘ │
│ │ Tiga poin krusial hasil penelusuran fakta...  │ │                         │
│ │                                               │ │ ┌─────────────────────┐ │
│ │ [ Setor ke AdaFakta ]  [ Baca Sumber Asli ↗ ] │ │ │ ISU HANGAT 24 JAM   │ │
│ └───────────────────────────────────────────────┘ │ │ 1. Greenpeace (14x) │ │
│ ───────────────────────────────────────────────── │ │ 2. Pilkada (11x)    │ │
│                                                   │ │ 3. Subsidi BBM (8x) │ │
│ ┌───────────────────────────────────────────────┐ │ └─────────────────────┘ │
│ │ DAFTAR BERITA BERIKUTNYA (2 KOLOM GRID)       │ │                         │
│ │                                               │ │ ┌─────────────────────┐ │
│ │ [ ] Politik • CNN      │ [ ] Bisnis • CNBC    │ │ │ KELOLA KANAL & KATA │ │
│ │ Judul Berita Kedua...  │ Judul Berita Ketiga..│ │ │ [Kanal RSS (6)]     │ │
│ │ Ringkasan singkat...   │ Ringkasan singkat... │ │ │ [Kata Kunci (12)]   │ │
│ │ [Setor] [Sumber]       │ [Setor] [Sumber]     │ │ │ [Pangkas Basi]      │ │
│ └───────────────────────────────────────────────┘ │ └─────────────────────┘ │
└───────────────────────────────────────────────────┴─────────────────────────┘
```

---

## 4. RANCANGAN KHUSUS: KANAL BERITA TEKNOLOGI (TECH RADAR)

Pengguna meminta penambahan pencarian dan penyaringan khusus **Berita Teknologi** yang **terisolasi penuh (tidak tercampur dengan berita politik/umum)**.

### Arsitektur Pemisahan di UI:
1. **Dedicated Navigation Tab ("RADAR TEKNOLOGI")**:
   - Di baris rubrik atas, tombol `RADAR TEKNOLOGI` memiliki penanda khusus.
   - Saat tab ini ditekan:
     - **Mode Aktif**: UI beralih ke *Tech Intelligence Mode*.
     - **Filter Otomatis**: Memfilter semua data feed di halaman agar hanya menampilkan berita berkategori `TEKNO` atau sumber berfokus teknologi (misal: *TechCrunch*, *DailySocial*, *The Verge*, *Wired*, *Ars Technica*, *Kompas Tekno*, *DetikINET*).
     - **Politik Terfilter 100%**: Berita politik, hukum pidana, pilkada tidak akan muncul sama sekali di layar saat mode ini aktif.
2. **Dedicated Search Input untuk Teknologi**:
   - Saat berada di tab Teknologi, placeholder pencarian otomatis berubah:
     `"Telusuri perkembangan AI, semikonduktor, startup, gadget..."`
   - Parameter pencarian di API langsung mengunci scope ke topik teknologi saja.
3. **Penyimpanan Sumber RSS Khusus Teknologi**:
   - Sumber berita teknologi dikelompokkan ke grup rubrik `TEKNO` sehingga mudah ditambah/dinonaktifkan tanpa mengganggu kanal berita politik.

---

## 5. RENCANA KERJA EKSEKUSI (STEP-BY-STEP WORKFLOW)

*(Hanya akan dijalankan setelah mendapatkan persetujuan pengguna)*

1. **Langkah 1: Setup Font Google di `app/layout.tsx`**
   - Mengimpor `Archivo` (display sans), `Newsreader` (editorial serif untuk judul berita), dan `Plus Jakarta Sans` (body text) via `next/font/google`.
   - Mengatur variabel CSS font di tag `<html>` atau `<body>`.
2. **Langkah 2: Perombakan Total `app/globals.css`**
   - Menghapus 2.300+ baris CSS lama yang penuh dengan styling AI-slop (gradien, bayangan lembut berulang, glow, animasi pulse berlebihan).
   - Menulis arsitektur CSS modular berbasis variabel desain Broadsheet (hairlines, typography contrast, grid asimetris).
3. **Langkah 3: Restrukturisasi `app/CommandCenterView.tsx`**
   - Mengganti header lama dengan Masthead Broadsheet resmi.
   - Membagi tata letak menjadi 2 kolom (65% News Stream + 35% Control Sidebar).
   - Menyiapkan tab filter `RADAR TEKNOLOGI` eksklusif.
   - Mengganti tampilan kartu berita menjadi *Editorial News Cards* dengan hirarki teks yang tajam.
4. **Langkah 4: Uji Responsif Mobile (375px+)**
   - Memastikan tampilan di smartphone beralih secara anggun ke single-column tanpa overflow horizontal.
   - Memastikan tombol aksi memiliki target sentuh nyaman (minimal 44px) dan kontras memenuhi standar WCAG AA/AAA.

---
*Status: DRAF RENCANA SIAP TINJAU (Menunggu persetujuan pengguna sebelum implementasi).*

