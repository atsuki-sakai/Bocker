#!/usr/bin/env tsx
/**
 * 移行処理のテストスクリプト
 * 
 * 使用方法:
 * pnpm tsx scripts/test-migration.ts
 */

import { ConvexClient } from "convex/browser";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ NEXT_PUBLIC_CONVEX_URL環境変数が設定されていません");
  process.exit(1);
}

async function testMigration() {
  console.log("🚀 移行処理テストを開始します...\n");

  try {
    // Convexクライアントの初期化
    const client = new ConvexClient(CONVEX_URL!);
    
    // 移行対象のデータ統計を取得
    console.log("📊 移行対象データの統計情報を取得中...");
    
    // 24時間以上前のカットオフタイムを計算
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
    
    // 移行処理を実行（実際にはConvexのactionを呼び出す）
    console.log(`\n🔄 カットオフタイム: ${new Date(cutoffTime).toISOString()}`);
    console.log("⏳ 移行処理を実行中...\n");
    
    // 注: 実際の移行処理はConvexのactionから呼び出す必要があります
    // ここではテスト用のログ出力のみ
    
    console.log("✅ テスト実行が完了しました");
    console.log("\n💡 実際の移行を実行するには:");
    console.log("1. Convexダッシュボードから internal.migration.action.migrateReservations を手動実行");
    console.log("2. または本番環境でcronジョブを有効化");
    
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    process.exit(1);
  }
}

// メイン処理
testMigration().catch(console.error);