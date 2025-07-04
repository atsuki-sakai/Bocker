import { Tutorial } from '@/components/common/Tutorial'
import ReservationTimeLine from './reservation/_components/ReservationTimeLine'

export default async function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>
      <ReservationTimeLine />
      <Tutorial />
    </div>
  )
}
