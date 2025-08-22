import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.cron(
  'applyAllReferralDiscount',
  '30 18 24 * *', // 日本時間の毎月25日の午前3時30分（UTC）
  internal.tenant.referral.action.cronApplyReferralDiscount
)

// 予約データの日次移行バッチ処理
crons.cron(
  'migrateReservationData',
  '0 17 * * *', // 日本時間の毎日午前2時（UTC 17:00 = JST 02:00）
  internal.migration.action.runDailyMigration
)

// ポイント付与バッチ処理（毎時間実行）
crons.interval(
  'point award batch processor',
  { minutes: 60 }, // 1時間ごと
  internal.point.action.cronApplyPointAward
)

// ポイント有効期限処理（毎日午前3時実行）
crons.cron(
  'point expiration processor', 
  '0 18 * * *', // 日本時間の毎日午前3時（UTC 18:00 = JST 03:00）
  internal.point.action.processPointExpirations
)

// 期限切れpending予約のクリーンアップ（1時間間隔で実行）
crons.interval(
  'cleanup expired pending reservations',
  { minutes: 60 }, // 1時間ごと
  internal.reservation.payment.cleanupExpiredPendingReservations
)

// 予約リマインダー送信（1時間間隔で実行）
crons.interval(
  'send hourly reservation reminders',
  { minutes: 60 }, // 1時間ごと
  internal.reservation.action.sendHourlyReminders
)

// ✅ COMPLETED: トラッキングデータ集計機能はSupabaseに完全移行済み
// 実装: supabase/migrations/20250821000001_tracking_daily_cleanup_integration.sql
// Supabase実行中: 'daily-tracking-aggregation-with-cleanup' (15 17 * * *)

export default crons
