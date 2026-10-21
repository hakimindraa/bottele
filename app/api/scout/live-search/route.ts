import { NextResponse } from "next/server";
import { executeLiveSearch, LiveSearchParams } from "@/lib/liveSearch";
import { summarize } from "@/lib/summarize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      query,
      region = "ID",
      timeRange = "24h",
      mediaScope = "all",
      limit = 10,
      synthesizeAi = true,
    } = body as LiveSearchParams & { synthesizeAi?: boolean };

    if (!query || !query.trim()) {
      return NextResponse.json(
        { success: false, error: "Parameter 'query' wajib diisi" },
        { status: 400 }
      );
    }

    const items = await executeLiveSearch({
      query,
      region,
      timeRange,
      mediaScope,
      limit,
    });

    // Jika AI synthesis diaktifkan, berikan ringkasan jurnalis pada 2 artikel teratas
    if (synthesizeAi && items.length > 0) {
      const topItems = items.slice(0, 2);
      await Promise.all(
        topItems.map(async (item) => {
          try {
            const aiRes = await summarize({
              title: item.title,
              snippet: item.snippet,
              url: item.url,
              isPriority: item.isPriority,
            });
            if (aiRes.summary) {
              item.summary = aiRes.summary;
              if (aiRes.category && aiRes.category !== "UMUM") {
                item.category = aiRes.category;
              }
            }
          } catch (e) {
            console.warn(`Gagal meringkas artikel live ${item.title}:`, e);
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      query,
      region,
      timeRange,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Live search API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal melakukan live search",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
