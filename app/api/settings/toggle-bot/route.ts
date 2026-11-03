import { NextResponse } from "next/server";
import { isBotActive, setBotActive } from "@/lib/settings";
import { runDailyDigest } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function GET() {
  const active = await isBotActive();
  return NextResponse.json({ active });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let targetState: boolean;

    if (typeof body.active === "boolean") {
      targetState = body.active;
    } else {
      const current = await isBotActive();
      targetState = !current;
    }

    const updated = await setBotActive(targetState);

    // Jika bot diaktifkan ke status ON, segera jalankan penyisiran perdana di latar belakang
    if (updated === true) {
      (async () => {
        try {
          await runDailyDigest();
        } catch (e) {
          console.error("[Auto-Scout ON] Gagal menjalankan penyisiran perdana:", e);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      active: updated,
      message: updated
        ? "Radar AKTIF 24/7: Memulai penyisiran & penyetoran terstruktur per rubrik ke AdaFakta..."
        : "Radar DIJEDA (OFF): Seluruh pemantauan dan penyetoran otomatis dihentikan.",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Gagal mengubah status bot" },
      { status: 500 }
    );
  }
}
