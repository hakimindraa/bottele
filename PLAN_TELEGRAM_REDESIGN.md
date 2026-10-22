# BLUEPRINT & RENCANA KERJA: REVAMP FULL TELEGRAM BOT INTELLIGENCE RADAR
## (Desain Layout, Interaktivitas Menu, & Kesetaraan Fitur Web Dashboard)

Dokumen ini merupakan cetak biru perbaikan total (*full overhaul*) untuk **Telegram Bot Jurnalis AI (`AdaFakta Bot`)**. Dokumen ini menjelaskan diagnosis kerusakan menu saat ini, rancangan arsitektur antarmuka chat (layout & tipografi), sistem menu ganda (*Persistent Reply Keyboard* & *Inline Action Buttons*), alur interaksi pengguna, serta pemetaan fitur agar setara dengan **Web Command Center**.

---

## 1. DIAGNOSIS MASALAH SISTEM TELEGRAM SAAT INI

Berdasarkan audit kode pada `app/api/telegram/webhook/route.ts` dan `lib/telegram.ts`:

| Gejala Masalah | Penyebab Teknis Utama | Solusi Perbaikan |
| :--- | :--- | :--- |
| **Tidak Ada Menu di Layar Chat** | Bot saat ini tidak pernah mengirimkan `reply_markup: { keyboard: [...] }` (*Persistent Reply Keyboard*). Kolom chat pengguna hanya berupa input teks polos tanpa tombol pintasan bawah. | Pasang **Persistent Bottom Reply Keyboard** yang selalu muncul di bawah layar saat user mengetik `/start` atau berinteraksi. |
| **Tombol Interaktif "Mati" / Menggantung** | File `webhook/route.ts` hanya memeriksa `if (!update.message) return;`. Update jenis `callback_query` (klik tombol inline) langsung dibuang, sehingga tombol tidak bisa merespons aksi klik. | Tambahkan **Callback Query Router** di Webhook yang menangani event klik tombol secara real-time (`answerCallbackQuery` + edit pesan). |
| **Hanya Menerima Berita Pasif (One-Way Dump)** | Bot hanya berfungsi sebagai *pager* pembuang notifikasi dari pipeline cron. Belum ada antarmuka percakapan interaktif (*conversational intelligence*). | Implementasikan **Menu Berbasis Percakapan 2 Arah** (Pencarian on-demand, filter kategori, morning brief, dan kontrol sistem). |
| **Fitur Web Belum Ada di Bot** | Fitur unggulan web seperti *Live Scout*, *Filter Kategori*, *Topik Tren*, dan *Kirim ke Meja Redaksi AdaFakta* belum bisa diakses dari Telegram. | Buat command dan tombol inline untuk **Live Scout**, **Filter Kategori**, **Trend Radar**, dan **Sinkronisasi AdaFakta** langsung dari chat. |

---

## 2. ARSITEKTUR MENU TELEGRAM DUA LAPIS (TWO-TIER MENU SYSTEM)

Agar pengguna tidak perlu menghafal perintah garis miring (`/command`), kita merancang sistem navigasi dua lapis:

```
┌───────────────────────────────────────────────────────────┐
│                    LAYAR TELEGRAM CHAT                    │
│                                                           │
│  [ Balon Chat Laporan Intelijen / Hasil Pencarian ]       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ⚡ [LIVE INTEL] • Kompas.com                        │  │
│  │ 🌱 #LINGKUNGAN                                      │  │
│  │ Judul: Kebijakan Transisi Energi 2026               │  │
│  │ Analisis AI: 3 poin dampak regulasi...              │  │
│  │                                                     │  │
│  │ [ 🌐 Baca Asli ] [ 📝 Setor AdaFakta ]              │  │  <-- LAPIS 2: INLINE KEYBOARDS
│  │ [ 🔄 Framing Media Lain ] [ 📌 Simpan Radar ]       │  │      (Aksi Kontekstual per Pesan)
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
└───────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────┐
│              LAPIS 1: PERSISTENT BOTTOM KEYBOARD          │
│              (Menu Tetap di Bawah Kolom Chat)             │
│                                                           │
│   [ ⚡ Live Scout Media ]      [ 📰 Radar Berita ]        │
│   [ 🏷️ Filter Kategori  ]      [ 📈 Topik Hangat ]        │
│   [ ☀️ Morning Brief   ]      [ ⚙️ Pusat Kendali ]        │
└───────────────────────────────────────────────────────────┘
```

