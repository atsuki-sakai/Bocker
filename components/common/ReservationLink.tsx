'use client'

import { useState } from 'react'
import { useSalon } from '@/hooks/useSalon'
import { Loading } from '@/components/common'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CopyIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { TRACKING_CODE_VALUES, TrackingCode } from '@/services/convex/shared/types/common'

export default function ReservationLink() {
  const { salon } = useSalon()
  const [selectedTrackingType, setSelectedTrackingType] = useState<TrackingCode>('web')
  const apiConfig = useQuery(
    api.salon.api_config.query.findBySalonId,
    salon?._id ? { salonId: salon?._id } : 'skip'
  )

  if (!salon || apiConfig === undefined) {
    return <Loading />
  }
  const baseUrl =
    process.env.NODE_ENV === 'production' ? 'https://bocker.jp' : 'http://localhost:3000'

  return (
    <div>
      {apiConfig &&
      apiConfig?.liffId &&
      apiConfig?.lineChannelSecret &&
      apiConfig?.lineAccessToken ? (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Select
              value={selectedTrackingType}
              onValueChange={(value) => setSelectedTrackingType(value as TrackingCode)}
            >
              <SelectTrigger>
                <SelectValue placeholder="リンクの設置先を選択" />
              </SelectTrigger>
              <SelectContent>
                {TRACKING_CODE_VALUES.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${baseUrl}/reservation/${salon._id}/?code=${selectedTrackingType}`
                )
              }}
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
          </div>

          <a
            className="text-sm text-link-foreground truncate"
            href={`${baseUrl}/reservation/${salon._id}/?code=${selectedTrackingType}`}
          >{`${baseUrl}/reservation/${salon._id}/?code=${selectedTrackingType}`}</a>
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>
                <p className="text-primary">予約受付リンクについて</p>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm tracking-normal leading-7 bg-muted rounded-md p-2">
                <p className="mb-2">
                  予約受付リンクにトラッキングパラメータを付与することで、どのチャネルからの流入を計測に使用します。
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <strong>LINE</strong>:
                    公式LINEのリッチメニューなどLINEからの流入を計測するのに使用します。
                  </li>
                  <li>
                    <strong>Web</strong>:
                    ブログやHPに埋め込んでWebからの流入を計測するのに使用します。
                  </li>
                  <li>
                    <strong>Instagram</strong>:
                    Instagramのプロフィールリンクやストーリーズ、投稿に設定しInstagramからの流入を計測するのに使用します。
                  </li>
                  <li>
                    <strong>X (Twitter)</strong>:
                    ツイートやプロフィールに貼り付けXからの流入を計測するのに使用します。
                  </li>
                  <li>
                    <strong>Facebook</strong>:
                    Facebookページの投稿やプロフィールに設定Facebookからの流入を計測するのに使用します。
                  </li>
                  <li>
                    <strong>YouTube</strong>:
                    動画説明欄やコミュニティタブに設定YouTubeからの流入を計測するのに使用します。
                  </li>
                  <li>
                    <strong>Tiktok</strong>:
                    プロフィールリンクや動画説明欄に設定Tiktokからの流入を計測するのに使用します。
                  </li>
                  <li>
                    <strong>GoogleMap</strong>: Google
                    マップのビジネス情報に設定GoogleMapからの流入を計測するのに使用します。
                  </li>
                </ul>
                <p className="mt-2">
                  コピーアイコンでリンクをクリップボードに保存し、各チャネルへ貼り付けてご活用ください。
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-base font-bold text-primary">Lineとの連携を完了させてください。</p>
          <span className="text-sm text-muted-foreground">
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
