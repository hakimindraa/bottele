import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendToAdafakta } from "@/lib/adafakta";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID artikel wajib diisi" },
        { status: 400 }
      );
    }

    const rows = await sql`
      SELECT id, title, source, url, published_at, summary, category
      FROM articles
      WHERE id = ${id}
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Artikel tidak ditemukan" },
        { status: 404 }
      );
    }

    const art = rows[0];
    const adafaktaSuccess = await sendToAdafakta({
      title: String(art.title),
      source: String(art.source),
      url: String(art.url),
      published_at: art.published_at as any,
      summary: String(art.summary || ""),
      category: String(art.category || "UMUM"),
    });

    if (!adafaktaSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Gagal menyetor ke AdaFakta. Pastikan ADAFAKTA_API_URL dan ADAFAKTA_API_KEY valid.",
        },
        { status: 502 }
      );
    }

    await sql`
      UPDATE articles
      SET is_synced_adafakta = true
      WHERE id = ${id};
    `;

    return NextResponse.json({
      success: true,
      message: "Berita berhasil disetor ke Meja Redaksi AdaFakta (adafakta.web.id)!",
    });
  } catch (error) {
    console.error("Gagal sync manual ke AdaFakta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan internal saat menyetor ke AdaFakta",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
