import ReferralCard from '@/components/common/ReferralCard'
import { Tutorial } from '@/components/common/Tutorial'

export default async function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <Tutorial />
      <ReferralCard />
    </div>
  )
}
