# BLUEPRINT & RENCANA KERJA: ADAPTIVE FRESHNESS FETCHING ENGINE
## Sistem Penarikan Berita Bertahap (30 Menit, 1 Jam, 1.5 Jam, 2 Jam, dst)
### Tetap Menjaga Integritas Backend Jurnalis AI & Integrasi API Meja Redaksi AdaFakta

Dokumen ini merancang arsitektur **Engine Penarikan Berita Bertahap (*Adaptive Progressive Freshness*)**. Rencana ini dirancang khusus agar asisten jurnalis AI dapat menangkap berita yang paling *terkini (menit-menit ini)* di seluruh rubrik kategori, sekaligus **menjamin 100% bahwa arsitektur backend, skema database, dan integrasi API ke meja redaksi `adafakta.web.id` tetap terlindungi, utuh, dan tidak diubah**.

---

## 1. PRINSIP UTAMA: PERLINDUNGAN BACKEND & INTEGRASI ADAFAKTA

Sesuai arahan, peran website `berita-ai` ini adalah **Asisten Meja Redaksi / Bot Jurnalis AI**. Tugasnya adalah mengumpulkan bahan berita dari media luar, menganalisis intisarinya, lalu mengimpornya ke website utama `adafakta.web.id` melalui API.

### Komponen Backend yang DILINDUNGI (TIDAK BOLEH DIUBAH):
1. **API Client AdaFakta (`lib/adafakta.ts`)**:
   * Format payload tetap: `{ title, source, url, published_at, summary, category }`.
   * Header autentikasi tetap: `x-api-key: process.env.ADAFAKTA_API_KEY`.
   * Endpoint tujuan tetap: `process.env.ADAFAKTA_API_URL` (`/api/incoming-news`).
2. **Endpoint Sinkronisasi Redaksi (`app/api/articles/sync-adafakta/route.ts`)**:
   * Tetap menggunakan logika penandaan status `is_synced_adafakta = true` di database Neon Postgres.
3. **Penyimpanan Draft di `adafakta.web.id`**:
   * Data yang masuk tetap tersimpan di tabel `jurnalis_drafts` untuk siap di-generate 1-klik oleh redaktur di panel admin `adafakta.web.id/admin/jurnalis`.
4. **Dispatcher Telegram Pager (`lib/telegram.ts`)**:
   * Tombol navigasi *"Meja Redaksi AdaFakta"* dan format pesan laporan investigasi tetap bekerja seperti biasa.

---

## 2. ARSITEKTUR ENGINE BERTAHAP (ADAPTIVE STEPPED FETCHING)

Perubahan **HANYA diterapkan pada Layer Eksternal Fetching Media** (saat menyisir feed RSS dan Google News). 

### Tangga Interval Waktu (*Stepped Ladder*):
Algoritma memeriksa selisih waktu publikasi artikel terhadap waktu saat ini (`diffMinutes = (Date.now() - pubDate) / 60000`):

| Tingkat (Step) | Rentang Waktu | Ambang Batas (*Threshold*) | Peruntukan |
| :--- | :--- | :--- | :--- |
| **Step 1 (Ultra Fresh)** | **30 Menit Terakhir** | $\le 30$ menit | Menangkap *breaking news* menit-menit ini. |
| **Step 2 (Fresh)** | **1 Jam Terakhir** | $\le 60$ menit | Berita terbit 1 jam ke belakang. |
| **Step 3 (Recent)** | **1.5 Jam Terakhir** | $\le 90$ menit | Interval transisi berita hangat. |
| **Step 4 (Current)** | **2 Jam Terakhir** | $\le 120$ menit | Cadangan liputan 2 jam terakhir. |
| **Step 5 (Extended)** | **4 Jam Terakhir** | $\le 240$ menit | Cadangan liputan setengah hari kerja. |
| **Step 6 (Full Day)** | **24 Jam Terakhir** | $\le 1440$ menit | *Safety net* penjamin feed tidak pernah kosong. |

---

## 3. ALUR KERJA LOGIKA SISTEM (FLOW DIAGRAM)

```
       [ Tombol "Tarik Berita [Kategori]" / Live Scout Ditekan ]
                                   │
                                   ▼
             [ Evaluasi Step 1: Cek Berita <= 30 Menit ]
                                   │
                ┌──────────────────┴──────────────────┐
             Ditemukan?                            Kosong (0)?
                │                                     │
                ▼                                     ▼
        Ambil Berita 30 Menit             [ Evaluasi Step 2: Cek Berita <= 60 Menit ]
        Status: "Berita 30m Baru"                     │
                                           ┌──────────┴──────────┐
                                        Ditemukan?            Kosong (0)?
                                           │                     │
                                           ▼                     ▼
                                   Ambil Berita 1 Jam      [ Evaluasi Step 3: Cek <= 90 Menit ]
                                                                 │
                                                      ┌──────────┴──────────┐
                                                   Ditemukan?            Kosong (0)?
                                                      │                     │
                                                      ▼                     ▼
                                              Ambil Berita 1.5 Jam    [ Cek 2 Jam -> 4 Jam -> 24 Jam ]
                                   │
                                   ▼
            [ Masuk ke Pipeline Analisis Jurnalis AI Biasa ]
                                   │
                                   ▼
    [ Siap Disetor ke Meja Redaksi AdaFakta (adafakta.web.id/admin/jurnalis) ]
```

