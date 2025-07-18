import type { Message } from '@line/bot-sdk'
import { Doc } from '@/convex/_generated/dataModel'
import { format, differenceInMinutes } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ReservationMenu, ReservationOption } from '@/convex/types'

interface ReminderData {
  id: string
  customerName: string
  staffName: string
  startTimeUnix: number
  endTimeUnix: number
  menus: ReservationMenu[]
  options: ReservationOption[]
  extraCharge: number
  couponDiscount: number
  usePoints: number
  totalPrice: number
  orgName: string
}

interface ReminderFlexMessageParams {
  organization: Doc<'organization'>
  orgConfig: Doc<'config'>
  reservationData: ReminderData
}

export const createReminderFlexMessage = ({
  organization,
  orgConfig,
  reservationData
}: ReminderFlexMessageParams): Message[] => {
  // Unix時間をそのままDate型に変換（reservation_flex.tsと同じ方法）
  const startDate = new Date(reservationData.startTimeUnix)
  const endDate = new Date(reservationData.endTimeUnix)

  // 日付と時刻をフォーマット
  const dateStr = format(startDate, 'yyyy年MM月dd日', { locale: ja })
  const startTimeStr = format(startDate, 'HH:mm', { locale: ja })
  const endTimeStr = format(endDate, 'HH:mm', { locale: ja })
  
  // 施術時間の計算
  const totalMinutes = differenceInMinutes(endDate, startDate)
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const durationStr = hours > 0 
    ? `${hours}時間${minutes > 0 ? `${minutes}分` : ''}` 
    : `${minutes}分`

  return [
    {
      type: 'flex',
      altText: '【リマインダー】本日のご予約について',
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🔔 予約リマインダー',
              weight: 'bold',
              size: 'lg',
              color: '#ffffff',
              align: 'center',
            },
            {
              type: 'text',
              text: organization?.org_name ?? '',
              color: '#ffffff',
              align: 'center',
              size: 'md',
              margin: 'xs',
            },
          ],
          paddingAll: '20px',
          backgroundColor: '#FF6B6B',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '本日のご予約時間が近づいています',
              weight: 'bold',
              size: 'md',
              color: '#FF6B6B',
              margin: 'md',
            },
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'md',
              contents: [
                // お客様名
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: 'お名前',
                      size: 'sm',
                      color: '#8C8C8C',
                      weight: 'bold',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: `${reservationData.customerName}様`,
                      size: 'sm',
                      color: '#000000',
                      flex: 5,
                      wrap: true,
                    },
                  ],
                },
                // 日時
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '日時',
                      size: 'sm',
                      color: '#8C8C8C',
                      weight: 'bold',
                      flex: 2,
                    },
                    {
                      type: 'box',
                      layout: 'vertical',
                      flex: 5,
                      contents: [
                        {
                          type: 'text',
                          text: dateStr,
                          size: 'sm',
                          color: '#000000',
                        },
                        {
                          type: 'text',
                          text: `${startTimeStr} 〜 ${endTimeStr} (${durationStr})`,
                          size: 'sm',
                          color: '#000000',
                          weight: 'bold',
                        },
                      ],
                    },
                  ],
                },
                // メニュー
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: 'メニュー',
                      size: 'sm',
                      color: '#8C8C8C',
                      weight: 'bold',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: reservationData.menus.map(menu => menu.name).join(', '),
                      size: 'sm',
                      color: '#000000',
                      flex: 5,
                      wrap: true,
                    },
                  ],
                },
                // 担当スタッフ
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '担当',
                      size: 'sm',
                      color: '#8C8C8C',
                      weight: 'bold',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: reservationData.staffName,
                      size: 'sm',
                      color: '#000000',
                      flex: 5,
                    },
                  ],
                },
                // オプション（ある場合のみ表示）
                ...(reservationData.options && reservationData.options.length > 0 ? [{
                  type: 'box' as const,
                  layout: 'horizontal' as const,
                  contents: [
                    {
                      type: 'text' as const,
                      text: 'オプション',
                      size: 'sm' as const,
                      color: '#8C8C8C',
                      weight: 'bold' as const,
                      flex: 2,
                    },
                    {
                      type: 'text' as const,
                      text: reservationData.options.map(opt => `${opt.name}(${opt.quantity})`).join(', '),
                      size: 'sm' as const,
                      color: '#000000',
                      flex: 5,
                      wrap: true,
                    },
                  ],
                }] : []),
                // 指名料（ある場合のみ表示）
                ...(reservationData.extraCharge > 0 ? [{
                  type: 'box' as const,
                  layout: 'horizontal' as const,
                  contents: [
                    {
                      type: 'text' as const,
                      text: '指名料',
                      size: 'sm' as const,
                      color: '#8C8C8C',
                      weight: 'bold' as const,
                      flex: 2,
                    },
                    {
                      type: 'text' as const,
                      text: `¥${reservationData.extraCharge.toLocaleString()}`,
                      size: 'sm' as const,
                      color: '#000000',
                      flex: 5,
                    },
                  ],
                }] : []),
                // クーポン割引（ある場合のみ表示）
                ...(reservationData.couponDiscount > 0 ? [{
                  type: 'box' as const,
                  layout: 'horizontal' as const,
                  contents: [
                    {
                      type: 'text' as const,
                      text: 'クーポン',
                      size: 'sm' as const,
                      color: '#8C8C8C',
                      weight: 'bold' as const,
                      flex: 2,
                    },
                    {
                      type: 'text' as const,
                      text: `-¥${reservationData.couponDiscount.toLocaleString()}`,
                      size: 'sm' as const,
                      color: '#FF6B6B',
                      flex: 5,
                    },
                  ],
                }] : []),
                // ポイント使用（ある場合のみ表示）
                ...(reservationData.usePoints > 0 ? [{
                  type: 'box' as const,
                  layout: 'horizontal' as const,
                  contents: [
                    {
                      type: 'text' as const,
                      text: 'ポイント',
                      size: 'sm' as const,
                      color: '#8C8C8C',
                      weight: 'bold' as const,
                      flex: 2,
                    },
                    {
                      type: 'text' as const,
                      text: `-${reservationData.usePoints}pt`,
                      size: 'sm' as const,
                      color: '#FF6B6B',
                      flex: 5,
                    },
                  ],
                }] : []),
                // 合計料金
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '合計',
                      size: 'sm',
                      color: '#8C8C8C',
                      weight: 'bold',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: `¥${reservationData.totalPrice.toLocaleString()}`,
                      size: 'sm',
                      color: '#000000',
                      flex: 5,
                      weight: 'bold',
                    },
                  ],
                },
                // 予約番号
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '予約番号',
                      size: 'sm',
                      color: '#8C8C8C',
                      weight: 'bold',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: reservationData.id,
                      size: 'sm',
                      color: '#000000',
                      flex: 5,
                    },
                  ],
                },
              ],
            },
            {
              type: 'separator',
              margin: 'lg',
            },
            // 店舗情報
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              contents: [
                {
                  type: 'text',
                  text: '📍 ご来店先',
                  weight: 'bold',
                  size: 'sm',
                  color: '#5dade2',
                  margin: 'sm',
                },
                {
                  type: 'text',
                  text: orgConfig?.address ?? '',
                  size: 'xs',
                  color: '#666666',
                  wrap: true,
                  margin: 'xs',
                },
                {
                  type: 'text',
                  text: `TEL: ${orgConfig?.phone ?? ''}`,
                  size: 'xs',
                  color: '#666666',
                  margin: 'xs',
                },
              ],
            },
            // 注意事項
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              contents: [
                {
                  type: 'text',
                  text: '⚠️ ご来店時のお願い',
                  size: 'sm',
                  color: '#FF6B6B',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: '・予約時間の5〜10分前にはご来店ください',
                  size: 'xs',
                  color: '#666666',
                  margin: 'sm',
                  wrap: true,
                },
                {
                  type: 'text',
                  text: '・体調がすぐれない場合は、事前にご連絡ください',
                  size: 'xs',
                  color: '#666666',
                  wrap: true,
                },
              ],
            },
          ],
          paddingAll: '20px',
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: '地図を確認',
                uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(orgConfig?.address ?? '')}`,
              },
              color: '#5dade2',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'ご不明な点がございましたら、お電話にてお問い合わせください。',
                  color: '#8C8C8C',
                  size: 'xxs',
                  align: 'center',
                  wrap: true,
                  margin: 'md',
                },
              ],
              margin: 'sm',
            },
          ],
          paddingAll: '20px',
        },
      },
    },
  ]
}