### A. Lapis 1: Persistent Bottom Reply Keyboard (Menu Utama)
Tombol fisik yang selalu nangkring di bawah keyboard ponsel/desktop pengguna:
1. `⚡ Live Scout Media` : Menyisir berita terhangat langsung dari internet detik ini (On-demand).
2. `📰 Radar Berita` : Menampilkan 5 draf berita intelijen terbaru yang tersimpan di database.
3. `🏷️ Filter Kategori` : Memilih kategori spesifik (Lingkungan, Politik, Hukum, Bisnis, Tekno, dll).
4. `📈 Topik Hangat` : Menampilkan topik tren dan isu paling banyak dibahas media 24 jam terakhir.
5. `☀️ Morning Brief` : Memicu AI untuk merangkum ringkasan eksekutif pagi detik itu juga.
6. `⚙️ Pusat Kendali` : Status radar, saklar jeda/lanjutkan liputan, durasi retensi, dan pembersihan data.

### B. Lapis 2: Dynamic Inline Keyboards (Aksi Langsung di Pesan)
Setiap pesan berita atau ringkasan memiliki tombol interaktif di bawahnya:
- `[ 🔗 Buka Sumber Asli ]` : Membuka URL portal berita resmi.
- `[ 📝 Kirim ke AdaFakta ]` : Sekali klik langsung menerbitkan/menyinkronkan draf ke meja redaksi `adafakta.web.id`.
- `[ 🔄 Multi-Perspektif ]` : Membandingkan sudut pandang media lain atas topik yang sama.
- `[ 🏷️ Kategori Lain ]` / `[ ➡️ Halaman Berikutnya ]` : Navigasi cepat tanpa membanjiri chat.

---

## 3. STRUKTUR & DESAIN TATA LETAK PESAN (CHAT LAYOUT DESIGN)

Setiap jenis interaksi memiliki format visual yang konsisten, bersih, dan berstandar redaksi eksekutif menggunakan HTML parsing Telegram.

### Desain 1: Pesan Sambutan & Menu Utama (`/start` atau `/help`)
```html
🤖 <b>PUSAT KENDALI JURNALIS AI • ADAFAKTA</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Selamat datang di <b>Autonomous Newsroom Radar</b>.
Asisten intelijen yang memantau, memverifikasi, dan menyusun draf berita secara real-time.

📌 <b>PILIH MENU CEPAT DI BAWAH INI:</b>
Gunakan tombol di keyboard bawah Anda untuk navigasi instan:
• <b>⚡ Live Scout</b> : Sisir berita internet detik ini
• <b>📰 Radar Berita</b> : Pantau draf investigasi lokal
• <b>🏷️ Kategori</b> : Filter per rubrik (Lingkungan, Politik, dll)
• <b>📈 Topik Hangat</b> : Analisis klaster isu trending
• <b>☀️ Morning Brief</b> : Rangkuman eksekutif pagi
• <b>⚙️ Pusat Kendali</b> : Pengaturan & status bot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 <i>Atau langsung ketik kata kunci apa saja untuk mencari berita.</i>
```

---

### Desain 2: Kartu Berita Intelijen (Card Laporan)
Digunakan saat broadcast otomatis, hasil pencarian, maupun saat live scouting:

