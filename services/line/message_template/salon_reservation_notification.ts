import type { Message } from '@line/bot-sdk'
import type { Doc } from '@/convex/_generated/dataModel'
import { getAppUrl } from '@/lib/env-config'

export interface SalonReservationNotificationParams {
  organization: Doc<'organization'>
  reservation: {
    _id: string
    customer_name: string
    staff_name: string
    date: string
    start_time_unix: number
    end_time_unix: number
    status: string
    payment_status: string
  }
  reservationDetail: {
    total_price?: number
    payment_method: string
    menus: Array<{ name: string; price: number; quantity: number }>
    options?: Array<{ name: string; price: number; quantity: number }>
    extra_charge?: number
    coupon_discount?: number
    use_points?: number
  }
  customer: {
    phone?: string
    email?: string
    line_id?: string
  }
  paymentMethod: 'cash' | 'credit_card'
}

/**
 * サロン向け予約通知のFlex Messageを生成
 */
export const createSalonReservationNotification = ({
  organization,
  reservation,
  reservationDetail,
  customer,
  paymentMethod,
}: SalonReservationNotificationParams): Message => {
  // 予約時間のフォーマット
  const startTime = new Date(reservation.start_time_unix)
  const endTime = new Date(reservation.end_time_unix)
  const timeSlot = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')} - ${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`

  // メニューリストの生成
  const menuItems = reservationDetail.menus.map(menu => ({
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
  const optionItems = reservationDetail.options?.map(option => ({
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

  // 割引・ポイント情報
  const discountItems = []
  if (reservationDetail.coupon_discount && reservationDetail.coupon_discount > 0) {
    discountItems.push({
      type: 'box' as const,
      layout: 'horizontal' as const,
      contents: [
        {
          type: 'text' as const,
          text: 'クーポン割引',
          size: 'sm' as const,
          color: '#22c55e',
          flex: 3,
        },
        {
          type: 'text' as const,
          text: `-¥${reservationDetail.coupon_discount.toLocaleString()}`,
          size: 'sm' as const,
          color: '#22c55e',
          align: 'end' as const,
          flex: 1,
        },
      ],
    })
  }

  if (reservationDetail.use_points && reservationDetail.use_points > 0) {
    discountItems.push({
      type: 'box' as const,
      layout: 'horizontal' as const,
      contents: [
        {
          type: 'text' as const,
          text: 'ポイント使用',
          size: 'sm' as const,
          color: '#3b82f6',
          flex: 3,
        },
        {
          type: 'text' as const,
          text: `-¥${reservationDetail.use_points.toLocaleString()}`,
          size: 'sm' as const,
          color: '#3b82f6',
          align: 'end' as const,
          flex: 1,
        },
      ],
    })
  }

  // 顧客連絡先情報
  const contactInfo = []
  if (customer.phone) {
    contactInfo.push({
      type: 'text' as const,
      text: `📞 ${customer.phone}`,
      size: 'sm' as const,
      color: '#666666',
      margin: 'sm' as const,
    })
  }
  if (customer.email) {
    contactInfo.push({
      type: 'text' as const,
      text: `📧 ${customer.email}`,
      size: 'sm' as const,
      color: '#666666',
      margin: 'sm' as const,
    })
  }
  if (customer.line_id) {
    contactInfo.push({
      type: 'text' as const,
      text: `💬 LINE連携済み`,
      size: 'sm' as const,
      color: '#06d755',
      weight: 'bold' as const,
      margin: 'sm' as const,
    })
  }

  const flexMessage: Message = {
    type: 'flex',
    altText: `${organization.org_name}に新しい予約が入りました`,
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎉 新しい予約が入りました',
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
        backgroundColor: '#06d755',
        paddingAll: '20px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '予約詳細を確認',
              uri: `${getAppUrl()}/dashboard/reservation/${reservation._id}`,
            },
            style: 'primary',
            margin: 'md',
          },
          // 予約基本情報
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '📅 予約情報',
                weight: 'bold',
                size: 'lg',
                color: '#333333',
                margin: 'none',
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
                    text: `${reservation.date} ${timeSlot}`,
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
                    text: reservation.customer_name,
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
                    text: reservation.staff_name,
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
                    text: '決済方法',
                    size: 'sm',
                    color: '#666666',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: paymentMethod === 'cash' ? '現金決済' : 'カード決済',
                    size: 'sm',
                    color: paymentMethod === 'cash' ? '#f59e0b' : '#06d755',
                    weight: 'bold',
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
                text: '✂️ 施術内容',
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

          // 料金情報
          ...(reservationDetail.total_price ? [{
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
              {
                type: 'text' as const,
                text: '💰 料金情報',
                weight: 'bold' as const,
                size: 'md' as const,
                color: '#333333',
                margin: 'xl' as const,
              },
              {
                type: 'separator' as const,
                margin: 'sm' as const,
              },
              ...discountItems,
              {
                type: 'box' as const,
                layout: 'horizontal' as const,
                contents: [
                  {
                    type: 'text' as const,
                    text: '合計金額',
                    size: 'md' as const,
                    color: '#333333',
                    weight: 'bold' as const,
                    flex: 3,
                  },
                  {
                    type: 'text' as const,
                    text: `¥${reservationDetail.total_price.toLocaleString()}`,
                    size: 'lg' as const,
                    color: '#06d755',
                    weight: 'bold' as const,
                    align: 'end' as const,
                    flex: 2,
                  },
                ],
                margin: 'md' as const,
                paddingTop: 'sm' as const,
              },
            ],
          }] : []),

          // 顧客連絡先
          ...(contactInfo.length > 0 ? [{
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
              {
                type: 'text' as const,
                text: '📞 顧客連絡先',
                weight: 'bold' as const,
                size: 'md' as const,
                color: '#333333',
                margin: 'xl' as const,
              },
              {
                type: 'separator' as const,
                margin: 'sm' as const,
              },
              ...contactInfo,
            ],
          }] : []),
        ],
        paddingAll: '28px',
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