import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendToAdafakta } from "@/lib/adafakta";

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
    const articleSummary = summary || snippet;

    // 1. Kirim draf liputan ke meja redaksi AdaFakta (adafakta.web.id)
    let adafaktaSuccess = false;
    try {
      adafaktaSuccess = await sendToAdafakta({
        title,
        source,
        url,
        published_at: pubDate,
        summary: articleSummary,
        category,
      });
    } catch (adafaktaErr) {
      console.warn("Sinkronisasi otomatis ke AdaFakta gagal:", adafaktaErr);
    }

    // 2. Simpan atau perbarui di database lokal Postgres
    const result = await sql`
      INSERT INTO articles (source, title, url, published_at, summary, category, is_priority, is_synced_adafakta)
      VALUES (${source}, ${title}, ${url}, ${pubDate.toISOString()}, ${articleSummary}, ${category}, ${isPriority}, ${adafaktaSuccess})
      ON CONFLICT (url) DO UPDATE
      SET summary = COALESCE(articles.summary, EXCLUDED.summary),
          category = EXCLUDED.category,
          is_synced_adafakta = CASE WHEN EXCLUDED.is_synced_adafakta THEN true ELSE articles.is_synced_adafakta END
      RETURNING id;
    `;

    return NextResponse.json({
      success: true,
      message: adafaktaSuccess
        ? "Berita berhasil disimpan ke radar dan otomatis masuk ke Meja Redaksi AdaFakta!"
        : "Berita berhasil disimpan ke radar redaksi",
      id: result[0]?.id,
      adafaktaSynced: adafaktaSuccess,
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
