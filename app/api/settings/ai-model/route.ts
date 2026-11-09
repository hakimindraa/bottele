import { NextResponse } from "next/server";
import { getAiModel, setAiModel } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const model = await getAiModel();
    return NextResponse.json({ success: true, model });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Gagal mengambil model AI aktif" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { model } = body;

    if (!model || typeof model !== "string" || !model.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama model AI wajib diisi" },
        { status: 400 }
      );
    }

    const updated = await setAiModel(model);
    return NextResponse.json({
      success: true,
      model: updated,
      message: `Model AI redaksi berhasil diperbarui: ${updated}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memperbarui model AI",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

