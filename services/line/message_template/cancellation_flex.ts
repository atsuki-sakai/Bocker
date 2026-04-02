import type { Message } from '@line/bot-sdk'
import { Doc } from '@/convex/_generated/dataModel'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Id } from '@/convex/_generated/dataModel'
import { BASE_URL } from '@/lib/constants'

/**
 * 顧客向けキャンセル通知Flex Messageの型定義
 */
export interface CustomerCancellationParams {
  organization: Doc<'organization'>
  orgConfig: Doc<'config'>
  customerName: string
  customerUid: string
  orgId: Id<'organization'>
  reservationData: {
    reservationId: string
    date: string
    startTimeUnix: number
    endTimeUnix: number
    staffName: string
    menus: Array<{ name: string; price: number }>
    options?: Array<{ name: string; price: number; quantity: number }>
    totalPrice: number
    cancelledBy: 'customer' | 'staff' | 'system'
    cancelReason?: string
  }
}

/**
 * サロン向けキャンセル通知Flex Messageの型定義
 */
export interface SalonCancellationParams {
  organization: Doc<'organization'>
  reservationData: {
    reservationId: string
    customerName: string
    staffName: string
    date: string
    startTimeUnix: number
    endTimeUnix: number
    menus: Array<{ name: string; price: number }>
    options?: Array<{ name: string; price: number; quantity: number }>
    totalPrice: number
    cancelledBy: 'customer' | 'staff' | 'system'
    cancelReason?: string
  }
}

/**
 * 顧客向けキャンセル通知のFlex Messageを生成
 */