```html
🚨 <b>[RADAR INTELIJEN]</b> • <i>Kompas.com</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏷️ <b>Rubrik</b>  : #LINGKUNGAN  |  🌍 <b>Cakupan</b>: Indonesia
🕒 <b>Waktu</b>   : 23 Okt 2026, 08:30 WIB
📌 <b>Isu</b>     : <b>Greenpeace Desak Transparansi Data AMDAL Tambang Nikel</b>

📝 <b>Fakta Kunci & Analisis Redaksi:</b>
• Koalisi lingkungan menyoroti dampak pencemaran air di wilayah hilir pesisir.
• Pemerintah menyatakan verifikasi AMDAL telah memenuhi baku mutu lingkungan hidup.
• <i>Urgensi: Berpotensi memicu gelombang aksi unjuk rasa warga lokal akhir pekan ini.</i>

📊 <b>Status Meja Redaksi:</b>
✅ <i>Tersinkronisasi di AdaFakta</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
**Inline Buttons di bawah kartu:**
```
[ 🔗 Sumber Berita Asli (URL) ] [ 📝 Meja Redaksi AdaFakta (URL) ]
[ 🔄 Cek Perspektif Media Lain (Callback) ]
```

---

### Desain 3: Fitur "Live Scout" On-Demand (Seperti di Web)
Ketika user menekan tombol `⚡ Live Scout Media`, bot menampilkan pilihan wilayah & meminta topik:

```html
⚡ <b>LIVE SCOUT RADAR MEDIA</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Menyisir portal berita nasional & global secara real-time langsung ke internet.

Silakan pilih cakupan wilayah atau ketik langsung topik yang ingin dipantau:
```
**Inline Buttons:**
```
[ 🇮🇩 Top Nasional ] [ 🌐 Global Dunia ]
[ 🇺🇸 Amerika Serikat ] [ 🇪🇺 Eropa ] [ 🌏 Asia ]
```
Jika pengguna mengetik kata kunci: `"Greenpeace"`:
```html
🔍 <b>HASIL LIVE SCOUT: "Greenpeace" (Indonesia)</b>
<i>Menemukan 4 berita terhangat dalam 24 jam terakhir:</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. <b>[Detikcom]</b> Greenpeace Gelar Aksi Teatrikal di Depan Kementerian ESDM
   🕒 2 jam lalu • #LINGKUNGAN
   
2. <b>[Kompas.com]</b> Tanggapan Pemerintah Soal Tuntutan Audit Tambang
   🕒 4 jam lalu • #HUKUM

3. <b>[CNN Indonesia]</b> Dampak Polusi Udara dan Rekomendasi NGO Lingkungan
   🕒 6 jam lalu • #NASIONAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
**Inline Buttons di bawah hasil:**
```
[ 📥 Simpan ke Radar ] [ 📝 Analisis Mendalam AI ] [ 🔄 Segarkan Pencarian ]
```

---

### Desain 4: Panel Filter Kategori
Ketika user menekan tombol `🏷️ Filter Kategori`:

```html
🏷️ <b>PILIH KATEGORI RUBRIK BERITA</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pilih rubrik untuk memfilter laporan intelijen yang sedang aktif di radar:
```
**Inline Buttons:**
```
[ 🌱 LINGKUNGAN ] [ 🏛️ POLITIK ]
[ ⚖️ HUKUM ]      [ 💼 BISNIS ]
[ 🚀 TEKNO ]      [ 🌐 INTERNASIONAL ]
[ 🇮🇩 NASIONAL ]   [ 📋 SEMUA BERITA ]
```

---

### Desain 5: Panel Pusat Kendali (Settings & Metrics)
Ketika user menekan tombol `⚙️ Pusat Kendali`:

```html
⚙️ <b>PUSAT KENDALI OPERASIONAL BOT</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• <b>Status Bot</b>        : 🟢 AKTIF (Liputan Berjalan)
• <b>Total Berita Radar</b>: 142 artikel
• <b>Disetor Redaksi</b>   : 98 artikel
• <b>Retensi Otomatis</b>  : 7 Hari (Pembersihan aktif)
• <b>Kanal RSS Aktif</b>   : 10 Sumber media
• <b>Model Kecerdasan</b>  : Claude Opus / Gemini
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pilih tindakan cepat:
```
**Inline Buttons:**
```
[ 🔴 Jeda Bot (Pause) ] [ 🟢 Aktifkan (Resume) ]
[ 🚀 Jalankan Liputan Sekarang ] [ ☀️ Kirim Morning Brief ]
[ 🧹 Bersihkan Berita Basi (>7 Hari) ]
```

---

## 4. PEMETAAN FITUR: WEB DASHBOARD VS TELEGRAM BOT

