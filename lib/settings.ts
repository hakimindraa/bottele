import { sql } from "@/lib/db";

export async function isBotActive(): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT value FROM system_settings WHERE key = 'bot_active' LIMIT 1;
    `;
    if (rows && rows.length > 0) {
      return rows[0].value === "true";
    }

    // Buat tabel jika belum ada
    await sql`
      CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT);
    `;
    await sql`
      INSERT INTO system_settings (key, value) VALUES ('bot_active', 'true')
      ON CONFLICT (key) DO NOTHING;
    `;
    return true;
  } catch (err) {
    // Tangani kemungkinan tabel belum dibuat
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT);
      `;
      await sql`
        INSERT INTO system_settings (key, value) VALUES ('bot_active', 'true')
        ON CONFLICT (key) DO NOTHING;
      `;
    } catch (e) {
      console.error("Gagal inisialisasi system_settings:", e);
    }
    return true;
  }
}

export async function setBotActive(active: boolean): Promise<boolean> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT);
    `;
    await sql`
      INSERT INTO system_settings (key, value)
      VALUES ('bot_active', ${active ? "true" : "false"})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `;
    return active;
  } catch (err) {
    console.error("Gagal mengubah status bot_active:", err);
    throw err;
  }
}

export async function getAiModel(): Promise<string> {
  const defaultModel = process.env.NINEROUTER_MODEL || "yet/deepseek-v4.1-flash";
  try {
    const rows = await sql`
      SELECT value FROM system_settings WHERE key = 'ai_model' LIMIT 1;
    `;
    if (rows && rows.length > 0 && rows[0].value) {
      return String(rows[0].value).trim();
    }
    return defaultModel;
  } catch (err) {
    console.warn("Gagal memuat ai_model dari system_settings:", err);
    return defaultModel;
  }
}

export async function setAiModel(model: string): Promise<string> {
  const cleanModel = model.trim();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT);
    `;
    await sql`
      INSERT INTO system_settings (key, value)
      VALUES ('ai_model', ${cleanModel})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `;
    return cleanModel;
  } catch (err) {
    console.error("Gagal menyimpan ai_model:", err);
    throw err;
  }
}
