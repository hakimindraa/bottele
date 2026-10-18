import { sql } from "@/lib/db";

export async function getRetentionDays(): Promise<number | null> {
  try {
    const rows = await sql`
      SELECT value FROM system_settings WHERE key = 'retention_days' LIMIT 1;
    `;
    if (rows && rows.length > 0) {
      const val = rows[0].value;
      if (val === "disabled" || val === "0") {
        return null;
      }
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 7 : parsed;
    }

    // Default ke 7 hari jika belum pernah diatur
    await sql`
      INSERT INTO system_settings (key, value) VALUES ('retention_days', '7')
      ON CONFLICT (key) DO NOTHING;
    `;
    return 7;
  } catch (error) {
    console.error("Gagal membaca retention_days:", error);
    return 7;
  }
}

export async function setRetentionDays(days: number | "disabled"): Promise<void> {
  const valStr = days === "disabled" ? "disabled" : String(days);
  try {
    await sql`
      INSERT INTO system_settings (key, value) VALUES ('retention_days', ${valStr})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `;
  } catch (error) {
    console.error("Gagal menyimpan retention_days:", error);
    throw error;
  }
}

export async function pruneOldArticles(
  overrideDays?: number
): Promise<{ deletedCount: number; retentionDays: number | null }> {
  try {
    const days = overrideDays !== undefined ? overrideDays : await getRetentionDays();

    // Jika retensi dimatikan, tidak ada yang dihapus
    if (days === null || days <= 0) {
      return { deletedCount: 0, retentionDays: null };
    }

    // Hapus hanya berita yang BUKAN prioritas dan lebih tua dari rentang waktu retensi
    const intervalStr = `${days} days`;
    const deletedRows = await sql`
      DELETE FROM articles
      WHERE (is_priority IS NOT TRUE)
        AND created_at < NOW() - ${intervalStr}::INTERVAL
      RETURNING id;
    `;

    const count = deletedRows.length;
    if (count > 0) {
      console.log(`[Auto-Prune] Berhasil menghapus ${count} berita berusia > ${days} hari.`);
    }

    return { deletedCount: count, retentionDays: days };
  } catch (error) {
    console.error("Error during pruneOldArticles:", error);
    throw error;
  }
}