Berikut adalah perbandingan fitur antara Web Dashboard (`app/CommandCenterView.tsx`) dan bagaimana padanannya akan diimplementasikan di Telegram Bot:

| Fitur di Web Command Center | Padanan di Telegram Bot | Status Rencana |
| :--- | :--- | :--- |
| **Pencarian Live Scout (Internet)** | Tombol `⚡ Live Scout` + respon pencarian otomatis dengan filter wilayah (ID, Global, US). | 🆕 Akan dibuat |
| **Filter Rubrik / Kategori** | Tombol `🏷️ Filter Kategori` dengan inline keyboard multi-kategori. | 🆕 Akan dibuat |
| **Topik Tren & Isu Hangat** | Tombol `📈 Topik Hangat` (menghitung klaster kata kunci terbanyak hari ini). | 🆕 Akan dibuat |
| **Executive Morning Brief** | Tombol `☀️ Morning Brief` (menghasilkan ringkasan per rubrik langsung di chat). | 🛠️ Sudah ada logic backend, tinggal pasang tombol UI |
| **Sinkronisasi AdaFakta** | Tombol Inline `[ 📝 Setor AdaFakta ]` pada setiap artikel yang belum tersinkron. | 🆕 Akan dibuat |
| **Saklar Bot ON/OFF** | Tombol Inline di menu `⚙️ Pusat Kendali` (`/pause` dan `/resume`). | 🛠️ Diperbarui ke tombol interaktif |
| **Pembersihan Data Basi (Auto-Prune)** | Tombol Inline `[ 🧹 Bersihkan Berita Basi ]` di menu Pusat Kendali. | 🛠️ Diperbarui ke tombol interaktif |
| **Navigasi Menu Cepat** | **Persistent Bottom Reply Keyboard** (selalu ada di bawah layar ponsel). | 🆕 Akan dibuat |

---

## 5. RENCANA IMPLEMENTASI TEKNIS (ROADMAP TEKNIS)

Ketika Anda menyetujui plan ini, langkah-langkah implementasi yang akan dilakukan adalah:

### Tahap 1: Ekstensi Utilitas Telegram (`lib/telegram.ts`)
- Menambahkan dukungan untuk `reply_markup: { keyboard: [...] }` (*Persistent Reply Keyboard*).
- Menambahkan fungsi `answerCallbackQuery` (menghilangkan animasi *loading spinner* Telegram saat tombol diklik).
- Menambahkan fungsi `editMessageText` (memperbarui konten pesan di tempat saat berpindah menu kategori/halaman).

### Tahap 2: Router Webhook & Callback Query (`app/api/telegram/webhook/route.ts`)
- Memecah handler webhook menjadi dua bagian:
  1. `handleTextMessage(message)` : Merespons klik tombol menu bawah & perintah teks.
  2. `handleCallbackQuery(callbackQuery)` : Merespons klik tombol inline di bawah pesan (kategori, live scout, setor AdaFakta, kontrol bot).

### Tahap 3: Modul Fitur Percakapan
- **Handler Live Scout Telegram**: Memanggil `searchLiveNews()` dari `lib/liveSearch.ts` dan memformat hasilnya ke kartu Telegram.
- **Handler Kategori Telegram**: Mengambil 3-5 artikel terbaru dari database berdasarkan kategori yang dipilih.
- **Handler Trending Topics Telegram**: Mengambil analitik dari `lib/analytics.ts` dan menyajikan 5 topik terhangat.
- **Handler Morning Brief Telegram**: Memanggil `generateMorningBriefing()` dan memformat ringkasan eksekutif pagi.

### Tahap 4: Registrasi Menu & Webhook (`app/api/telegram/setup/route.ts`)
- Memperbarui `setMyCommands` dengan daftar perintah baru.
- Memastikan `setChatMenuButton` diarahkan ke menu perintah interaktif.
- Verifikasi koneksi webhook dengan API key baru.

---

## 6. KEPUTUSAN & PERSETUJUAN
- **Status Dokumen**: Menunggu tinjauan dan konfirmasi dari Anda.
- **Tidak ada kode yang diubah/diimplementasikan** sampai Anda membaca, merevisi, atau menyetujui desain layout dan struktur menu di atas.
