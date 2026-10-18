import { NextResponse } from "next/server";
import { runDailyDigest } from "@/lib/pipeline";
import { isBotActive } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cek saklar aktif bot
  const active = await isBotActive();
  if (!active) {
    return NextResponse.json({
      status: "paused",
      message: "Eksekusi cron dilewati karena saklar bot jurnalis sedang OFF / dijeda oleh redaktur.",
    });
  }

  try {
    const result = await runDailyDigest();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cron execution error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
