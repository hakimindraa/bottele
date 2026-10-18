# BLUEPRINT MASTER PLAN: AI INVESTIGATIVE JOURNALIST COMMAND CENTER
*(Pusat Kendali Jurnalis AI: Radar Berita Kritis, Tegas & Terintegrasi ke Meja Redaksi AdaFakta)*

---

## 1. REPOSISI & KARAKTER UTAMA JURNALIS (PERSONA BARU)

### A. Reposisi Fungsi Web:
* **Bukan Portal Baca Publik**: Website ini adalah **Pusat Komando & Radar Liputan Redaktur (*Autonomous Newsroom Terminal*)**.
* **Misi**: Memantau ratusan arus berita 24/7, menyaring isu genting, membedah fakta secara kritis, lalu menyetorkan bahan matang ke meja redaksi `adafakta.web.id` serta mengirim alarm langsung ke Telegram Redaktur.

### B. Karakteristik Jurnalis AI: Kritis, Tegas & Mendesak (*Hard-Hitting Investigative*)
Bot ini **bukan perangkum pasif atau basa-basi**. Karakter jurnalistik yang disuntikkan ke AI:
1. **Judul Menohok & Bernada Mendesak**: Tidak memakai kalimat berputar-putar. Langsung menyoroti inti persoalan, pelanggaran, eskalasi, atau anomali.
2. **Nada Bahasa Kritis & Lugas**: Berani mempertanyakan klaim sepihak, menyoroti kontradiksi fakta, dan berpihak pada transparansi publik.
3. **Sorotan Dampak Nyata**: Fokus pada siapa yang terdampak, risiko sistemik, atau implikasi terhadap rakyat/ekonomi/hukum.
4. **Kepatuhan Faktual Mutlak**: Tetap 100% disiplin memegang fakta sumber (tanpa fabrikasi hoaks), tetapi disajikan lewat kacamata investigatif yang tajam.

---

## 2. REDESAIN TOTAL LAYOUT WEB (`app/page.tsx` & `app/globals.css`)

### A. Konsep Visual: Newsroom Terminal / Tactical Radar
* **Tema**: Dark Minimalist Tactical Command Center (Latar zinc/slate gelap, tipografi tegas dan mudah dibaca cepat, status glow indicator).
* **Fokus**: Monitoring alur intelijen berita, metrik liputan, dan trigger eksekusi instan.

### B. Wireframe Lengkap Layout Baru:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔴 LIVE RADAR  |  AI JOURNALIST COMMAND CENTER  |  adafakta.web.id sync: OK │
│ Persona: KRITIS & TEGAS  |  Waktu Server: 18 Okt 2026, 12:00 WIB            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📊 METRIK OPERASIONAL RADAR (Real-Time):                                    │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│ │ 115 Berita   │ │ 63 Disetor ke│ │ 100% Sinyal  │ │ 6 Kanal Terpantau    │ │
│ │ Terpantau 24J│ │ Meja AdaFakta│ │ Telegram OK │ │ CNBC, BBC, Antara... │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🎮 KENDALI AKSI REDAKSI:                                                    │
│ [ 🚀 LUNCURKAN LIPUTAN SEKARANG (Trigger Manual Instan) ]                   │
│ Filter Kanal: [Semua] [CNBC Finansial] [TechCrunch] [DailySocial] [Antara]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📡 RADAR BERITA KRITIS & STATUS PENYALURAN (Live Stream):                   │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 🚨 ATENSI KRITIS | 🕒 12 Menit Lalu | 📰 CNBC Indonesia                 │ │
│ │ JUDUL: ESKALASI TEPI BARAT: Diplomat Dianiaya, Hukum Internasional Jebol │ │
│ │ BEDAH FAKTA & URGENSI:                                                  │ │
│ │ Serangan fisik terhadap diplomat Eropa membongkar kegagalan perlindungan │ │
│ │ di wilayah konflik. Insiden ini bukan sekadar friksi lokal, melainkan   │ │
│ │ ancaman langsung terhadap diplomasi internasional yang mendesak sanksi. │ │
│ │                                                                         │ │
│ │ Penyaluran: [✅ Disetor ke AdaFakta] [📱 Telegram Sent]                 │ │
│ │ Aksi: [↗ Buka Sumber Asli] | [🌐 Buka di Meja Redaksi AdaFakta]         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ⚡ SOROTAN UTAMA | 🕒 30 Menit Lalu | 📰 Antara News                    │ │
│ │ JUDUL: REGULASI GIM ONLINE: Salah Sasaran Jika Hanya Salahkan Konten    │ │
│ │ BEDAH FAKTA & URGENSI:                                                  │ │
│ │ Pakar keamanan mendesak pemerintah tidak asal blokir. Titik rawan       │ │
│ │ radikalisasi berada pada celah fitur chat tertutup, bukan gimnya. Butuh │ │
│ │ pengawasan digital presisi daripada kebijakan reaktif membabi-buta.     │ │
│ │                                                                         │ │
│ │ Penyaluran: [✅ Disetor ke AdaFakta] [📱 Telegram Sent]                 │ │
│ │ Aksi: [↗ Buka Sumber Asli] | [🌐 Buka di Meja Redaksi AdaFakta]         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. PEMBARUAN SISTEM INTELIJEN TELEGRAM (TELEGRAM REDAKSI PAGER)

