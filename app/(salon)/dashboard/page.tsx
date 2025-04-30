import { ReservationLink, ReferralCard } from '@/components/common'
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <ReservationLink />
      <ReferralCard />
    </div>
  )
}
