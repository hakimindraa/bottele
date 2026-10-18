import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: Ambil daftar kata kunci prioritas
export async function GET() {
  try {
    const rows = await sql`
      SELECT id, keyword, created_at
      FROM priority_keywords
      ORDER BY id ASC;
    `;
    return NextResponse.json({ success: true, keywords: rows });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: Tambah kata kunci prioritas baru
export async function POST(req: Request) {
  try {
    const { keyword } = await req.json();
    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ error: "Kata kunci tidak boleh kosong" }, { status: 400 });
    }

    const res = await sql`
      INSERT INTO priority_keywords (keyword)
      VALUES (${keyword.trim()})
      ON CONFLICT (keyword) DO NOTHING
      RETURNING id, keyword;
    `;

    return NextResponse.json({
      success: true,
      keyword: res[0] || { keyword: keyword.trim() },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE: Hapus kata kunci prioritas
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id wajib disertakan" }, { status: 400 });
    }

    await sql`
      DELETE FROM priority_keywords WHERE id = ${Number(id)};
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
