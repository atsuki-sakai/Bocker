'use client'

import { useState } from 'react'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { Loading } from '@/components/common'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CopyIcon } from 'lucide-react'
import { BASE_URL } from '@/lib/constants'
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
import { TRACKING_CODE_VALUES, TrackingCode } from '@/convex/types'

export default function ReservationLink() {
  const { tenantId, orgId } = useTenantAndOrganization()
  const [selectedTrackingType, setSelectedTrackingType] = useState<TrackingCode>('web')
  const apiConfig = useQuery(
    api.organization.api_config.query.findByTenantAndOrg,
    tenantId && orgId ? { tenant_id: tenantId, org_id: orgId } : 'skip'
  )

  if (!tenantId || !orgId || apiConfig === undefined) {
    return <Loading />
  }

  return (
    <div>
      {apiConfig &&
      apiConfig?.liff_id &&
      apiConfig?.line_channel_secret &&
      apiConfig?.line_access_token ? (
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
                  `${BASE_URL}/reservation/${orgId}/?code=${selectedTrackingType}`
                )
              }}
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
          </div>

          <a
            className="text-sm text-link-foreground truncate"
            href={`${BASE_URL}/reservation/${orgId}/?code=${selectedTrackingType}`}
          >{`${BASE_URL}/reservation/${orgId}/?code=${selectedTrackingType}`}</a>
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
          <Link href={`${BASE_URL}/dashboard/setting`}>
            <Button>Lineと連携する</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
