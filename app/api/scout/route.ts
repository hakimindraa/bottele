import { NextResponse } from "next/server";
import { runDailyDigest } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    let targetCategory: string | undefined;
    try {
      const body = await req.json();
      if (body && body.category) {
        targetCategory = String(body.category).toUpperCase();
      }
    } catch {
      // Body kosong / tidak dikirimkan, gunakan mode default
    }

    const result = await runDailyDigest(targetCategory);
    const tierMsg = result.freshnessTier ? ` [${result.freshnessTier}]` : "";
    const categoryName = targetCategory ? `rubrik ${targetCategory}` : "semua rubrik";
    return NextResponse.json({
      success: true,
      message: `Liputan ${categoryName} berhasil dijalankan${tierMsg}: ${result.fetched} berita terdeteksi.`,
      result,
    });
  } catch (error) {
    console.error("Manual scout trigger error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menjalankan liputan",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