export const createCustomerCancellationNotification = ({
  organization,
  orgConfig,
  customerName,
  customerUid,
  orgId,
  reservationData,
}: CustomerCancellationParams): Message[] => {
  // 時刻をフォーマット
  const startTime = new Date(reservationData.startTimeUnix)
  const endTime = new Date(reservationData.endTimeUnix)
  const timeSlot = `${format(startTime, 'HH:mm', { locale: ja })} 〜 ${format(endTime, 'HH:mm', { locale: ja })}`

  // キャンセル理由のテキスト
  const cancellationReasonText = reservationData.cancelledBy === 'customer' 
    ? 'お客様によりキャンセルされました'
    : reservationData.cancelledBy === 'staff'
    ? 'スタッフによりキャンセルされました'
    : 'システムによりキャンセルされました'

  // 詳細内容の構築
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reservationDetailsContents: any[] = [
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'お名前',
              size: 'sm',
              color: '#8C8C8C',
              weight: 'bold',
            },
          ],
          width: '80px',
        },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: customerName + '様',
              size: 'sm',
              color: '#000000',
              wrap: true,
            },
          ],
        },
      ],
    },
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '日時',
              size: 'sm',
              color: '#8C8C8C',
              weight: 'bold',
            },
          ],
          width: '80px',
        },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: reservationData.date
                ? format(new Date(reservationData.date), 'yyyy年MM月dd日', {
                    locale: ja,
                  })
                : '',
              size: 'sm',
              color: '#000000',
            },
            {
              type: 'text',
              text: timeSlot,
              size: 'sm',
              color: '#000000',
            },
          ],
        },
      ],
      margin: 'md',
    },
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'メニュー',
              size: 'sm',
              color: '#8C8C8C',
              weight: 'bold',
            },
          ],
          width: '80px',
        },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: reservationData.menus?.map((menu) => menu.name).join(', ') || '',
              size: 'sm',
              color: '#000000',
              wrap: true,
            },
          ],
        },
      ],
      margin: 'md',
    },
  ]

  // オプションがある場合は追加
  if (reservationData.options && reservationData.options.length > 0) {
    reservationDetailsContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'オプション',
              size: 'sm',
              color: '#8C8C8C',
              weight: 'bold',
            },
          ],
          width: '80px',
        },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: reservationData.options.map((option) => option.name).join(', '),
              size: 'sm',
              color: '#000000',
              wrap: true,
            },
          ],
        },
      ],
      margin: 'md',
    })
  }

  // 担当スタッフ
  reservationDetailsContents.push({
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '担当',
            size: 'sm',
            color: '#8C8C8C',
            weight: 'bold',
          },
        ],
        width: '80px',
      },
      {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: reservationData.staffName || '指名フリー',
            size: 'sm',
            color: '#000000',
            wrap: true,
          },
        ],
      },
    ],
    margin: 'md',
  })

  // 予約番号
  reservationDetailsContents.push({
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '予約番号',
            size: 'sm',
            color: '#8C8C8C',
            weight: 'bold',
          },
        ],
        width: '80px',
      },
      {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: reservationData.reservationId,
            size: 'sm',
            color: '#000000',
          },
        ],
      },
    ],
    margin: 'md',
  })

  return [
    {
      type: 'flex',
      altText: '予約キャンセル通知',
      contents: {
        type: 'bubble',
        size: 'giga',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: organization?.org_name ?? '',
                  weight: 'bold',
                  size: 'xl',
                  color: '#ffffff',
                  align: 'center',
                  gravity: 'center',
                  margin: 'md',
                },
              ],
              spacing: 'md',
            },
            {
              type: 'text',
              text: 'ご予約のキャンセル',
              color: '#ffffff',
              align: 'center',
              size: 'sm',
              margin: 'xs',
            },
          ],
          paddingAll: '20px',
          backgroundColor: '#FF5551',
          spacing: 'md',
          paddingTop: '22px',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'キャンセル内容',
              weight: 'bold',
              size: 'lg',
              color: '#FF5551',
            },
            {
              type: 'text',
              text: cancellationReasonText,
              size: 'sm',
              color: '#FF5551',
              margin: 'sm',
            },
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'sm',
              contents: reservationDetailsContents,
            },
            ...(reservationData.cancelReason ? [{
              type: 'separator' as const,
              margin: 'lg' as const,
            }, {
              type: 'box' as const,
              layout: 'vertical' as const,
              margin: 'md' as const,
              contents: [
                {
                  type: 'text' as const,
                  text: 'キャンセル理由',
                  weight: 'bold' as const,
                  size: 'sm' as const,
                  color: '#8C8C8C',
                },
                {
                  type: 'text' as const,
                  text: reservationData.cancelReason,
                  size: 'sm' as const,
                  color: '#000000',
                  wrap: true,
                  margin: 'xs' as const,
                },
              ],
            }] : []),
            {
              type: 'separator',
              margin: 'lg',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: '店舗情報',
                  weight: 'bold',
                  size: 'md',
                  color: '#214A58FF',
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'box',
                      layout: 'vertical',
                      contents: [
                        {
                          type: 'text',
                          text: '住所',
                          size: 'sm',
                          color: '#8C8C8C',
                          weight: 'bold',
                        },
                      ],
                      width: '80px',
                    },
                    {
                      type: 'box',
                      layout: 'vertical',
                      contents: [
                        {
                          type: 'text',
                          text: orgConfig?.address ?? '',
                          size: 'sm',
                          color: '#000000',
                          wrap: true,
                        },
                      ],
                    },
                  ],
                  margin: 'md',
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'box',
                      layout: 'vertical',
                      contents: [
                        {
                          type: 'text',
                          text: '電話番号',
                          size: 'sm',
                          color: '#8C8C8C',
                          weight: 'bold',
                        },
                      ],
                      width: '80px',
                    },
                    {
                      type: 'box',
                      layout: 'vertical',
                      contents: [
                        {
                          type: 'text',
                          text: orgConfig?.phone ?? '',
                          size: 'sm',
                          color: '#000000',
                        },
                      ],
                    },
                  ],
                  margin: 'md',
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
                label: '新しい予約を取る',
                uri: `${BASE_URL}/customer/${orgId}/${customerUid}/reservation`,
              },
              color: '#214A58FF',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'またのご利用をお待ちしております。ご不明な点がございましたら、お電話にてお問い合わせください。',
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
        styles: {
          header: {
            backgroundColor: '#FF5551',
          },
          footer: {
            separator: true,
          },
        },
      },
    },
  ]
}

/**
 * サロン向けキャンセル通知のFlex Messageを生成
 */
