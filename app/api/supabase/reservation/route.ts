const BATCH_SIZE = 5000;
const MAX_RETRIES = 3;
import { NextRequest, NextResponse } from "next/server";
import { supabaseServiceRole } from "@/services/supabase/SupabaseService";
import { api } from "@/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Doc, Id } from "@/convex/_generated/dataModel";

/**
 * Convex 予約データをカーソルベースで取得するヘルパー
 */
async function fetchConvexReservations(afterId: Id<"reservation"> | undefined, limit: number) {
  try {
    return await fetchQuery(api.sync.reservation.syncReservationToSupabase, { afterId, limit });
  } catch (error) {
    console.error("Error fetching from Convex:", error);
    throw new Error(`Convex fetch failed: ${error}`);
  }
}

/* ───────────────── Supabase helpers ────────────────── */

async function upsertReservations(records: Doc<"reservation">[]) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const { error } = await supabaseServiceRole
      .from("reservation")
      .upsert(records, { onConflict: "id" });

    if (!error) return; // success
    if (attempt === MAX_RETRIES) throw error;

    //指数バックオフ
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }
}

/* ───────────────── Main handler ────────────────── */

export async function POST(req: NextRequest) {
  try {
    const search = new URL(req.url).searchParams;
    const batchId = search.get("batchId") ?? crypto.randomUUID();
    const afterIdParam = search.get("afterId");
    const afterId = afterIdParam ? (afterIdParam as Id<"reservation">) : undefined;

    // 1️⃣ Convex からデータ取得
    const { reservations, nextCursor, isDone } = await fetchConvexReservations(afterId ? afterId : undefined, BATCH_SIZE);

    if (reservations.length === 0 || isDone) {
      return NextResponse.json({ batchId, status: "completed", processed: reservations.length });
    }

    // 2️⃣ Supabase へ UPSERT
    await upsertReservations(reservations);

    // 3️⃣ 次チャンク自己呼び出し
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL!}/api/supabase/reservation?batchId=${batchId}&afterId=${nextCursor}`,
      { method: "POST" }
    ).catch(console.error);

    return NextResponse.json({
      batchId,
      processed: reservations.length,
      nextCursor,
      status: "running",
    });
  } catch (err) {
    console.error("[sync-reservation] error", err);
    return NextResponse.json(
      { error: "Batch processing failed" },
      { status: 500 }
    );
  }
}