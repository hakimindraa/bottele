# Rencana Optimasi Performa & Pencegahan Timeout Cronjob

> **Target:** Memastikan endpoint `/api/cron` selalu selesai dalam waktu 12–20 detik (jauh sebelum batas timeout 30 detik dari `cron-job.org`) sehingga status selalu **`Successful 200 OK`**.

---

## 1. Analisis Masalah

Dari riwayat log eksekusi `cron-job.org`:
- **Semua kegagalan**: Terjadi di detik ke-**`30.00 s`** dengan status **`Failed (timeout)`**.
- **Satu-satunya keberhasilan**: Terjadi saat durasi tepat di **`29.69 s`** (selisih 0.31 detik dari batas pemutusan).

### Bottleneck (Penyebab Waktu > 30 Detik):
1. **Hardcoded `LIMIT 6` pada Kueri Antrean**:
   Pada kueri partisi rubrik di `lib/pipeline.ts`:
   ```sql
   SELECT id, source, title, url, published_at, summary, sent_at, created_at, category, is_priority
   FROM ranked_articles
   WHERE rank_in_cat <= 1
   ORDER BY is_priority DESC, published_at DESC NULLS LAST
   LIMIT 6; -- Terlalu banyak memproses hingga 6 artikel sekaligus dalam 1 run!
   ```
2. **Latensi LLM Thinking Model**:
   Model `ag/claude-opus-4-6-thinking` melakukan proses penalaran mendalam (*Chain of Thought*) selama 5–8 detik per artikel. Memproses 4–6 artikel otomatis memakan waktu $20 - 45$ detik.
3. **Paced Telegram & Webhook**:
   Jeda 1.5 detik per artikel untuk pengiriman Telegram menambah durasi $4.5 - 9$ detik.
4. **Tidak Adanya Time-Budget Guard**:
   Jika pemrosesan artikel berjalan lambat, loop terus berjalan tanpa menyadari bahwa batas 30 detik `cron-job.org` hampir terlampaui.

---

## 2. Rencana Solusi & Optimasi

```
[ cron-job.org Trigger ]
           │
           ▼
[ Start Timer: 0s ]
           │
           ▼
[ Fetch RSS Cepat & Simpan DB ] (~2 - 3 detik)
           │
           ▼
[ Ambil Antrean Adil: LIMIT MAX_ARTICLES_PER_RUN = 3 ]
   - 1 Artikel Teranyar Rubrik A
   - 1 Artikel Teranyar Rubrik B
   - 1 Artikel Teranyar Rubrik C
           │
           ▼
[ Loop Pemrosesan dengan Time-Budget Guard (Maks 22s) ]
   ├── Artikel 1: AI Summarize + Setor AdaFakta + Telegram (~5s)
   ├── Cek Waktu: < 22s? Ya ──> Lanjut Artikel 2 (~5s)
   ├── Cek Waktu: < 22s? Ya ──> Lanjut Artikel 3 (~5s)
   └── Cek Waktu: > 22s? ────> Break Loop Aman (Cegah Timeout!)
           │
           ▼
[ Respon HTTP 200 OK ke cron-job.org ] (Selesai pada detik ke 14 - 18s)
```

---

## 3. Rincian Teknis Implementasi

### A. Terapkan Batas Kuota Dinamis `${maxArticles}` (Default = 3)
Di file [`lib/pipeline.ts`](file:///e:/porto/bottele/berita-ai/lib/pipeline.ts):
- Ubah `LIMIT 6` hardcoded menjadi:
  ```sql
  LIMIT ${maxArticles};
  ```
  Di mana `const maxArticles = Math.min(Number(process.env.MAX_ARTICLES_PER_RUN) || 3, 3);`
- **Keuntungan**:
  - Tetap mempertahankan asas **Fair Category Distribution** (1 Tekno, 1 Politik, 1 Bisnis, dll. yang paling baru).
  - Mengurangi beban proses dari 6 artikel menjadi maksimal 3 artikel per siklus 3 jam.

### B. Tambahkan *Time-Budget Guard* (Batas Waktu Aman 22 Detik)
Di dalam loop pemrosesan artikel pada `lib/pipeline.ts`:
```typescript
const startTime = Date.now();
const MAX_TIME_BUDGET_MS = 22000; // 22 detik batas aman

for (const article of pendingArticles) {
  // Jika total waktu sudah melampaui 22 detik, hentikan loop artikel berikutnya
  // agar cronjob sempat merespons 200 OK sebelum detik ke-30
  if (Date.now() - startTime > MAX_TIME_BUDGET_MS) {
    console.warn(`[Pipeline] Time-budget guard aktif (>22s). Menghentikan antrean agar cron tidak timeout.`);
    break;
  }

  // Proses AI summarize, AdaFakta, Telegram, Webhook...
}
```
- **Jaminan**: Server tidak akan pernah menyentuh detik ke-30. Sisa artikel yang belum diproses akan otomatis dilanjutkan pada putaran cron berikutnya.

### C. Proteksi Timeout pada Pembacaan Feed RSS (`lib/rss.ts`)
Di fungsi pemanggilan RSS:
- Beri batas *timeout* pembacaan RSS maksimal 4 detik per feed, sehingga jika ada salah satu portal media (misal server media lokal) yang sedang lambat/down, tidak akan menyandera seluruh eksekusi cron.

---

## 4. Estimasi Pengurangan Waktu

| Tahapan Eksekusi | Sebelum Optimasi (6 Artikel) | Setelah Optimasi (2–3 Artikel) |
| :--- | :--- | :--- |
| **Fetch 9+ RSS Feeds** | 3 – 5 detik | 2 – 3 detik |
| **AI Summarize (LLM Thinking)** | 20 – 40 detik (4-6 artikel) | 8 – 14 detik (2-3 artikel) |
| **Paced Telegram & Webhooks** | 6 – 9 detik | 3 – 4.5 detik |
| **Total Waktu Eksekusi** | **35 – 50 detik (TIMEOUT ❌)** | **14 – 20 detik (SUKSES 200 OK ✅)** |

---

## 5. Pertanyaan & Validasi
Apakah Anda setuju dengan rencana di atas:
1. Membatasi kuota eksekusi cron menjadi maksimal 3 artikel terhangat per panggilan?
2. Memasang *Time-Budget Guard* 22 detik sebagai jaring pengaman anti-timeout?

> [!NOTE]
> Belum ada perubahan kode yang dilakukan. Setelah Anda menyetujui rencana ini, implementasi akan segera dijalankan.

