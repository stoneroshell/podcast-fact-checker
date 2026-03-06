/**
 * POST /api/claim/cache/clear
 * Clears the global claim cache so re-running the same claims uses the latest pipeline.
 */
import { NextResponse } from "next/server";
import { clearClaimCache } from "@/lib/db/claim-cache";

export async function POST() {
  try {
    const { deleted } = await clearClaimCache();
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    console.error("clearClaimCache failed:", e);
    return NextResponse.json(
      { error: "Failed to clear claim cache" },
      { status: 500 }
    );
  }
}
