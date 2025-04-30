'use client'

import { useSalon } from '@/hooks/useSalon'
import { Loading } from '@/components/common'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CopyIcon } from 'lucide-react'
export default function ReservationLink() {
  const { salon } = useSalon()

  const apiConfig = useQuery(
    api.salon.api_config.query.findBySalonId,
    salon?._id ? { salonId: salon?._id } : 'skip'
  )

  if (!salon) {
    return <Loading />
  }
  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://bcker-project.vercel.app'
      : 'http://localhost:3000'

  return (
    <div>
      {apiConfig &&
      apiConfig?.liffId &&
      apiConfig?.lineChannelSecret &&
      apiConfig?.lineAccessToken ? (
        <div className="flex flex-col">
          <p className="text-base font-bold text-slate-700">予約ページのURLは以下になります。</p>
          <div className="flex items-center gap-2">
            <a
              className="text-sm text-slate-500 truncate mr-2"
              href={`${baseUrl}/reservation/${salon._id}`}
            >{`${baseUrl}/reservation/${salon._id}`}</a>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(`${baseUrl}/reservation/${salon._id}`)
              }}
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-base font-bold text-slate-700">Lineとの連携を完了させてください。</p>
          <span className="text-sm text-gray-500">
            外部サービス連携からLineの連携に必要な情報を入力してください。
            取得方法は画面下部のヘルプを参照してください。
          </span>
          <Link href={`${baseUrl}/dashboard/setting`}>
            <Button>Lineと連携する</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