---

## 4. PENERAPAN SERAGAM DI SEMUA RUBRIK KATEGORI

Algoritma bertahap ini dipasang seragam ke seluruh rubrik liputan:

1. **Rubrik TEKNO (`Radar Teknologi & AI`)**:
   * Menyisir: DetikINET, Antara Tekno, DailySocial, TechCrunch, The Verge, Google News Topic Technology.
   * Urutan: Mencari 30 menit $\rightarrow$ jika kosong cari 1 jam $\rightarrow$ 1.5 jam $\rightarrow$ 2 jam $\rightarrow$ 24 jam.
   * Menjamin redaktur AdaFakta menerima berita teknologi yang paling mutakhir.
2. **Rubrik POLITIK (`Politik & Pemilu`)**:
   * Menyisir: Detik, Kompas, CNN, Antara kategori politik secara bertahap (30m $\rightarrow$ 1h $\rightarrow$ 1.5h $\rightarrow$ 2h).
3. **Rubrik LINGKUNGAN (`Lingkungan & Iklim`)**:
   * Menyisir: Greenpeace Indonesia, isu deforestasi, transisi energi bertahap (30m $\rightarrow$ 1h $\rightarrow$ 1.5h $\rightarrow$ 2h).
4. **Rubrik HUKUM, BISNIS, & INTERNASIONAL**:
   * Menerapkan tangga interval waktu yang sama.

---

## 5. DUA TITIK INTERAKSI PADA ANTARMUKA PENGGUNA (UI)

### A. Titik 1: Live Scout di Sidebar Kanan
* Pada selector rentang waktu di form pencarian sidebar, ditambahkan opsi:
  * `⚡ 30 Menit Terakhir (Adaptive)`
  * `⏱️ 1 Jam Terakhir`
  * `⏱️ 1.5 Jam Terakhir`
  * `⏱️ 2 Jam Terakhir`
  * `📅 24 Jam Terakhir`
* Jika pengguna memilih opsi bertahap, dan 30 menit kosong, UI menampilkan pesan transparan:
  > *"Liputan 30 menit terakhir nihil. Sistem otomatis memperluas ke 1.5 jam terakhir (Ditemukan 6 berita baru)."*

### B. Titik 2: Tombol Tarik Berita di Masthead
* Tombol aksi utama di kanan atas otomatis menyesuaikan teks dan tindakannya dengan tab yang sedang aktif:
  * Di tab **Teknologi**: *"Tarik Berita Teknologi Sekarang"*
  * Di tab **Internasional**: *"Tarik Berita Internasional Sekarang"*
  * Di tab **Politik**: *"Tarik Berita Politik Sekarang"*
  * Di tab **Lingkungan**: *"Tarik Berita Lingkungan Sekarang"*
  * Di tab **Semua**: *"Luncurkan Liputan Sekarang"*
* Saat tombol ditekan, engine bertahap menyisir dari 30 menit terlebih dahulu, dan memasukkan hasil terhangat ke radar database.

---

## 6. RENCANA KERJA EKSEKUSI (STEP-BY-STEP IMPLEMENTATION)

*(Hanya dijalankan setelah mendapatkan persetujuan pengguna)*

* **Langkah 1: Perbarui Logika Filter Waktu di `lib/rss.ts`**
  * Menambahkan fungsi pembantu evaluasi timestamp bertahap: `filterByAdaptiveFreshness(items, [30, 60, 90, 120, 240, 1440])`.
  * Memastikan fungsi mengembalikan berita paling baru yang tersedia tanpa mengorbankan kecepatan.
* **Langkah 2: Integrasikan Logika Bertahap ke `lib/liveSearch.ts`**
  * Pada penelusuran Google News, jika filter bertahap aktif dan interval awal kosong, engine otomatis melangkah ke interval berikutnya sampai hasil ditemukan.
* **Langkah 3: Sinkronkan Tombol Aksi & Opsi Dropdown di `app/CommandCenterView.tsx`**
  * Menambahkan opsi 30 menit dan 1.5 jam pada dropdown rentang waktu.
  * Menghubungkan tombol aksi di masthead agar otomatis menyisir kategori yang sedang dibuka menggunakan engine bertahap.
* **Langkah 4: Pengujian & Verifikasi Build**
  * Menjalankan `npx tsc --noEmit` dan `npm run build` untuk memastikan tidak ada pemutusan dependensi atau error.
  * Memverifikasi bahwa pengiriman API ke AdaFakta (`/api/incoming-news`) tetap berjalan normal.

---
*Status Dokumen: RENCANA KERJA SELESAI DIBUAT (Menunggu instruksi pengguna sebelum implementasi).*

