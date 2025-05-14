import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.daily(
  'updateAllSalonTrackingSummaries',
  { hourUTC: 0, minuteUTC: 0 }, // 毎日午前0時00分（UTC）
  internal.tracking.mutation.updateAllSalonTrackingSummaries
)

crons.cron(
  'applyAllReferralDiscount',
  '0 2 25 * *', // 毎月25日の午前2時00分（UTC）
  internal.admin.action.cronApplyReferralDiscount
)
export default crons