export const createSalonCancellationNotification = ({
  organization,
  reservationData,
}: SalonCancellationParams): Message => {
  // 時刻をフォーマット
  const startTime = new Date(reservationData.startTimeUnix)
  const endTime = new Date(reservationData.endTimeUnix)
  const timeSlot = `${format(startTime, 'HH:mm', { locale: ja })} - ${format(endTime, 'HH:mm', { locale: ja })}`

  // キャンセル理由のテキスト
  const cancellationReasonText = reservationData.cancelledBy === 'customer' 
    ? 'お客様によりキャンセル'
    : reservationData.cancelledBy === 'staff'
    ? 'スタッフによりキャンセル'
    : 'システムによりキャンセル'

  // メニューリストの生成
  const menuItems = reservationData.menus.map(menu => ({
    type: 'box' as const,
    layout: 'horizontal' as const,
    contents: [
      {
        type: 'text' as const,
        text: menu.name,
        size: 'sm' as const,
        color: '#333333',
        flex: 3,
      },
      {
        type: 'text' as const,
        text: `¥${menu.price.toLocaleString()}`,
        size: 'sm' as const,
        color: '#333333',
        align: 'end' as const,
        flex: 1,
      },
    ],
  }))

  // オプションアイテムの生成
  const optionItems = reservationData.options?.map(option => ({
    type: 'box' as const,
    layout: 'horizontal' as const,
    contents: [
      {
        type: 'text' as const,
        text: `+ ${option.name}`,
        size: 'sm' as const,
        color: '#666666',
        flex: 3,
      },
      {
        type: 'text' as const,
        text: `¥${option.price.toLocaleString()}`,
        size: 'sm' as const,
        color: '#666666',
        align: 'end' as const,
        flex: 1,
      },
    ],
  })) || []

  const flexMessage: Message = {
    type: 'flex',
    altText: `${organization.org_name}の予約がキャンセルされました`,
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '❌ 予約がキャンセルされました',
            weight: 'bold',
            size: 'xl',
            color: '#ffffff',
            align: 'center',
          },
          {
            type: 'text',
            text: organization.org_name,
            size: 'md',
            color: '#ffffff',
            align: 'center',
            margin: 'sm',
          },
        ],
        backgroundColor: '#FF5551',
        paddingAll: '20px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          // キャンセル情報
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '📅 キャンセルされた予約',
                weight: 'bold',
                size: 'lg',
                color: '#333333',
                margin: 'none',
              },
              {
                type: 'text',
                text: cancellationReasonText,
                size: 'sm',
                color: '#FF5551',
                margin: 'sm',
              },
              {
                type: 'separator',
                margin: 'sm',
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '日時',
                    size: 'sm',
                    color: '#666666',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: `${reservationData.date} ${timeSlot}`,
                    size: 'sm',
                    color: '#333333',
                    weight: 'bold',
                    flex: 3,
                  },
                ],
                margin: 'md',
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '顧客名',
                    size: 'sm',
                    color: '#666666',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: reservationData.customerName,
                    size: 'sm',
                    color: '#333333',
                    weight: 'bold',
                    flex: 3,
                  },
                ],
                margin: 'sm',
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '担当',
                    size: 'sm',
                    color: '#666666',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: reservationData.staffName,
                    size: 'sm',
                    color: '#333333',
                    weight: 'bold',
                    flex: 3,
                  },
                ],
                margin: 'sm',
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '予約番号',
                    size: 'sm',
                    color: '#666666',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: reservationData.reservationId,
                    size: 'sm',
                    color: '#333333',
                    flex: 3,
                  },
                ],
                margin: 'sm',
              },
            ],
            margin: 'none',
          },
          
          // 施術メニュー
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '✂️ キャンセルされた施術内容',
                weight: 'bold',
                size: 'md',
                color: '#333333',
                margin: 'xl',
              },
              {
                type: 'separator',
                margin: 'sm',
              },
              ...menuItems,
              ...optionItems,
            ],
          },

          // キャンセル理由（ある場合）
          ...(reservationData.cancelReason ? [{
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
              {
                type: 'text' as const,
                text: '💬 キャンセル理由',
                weight: 'bold' as const,
                size: 'md' as const,
                color: '#333333',
                margin: 'xl' as const,
              },
              {
                type: 'separator' as const,
                margin: 'sm' as const,
              },
              {
                type: 'text' as const,
                text: reservationData.cancelReason,
                size: 'sm' as const,
                color: '#666666',
                wrap: true,
                margin: 'md' as const,
              },
            ],
          }] : []),
        ],
        paddingAll: '20px',
        spacing: 'md',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'Bocker 予約管理システム',
            size: 'xs',
            color: '#888888',
            align: 'center',
          },
          {
            type: 'text',
            text: new Date().toLocaleString('ja-JP'),
            size: 'xs',
            color: '#888888',
            align: 'center',
            margin: 'xs',
          },
        ],
        paddingAll: '20px',
      },
    },
  }

  return flexMessage
} 