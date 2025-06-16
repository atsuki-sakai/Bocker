import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.cron(
  'applyAllReferralDiscount',
  '30 17 24 * *', // 日本時間の毎月25日の午前2時30分（UTC）
  internal.tenant.referral.action.cronApplyReferralDiscount
)

// 予約データの日次移行バッチ処理
// crons.cron(
//   'migrateReservationData',
//   '0 17 * * *', // 日本時間の毎日午前2時（UTC 17:00 = JST 02:00）
//   internal.reservation.migration.action.runDailyMigration
// )

export default crons
