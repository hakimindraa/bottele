# RENCANA KERJA: FITUR PEMBERSIHAN OTOMATIS DATA BASI (AUTO-PRUNE RETENTION)

Dokumen ini memuat arsitektur, skema database, antarmuka pengguna, dan alur kerja implementasi untuk fitur **Auto-Prune Data Retention** pada proyek **Autonomous AI Journalist (`berita-ai`)**.

---

## 1. LATAR BELAKANG & TUJUAN

### Masalah:
* Bot jurnalis bekerja secara otonom menyisir RSS feeds 24 jam sehari, 7 hari seminggu (rata-rata 24 s.d. 72 artikel baru per hari).
* Dalam kurun waktu sebulan, database Neon Postgres akan menampung lebih dari **1.500–2.000+ baris berita** yang sebagian besar sudah basi (outdated).
* Berita basi yang menumpuk dapat:
  1. Memperlambat query pencarian dan rendering dashboard.
  2. Menghabiskan jatah penyimpanan (storage limit) pada paket database Neon.

### Solusi:
* Membangun sistem **Auto-Prune Retention** yang secara berkala dan otomatis menghapus berita lama yang berusia lebih dari **7 hari** (atau durasi retensi yang dipilih redaktur).
* **Aturan Perlindungan**: Berita yang bertanda **`is_priority = true`** (Isu Kritis & Prioritas Redaksi) **TIDAK AKAN PERNAH DIHAPUS** agar arsip investigasi berharga tetap tersimpan secara permanen.

---

## 2. ARSITEKTUR & ALUR KERJA AUTO-PRUNE

```mermaid
graph TD
    CRON[Cron Job Berkala / runDailyDigest] -->|Pemicu Rutin| PRUNE_LOGIC[Fungsi pruneOldArticles]
    USER_UI[Tombol Bersihkan di Web] -->|Manual Trigger POST| API_PRUNE[/api/articles/prune]
    TG_CMD[Telegram Chat /prune] -->|Perintah Chat| API_PRUNE

    API_PRUNE --> PRUNE_LOGIC
    PRUNE_LOGIC --> DB_SET[(system_settings: retention_days)]
    
    PRUNE_LOGIC -->|Evaluasi Kriteria| DB_ART[(Tabel articles)]
    
    subgraph "Kriteria Penghapusan Aman"
        C1[Usia > X Hari?] -->|Ya| C2[Apakah is_priority = false?]
        C2 -->|Ya| DEL[HAPUS DARI DATABASE]
        C2 -->|Tidak / Isu Prioritas| KEEP[TETAP DISIMPAN AMAN]
    end
```

---

## 3. SPESIFIKASI TEKNIS & SKEMA DATABASE

### A. Penyimpanan Pengaturan Retensi
Pengaturan durasi retensi disimpan di tabel `system_settings`:
* `key = 'retention_days'`
* `value = '7'` *(opsi: 3, 7, 14, 30, atau 'disabled')*

### B. Query Penghapusan SQL (Aman & Terproteksi)
```sql
DELETE FROM articles
WHERE (is_priority IS NOT TRUE)
  AND created_at < NOW() - (${retentionDays} || ' days')::INTERVAL;
```
> **Catatan Keamanan**:
> * Klausa `is_priority IS NOT TRUE` memastikan bahwa semua berita bertanda **🚨 ULTRA HIGH PRIORITY** akan selalu aman dan tidak terhapus.
> * Menggunakan parameter query aman (`${retentionDays}`) untuk mencegah SQL injection.

---

## 4. RANCANGAN ANTARMUKA PENGGUNA (UI DASHBOARD)

### A. Kontrol Retensi di Dashboard Command Center
Di samping tombol aksi pembersihan radar, kita menambahkan menu kontrol retensi yang elegan:

1. **Dropdown Pemilih Retensi Otomatis**:
   * Pilihan: `Retensi: 3 Hari`, `Retensi: 7 Hari (Default)`, `Retensi: 14 Hari`, `Retensi: 30 Hari`, `Matikan Retensi`.
   * Perubahan langsung disimpan ke database secara realtime tanpa perlu reload halaman.
2. **Tombol "Bersihkan Data Basi Sekarang"**:
   * Icon sapu / refresh SVG ringan.
   * Tombol cepat untuk menjalankan pembersihan langsung saat redaktur ingin memangkas data lama seketika.
   * Menampilkan toast laporan: *"Berhasil memangkas 84 berita lama berusia > 7 hari (12 berita prioritas tetap dipertahankan)."*

### B. Integrasi Perintah Telegram
Menambahkan perintah baru di webhook bot Telegram:
* **/prune**: Menjalankan proses pembersihan data basi secara instan lewat chat Telegram dan membalas jumlah artikel yang berhasil dipangkas.

---

## 5. FILE YANG DIBUAT & DIMODIFIKASI

| File | Tipe | Deskripsi Pekerjaan |
| :--- | :--- | :--- |
| `lib/retention.ts` | **Baru** | Fungsi inti: `getRetentionDays()`, `setRetentionDays()`, dan `pruneOldArticles()` |
| `app/api/settings/retention/route.ts` | **Baru** | API endpoint GET & POST untuk pengaturan jumlah hari retensi |
| `app/api/articles/prune/route.ts` | **Baru** | API endpoint pemicu eksekusi pemangkasan manual |
| `lib/pipeline.ts` | **Modifikasi** | Menjalankan `pruneOldArticles()` di setiap akhir siklus scraping harian |
| `app/api/telegram/webhook/route.ts` | **Modifikasi** | Menambahkan penanganan perintah `/prune` via Telegram |
| `app/CommandCenterView.tsx` | **Modifikasi** | Menambahkan selector retensi dan tombol aksi pemicu di antarmuka |
| `app/page.tsx` | **Modifikasi** | Memuat nilai `initialRetentionDays` saat halaman di-render |

---

## 6. TAHAP EKSEKUSI (STEP-BY-STEP ROADMAP)

1. **Tahap 1: Backend Logic & Query Retensi**
   * Buat `lib/retention.ts` berisi pembacaan setting dari database dan eksekusi query penghapusan aman.
2. **Tahap 2: API Endpoints**
   * Buat `app/api/settings/retention/route.ts` dan `app/api/articles/prune/route.ts`.
3. **Tahap 3: Otomasi Pipeline**
   * Sambungkan pemanggilan fungsi retensi ke dalam `runDailyDigest()` di `lib/pipeline.ts`.
4. **Tahap 4: Antarmuka Dashboard (Light Mode)**
   * Tambahkan dropdown retensi dan tombol "Bersihkan Data Basi Sekarang" di `app/CommandCenterView.tsx`.
5. **Tahap 5: Perintah Chat Telegram**
   * Tambahkan perintah `/prune` di `app/api/telegram/webhook/route.ts`.
6. **Tahap 6: Verifikasi & Build Testing**
   * Uji coba eksekusi dry-run dan verifikasi dengan `npm run build`.
