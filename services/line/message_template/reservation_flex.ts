import type { Message } from '@line/bot-sdk'
import { Doc } from '@/convex/_generated/dataModel'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { TimeRange } from '@/lib/type'
import { StaffDisplay } from '@/app/(reservation)/reservation/[id]/calendar/_components/StaffView'

export const reservationFlexMessageTemplate = (
  salonConfig: Doc<'salon_config'>,
  sessionCustomer: Doc<'customer'>,
  selectedStaff: StaffDisplay,
  selectedDate: Date,
  selectedTimeSlot: TimeRange,
  selectedMenus: Doc<'menu'>[],
  calculateTotalPrice: number,
  reservationId: string,
  pinCode?: string
): Message[] => [
  {
    type: 'flex',
    altText: '予約確認',
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
                text: salonConfig?.salonName ?? '',
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
            text: 'ご予約の確認',
            color: '#ffffff',
            align: 'center',
            size: 'sm',
            margin: 'xs',
          },
        ],
        paddingAll: '20px',
        backgroundColor: '#5dade2',
        spacing: 'md',
        paddingTop: '22px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '予約内容',
            weight: 'bold',
            size: 'lg',
            color: '#5dade2',
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
            contents: [
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
                        text: sessionCustomer ? sessionCustomer.lineUserName + '様' : '',
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
                        text: selectedDate
                          ? format(selectedDate, 'yyyy年MM月dd日', {
                              locale: ja,
                            })
                          : '',
                        size: 'sm',
                        color: '#000000',
                      },
                      {
                        type: 'text',
                        text: selectedTimeSlot
                          ? `${selectedTimeSlot.startHour} 〜 ${selectedTimeSlot.endHour}`
                          : '',
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
                        text: selectedMenus?.map((menu) => menu.name).join(', '),
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
                        text: '合計料金',
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
                        text: calculateTotalPrice.toLocaleString() + '円',
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
                        text: selectedStaff?.name ?? '',
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
                        text: reservationId,
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
          {
            type: 'separator',
            margin: 'xxl',
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
                color: '#5dade2',
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
                        text: salonConfig?.address ?? '',
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
                        text: salonConfig?.phone ?? '',
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
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xxl',
            contents: [
              {
                type: 'text',
                text: 'ご予約に関する注意事項',
                size: 'sm',
                color: '#FF5551',
                weight: 'bold',
              },
              {
                type: 'text',
                text: '・予約時間の10分前にはご来店ください。',
                size: 'xs',
                color: '#8C8C8C',
                margin: 'md',
                wrap: true,
              },
              {
                type: 'text',
                text: '・キャンセルは予約日の2日前までにご連絡ください。',
                size: 'xs',
                color: '#8C8C8C',
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
              label: '予約を確認する',
              uri: 'https://example.com/change-reservation',
            },
            color: '#5dade2',
          },
          // {
          //   type: "button",
          //   style: "secondary",
          //   action: {
          //     type: "uri",
          //     label: "予約をキャンセルする",
          //     uri: "https://example.com/cancel-reservation",
          //   },
          // },
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
      styles: {
        header: {
          backgroundColor: '#5dade2',
        },
        footer: {
          separator: true,
        },
      },
    },
  },
]
