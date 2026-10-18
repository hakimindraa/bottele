import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ids, all } = body;

    // Hapus seluruh radar berita
    if (all === true) {
      await sql`DELETE FROM articles;`;
      return NextResponse.json({
        success: true,
        message: "Seluruh radar berita berhasil dibersihkan",
      });
    }

    // Hapus artikel terpilih
    if (Array.isArray(ids) && ids.length > 0) {
      const validIds = ids.map((id) => Number(id)).filter((id) => !isNaN(id));
      if (validIds.length === 0) {
        return NextResponse.json({ error: "ID artikel tidak valid" }, { status: 400 });
      }

      const placeholders = validIds.map((_, i) => `$${i + 1}`).join(",");
      await sql.query(`DELETE FROM articles WHERE id IN (${placeholders})`, validIds);

      return NextResponse.json({
        success: true,
        count: validIds.length,
        message: `${validIds.length} berita berhasil dihapus dari radar`,
      });
    }

    return NextResponse.json({ error: "Parameter ids atau all tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("Gagal menghapus artikel:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
