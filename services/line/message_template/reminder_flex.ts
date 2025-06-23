import type { Message } from '@line/bot-sdk'
import { Doc } from '@/convex/_generated/dataModel'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ReminderData {
  id: string
  customerName: string
  staffName: string
  startTimeUnix: number
  endTimeUnix: number
  menus: Array<{ name: string; duration_min?: number }>
  totalPrice: number
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
  const startDate = new Date(reservationData.startTimeUnix)
  const endDate = new Date(reservationData.endTimeUnix)
  
  // 日付と時刻をフォーマット
  const dateStr = format(startDate, 'yyyy年MM月dd日', { locale: ja })
  const startTimeStr = format(startDate, 'HH:mm')
  const endTimeStr = format(endDate, 'HH:mm')
  
  // 施術時間の計算
  const totalDuration = reservationData.menus.reduce((total, menu) => 
    total + (menu.duration_min || 0), 0
  )
  
  const hours = Math.floor(totalDuration / 60)
  const minutes = totalDuration % 60
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
                // 料金
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '料金',
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