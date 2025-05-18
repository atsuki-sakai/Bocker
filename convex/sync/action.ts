// convex/sync/action.ts
import { internalAction } from "@/convex/_generated/server";
import { v } from "convex/values";
import { api, internal } from "@/convex/_generated/api";
import { supabaseAdmin } from "@/services/supabase/SupabaseService";
import { Id, Doc } from "@/convex/_generated/dataModel";

/**
 * CamelCase のキーを snake_case に変換するユーティリティ関数
 *
 * @param key - 変換前のキー文字列（例: "startTimeUnix"）
 * @returns スネークケース化されたキー（例: "start_timeUnix"）
 */
function camelToSnake(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/__+/g, "_")
    .toLowerCase();
}

/**
 * snake_case のキーを camelCase に変換するユーティリティ関数
 *
 * @param key - 変換前のキー文字列（例: "start_timeUnix"）
 * @returns キャメルケース化されたキー（例: "startTimeUnix"）
 */
function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * 任意のレコードオブジェクトのキーと値を一括変換する汎用関数
 *
 * @template T - 入力レコードの型
 * @param record - 変換前のオブジェクト（例: Convex ドキュメントや Supabase Row）
 * @param keyMap - キー変換関数（例: camelToSnake や snakeToCamel）
 * @param opts - オプション設定
 *   @param opts.stringifyArrays - 真の場合、配列またはオブジェクトを JSON 文字列化する
 *   @param opts.dateToIso       - 真の場合、Date オブジェクトを ISO 文字列に変換する
 * @returns 変換後のオブジェクト（キーは keyMap による変換済み、必要に応じて値も JSON 化／ISO 化）
 */
export function convertConvexToSupabaseRecord<T extends Record<string, any>>(
  record: T,
  isSnakeToCamel: boolean,
  opts: { stringifyArrays?: boolean; dateToIso?: boolean } = {}
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [rawKey, rawVal] of Object.entries(record)) {
    const key = isSnakeToCamel ? snakeToCamel(rawKey) : camelToSnake(rawKey);
    let val: any = rawVal;

    // Date を ISO 文字列に変換
    if (opts.dateToIso && rawVal instanceof Date) {
      val = rawVal.toISOString();
    }
    // 配列またはオブジェクトを JSON 文字列に変換（JSONB カラム用）
    else if (
      opts.stringifyArrays &&
      (Array.isArray(rawVal) || (typeof rawVal === "object" && rawVal !== null))
    ) {
      val = JSON.stringify(rawVal);
    }

    result[key] = val;
  }
  return result;
}

    
export const processReservationBatch = internalAction({
  args: {
    afterId: v.optional(v.id("reservation")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { afterId, limit = 500 }): Promise<{
    processed: number;
    nextCursor: Id<"reservation"> | undefined;
    isDone: boolean;
  }> => {
    try {
      // ① Convex からバッチ取得
      const { reservations, nextCursor, isDone } = await ctx.runQuery(
        api.sync.query.syncReservationToSupabase,
        { cursor: afterId, limit }
      );
      if (reservations.length === 0) {
        return { processed: 0, nextCursor: undefined, isDone };
      }

      // Convexから取得したreservationsをSupabase用に変換
      const payloads = reservations.map((rec: Doc<"reservation">) => {
        const convertedTable = convertConvexToSupabaseRecord(rec, false, { stringifyArrays: true, dateToIso: true });
        const {
          _creation_time: rawCreation,
          updated_time: rawUpdated,
          _id,
          start_time_unix: rawStartTime,
          end_time_unix: rawEndTime,
          ...rest
        } = convertedTable;
        return {
          ...rest,
          _id,
          start_time_unix: rawStartTime !== undefined
            ? new Date(rawStartTime).toISOString()
            : null,
          end_time_unix: rawEndTime !== undefined
            ? new Date(rawEndTime).toISOString()
            : null,
          _creation_time: rawCreation !== undefined
            ? new Date(rawCreation).toISOString()
            : null,
          updated_time: rawUpdated !== undefined
            ? new Date(rawUpdated).toISOString()
            : null,
        };
      });
      const { error: upsertError } = await supabaseAdmin
        .from("reservation")
        .upsert(payloads, { onConflict: "_id" });
      if (upsertError) {
        throw new Error(`Supabase upsert error: ${upsertError.message}`);
      }

      // ③ Convex 側データ削除（mutation 経由）
      const ids = reservations.map((rec: Doc<"reservation">) => rec._id);
      await ctx.runMutation(internal.sync.mutation.deleteReservationBatch, { ids });

      // ④ 次バッチ自己スケジュール
      if (!isDone) {
        await ctx.scheduler.runAfter(
          0,
          internal.sync.action.processReservationBatch,
          { afterId: nextCursor ? (nextCursor as Id<"reservation">) : undefined, limit }
        );
      }

      return {
        processed: reservations.length,
        nextCursor: nextCursor ? (nextCursor as Id<"reservation">) : undefined,
        isDone
      };
    } catch (error) {
     
      await ctx.scheduler.runAfter(
        5000,
        internal.sync.action.processReservationBatch,
        { afterId, limit }
      );
      throw error;
    }
  },
});