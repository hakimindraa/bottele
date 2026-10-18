import { NextResponse } from "next/server";
import { getRetentionDays, setRetentionDays } from "@/lib/retention";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const days = await getRetentionDays();
    return NextResponse.json({
      success: true,
      retentionDays: days,
      status: days === null ? "disabled" : `${days} hari`,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { days } = body;

    if (days !== "disabled" && (typeof days !== "number" || days < 1)) {
      return NextResponse.json(
        { error: "Nilai hari harus berupa angka positif atau 'disabled'" },
        { status: 400 }
      );
    }

    await setRetentionDays(days);

    return NextResponse.json({
      success: true,
      retentionDays: days,
      message:
        days === "disabled"
          ? "Pembersihan otomatis data basi dinonaktifkan."
          : `Durasi retensi data basi berhasil diatur menjadi ${days} hari.`,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
