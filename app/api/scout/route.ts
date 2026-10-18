import { NextResponse } from "next/server";
import { runDailyDigest } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const result = await runDailyDigest();
    return NextResponse.json({
      success: true,
      message: "Liputan jurnalis berhasil dijalankan",
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
