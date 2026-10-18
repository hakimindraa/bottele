import { NextResponse } from "next/server";
import { pruneOldArticles } from "@/lib/retention";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const overrideDays = typeof body.days === "number" ? body.days : undefined;

    const result = await pruneOldArticles(overrideDays);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      retentionDays: result.retentionDays,
      message:
        result.retentionDays === null
          ? "Pembersihan dilewati karena retensi sedang dimatikan."
          : `Berhasil membersihkan ${result.deletedCount} berita basi berusia > ${result.retentionDays} hari (berita prioritas tetap aman).`,
    });
  } catch (error) {
    console.error("Gagal menjalankan pruning:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
