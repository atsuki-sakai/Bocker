import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.daily(
  'updateAllSalonTrackingSummaries',
  { hourUTC: 16, minuteUTC: 30 }, // 日本時間の毎日午前1時00分（UTC）
  internal.tracking.mutation.updateAllSalonTrackingSummaries
)

crons.cron(
  'applyAllReferralDiscount',
  '30 17 24 * *', // 日本時間の毎月25日の午前2時30分（UTC）
  internal.salon.referral.action.cronApplyReferralDiscount
)

crons.cron(
  'triggerSupabaseSync',
  '0 0 * * *', // 日本時間の毎日午前0時00分（UTC）
  internal.sync.action.processReservationBatch,
  {
    afterId: undefined
  }
)
export default crons
