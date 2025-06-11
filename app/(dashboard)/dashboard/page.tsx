import ReservationLink from '@/components/common/ReservationLink'
import ReferralCard from '@/components/common/ReferralCard'

export default async function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <ReservationLink />
      <ReferralCard />
    </div>
  )
}