### A. Format Pesan Baru: Laporan Intelijen Kritis
Pesan yang masuk ke Telegram Anda akan langsung bernada tegas dan mendesak:

```text
🚨 [ATENSI REDAKSI] LAPORAN JURNALIS AI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 Sumber : CNBC Indonesia
🕒 Waktu  : 18/10/2026, 12:00 WIB
📌 Judul  : ESKALASI TEPI BARAT: Diplomat Dianiaya, Hukum Internasional Jebol

📝 Bedah Fakta Kritis:
Serangan brutal pemukim terhadap diplomat Eropa di Tepi Barat menjadi sinyal bahaya runtuhnya hukum internasional. Aksi kekerasan ini membuktikan eskalasi yang tak terkendali dan mendesak sikap tegas diplomatik global, bukan lagi sekadar retorika kecaman.

Status Meja Redaksi:
✅ Otomatis disetor ke adafakta.web.id/admin/jurnalis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### B. Tombol Cepat (*Inline Keyboard Buttons*):
* `[ 🔗 Periksa Berita Asli ]`
* `[ 📝 Meja Redaksi AdaFakta ]` $\rightarrow$ Sekali klik langsung membuka halaman `/admin/jurnalis` di HP Anda untuk segera di-*generate* menjadi artikel berita utuh!

---

## 4. PERUBAHAN TEKNIS PADA FILE-FILE PROYEK

1. **`lib/summarize.ts`**:
   - Memperbarui System Prompt agar AI menganalisis secara tegas, mendesak, menyingkirkan kalimat basa-basi, dan merumuskan judul serta fakta yang kritis.
2. **`lib/telegram.ts`**:
   - Menambahkan dukungan pengiriman `reply_markup` (Inline Keyboard Buttons) untuk tombol aksi langsung ke AdaFakta dan sumber berita.
3. **`lib/pipeline.ts`**:
   - Mengadopsi format pesan redaksi baru dengan label atensi kritis.
4. **`app/api/scout/route.ts`**:
   - Endpoint baru untuk melayani tombol *"🚀 Jalankan Liputan Sekarang"* dari dashboard web.
5. **`app/page.tsx` & `app/globals.css`**:
   - Perombakan total antarmuka web menjadi Newsroom Terminal lengkap dengan live stats, badge status, filter kanal, dan visualisasi status penyetoran.

---

## 5. HASIL AKHIR YANG AKAN DIPEROLEH
1. Anda memiliki **Pusat Komando Jurnalis Pribadi** di browser yang terlihat sangat canggih dan fungsional.
2. Anda bisa memicu riset berita kapan saja dengan sekali klik tombol di web.
3. Setiap laporan yang masuk ke Telegram berkarakter tajam, kritis, dan mendesak.
4. Bahan berita langsung mengalir otomatis ke meja redaksi `adafakta.web.id/admin/jurnalis` siap Anda terbitkan.
