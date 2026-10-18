import { NextResponse } from "next/server";
import { isBotActive, setBotActive } from "@/lib/settings";

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
    return NextResponse.json({
      success: true,
      active: updated,
      message: updated
        ? "Bot jurnalis AKTIF (berjalan sesuai jadwal)"
        : "Bot jurnalis DIJEDA (seluruh liputan otomatis berhenti)",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Gagal mengubah status bot" },
      { status: 500 }
    );
  }
}
