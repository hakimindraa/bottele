import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      url,
      source = "Portal Berita",
      publishedAt,
      snippet = "",
      summary = "",
      category = "UMUM",
      isPriority = false,
    } = body;

    if (!title || !url) {
      return NextResponse.json(
        { success: false, error: "Title dan URL wajib disertakan" },
        { status: 400 }
      );
    }

    const pubDate = publishedAt ? new Date(publishedAt) : new Date();

    const result = await sql`
      INSERT INTO articles (source, title, url, published_at, summary, category, is_priority)
      VALUES (${source}, ${title}, ${url}, ${pubDate.toISOString()}, ${summary || snippet}, ${category}, ${isPriority})
      ON CONFLICT (url) DO UPDATE
      SET summary = COALESCE(articles.summary, EXCLUDED.summary),
          category = EXCLUDED.category
      RETURNING id;
    `;

    return NextResponse.json({
      success: true,
      message: "Berita berhasil disimpan ke radar arsip redaksi",
      id: result[0]?.id,
    });
  } catch (error) {
    console.error("Gagal menyimpan live article:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menyimpan artikel ke database",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
