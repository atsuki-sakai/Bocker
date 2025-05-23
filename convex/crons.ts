import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.cron(
  'applyAllReferralDiscount',
  '30 17 24 * *', // 日本時間の毎月25日の午前2時30分（UTC）
  internal.tenant.referral.action.cronApplyReferralDiscount
)

// crons.cron(
//   'processReservationBatch',
//   '0 0 * * *', // 日本時間の毎日午前0時00分（UTC）
//   internal.reservation.action.processReservationBatch,
//   {
//     afterId: undefined
//   }
// )
export default crons
