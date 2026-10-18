import { NextResponse } from "next/server";
import { generateMorningBriefing } from "@/lib/briefing";
import { isBotActive } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cek apakah bot sedang aktif
  const active = await isBotActive();
  if (!active) {
    return NextResponse.json({
      status: "paused",
      message: "Briefing pagi dilewati karena saklar bot jurnalis sedang OFF / dijeda.",
    });
  }

  try {
    const brief = await generateMorningBriefing();
    return NextResponse.json({
      success: true,
      message: "Executive Morning Briefing berhasil dikirim ke Telegram",
      contentLength: brief.length,
    });
  } catch (error) {
    console.error("Morning brief error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
