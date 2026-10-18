import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: Ambil daftar seluruh sumber RSS
export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, url, category, active, created_at
      FROM rss_sources
      ORDER BY id ASC;
    `;
    return NextResponse.json({ success: true, sources: rows });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: Tambah sumber RSS baru
export async function POST(req: Request) {
  try {
    const { name, url, category } = await req.json();
    if (!name || !url) {
      return NextResponse.json({ error: "Nama dan URL wajib diisi" }, { status: 400 });
    }

    const res = await sql`
      INSERT INTO rss_sources (name, url, category, active)
      VALUES (${name.trim()}, ${url.trim()}, ${category || "UMUM"}, true)
      ON CONFLICT (url) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
      RETURNING id, name, url, category, active;
    `;

    return NextResponse.json({ success: true, source: res[0] });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PATCH: Toggle aktif/nonaktif sumber RSS
export async function PATCH(req: Request) {
  try {
    const { id, active } = await req.json();
    if (id === undefined || active === undefined) {
      return NextResponse.json({ error: "id dan active wajib disertakan" }, { status: 400 });
    }

    await sql`
      UPDATE rss_sources
      SET active = ${Boolean(active)}
      WHERE id = ${Number(id)};
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE: Hapus sumber RSS
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id wajib disertakan" }, { status: 400 });
    }

    await sql`
      DELETE FROM rss_sources WHERE id = ${Number(id)};
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
