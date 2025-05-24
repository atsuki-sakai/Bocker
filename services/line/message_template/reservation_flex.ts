// import type { Message } from '@line/bot-sdk'
// import { Doc } from '@/convex/_generated/dataModel'
// import { format } from 'date-fns'
// import { ja } from 'date-fns/locale'
// import { TimeRange } from '@/lib/types'
// import type { StaffDisplay } from '@/app/(reservation)/reservation/[id]/calendar/_components/StaffView'

// export const reservationFlexMessageTemplate = (
//   orgConfig: Doc<'config'>,
//   customerName: string,
//   selectedStaff: StaffDisplay,
//   selectedDate: Date,
//   selectedTimeSlot: TimeRange,
//   selectedMenus: Doc<'menu'>[],
//   selectedOptions: Doc<'option'>[],
//   subtotalPrice: number,
//   usePoints: number,
//   couponDiscount: number,
//   calculateTotalPrice: number,
//   reservationId: string,
//   availableCancelDay: number
// ): Message[] => {
//   const reservationDetailsContents: any[] = [
//     {
//       type: 'box',
//       layout: 'horizontal',
//       contents: [
//         {
//           type: 'box',
//           layout: 'vertical',
//           contents: [
//             {
//               type: 'text',
//               text: 'お名前',
//               size: 'sm',
//               color: '#8C8C8C',
//               weight: 'bold',
//             },
//           ],
//           width: '80px',
//         },
//         {
//           type: 'box',
//           layout: 'vertical',
//           contents: [
//             {
//               type: 'text',
//               text: customerName + '様',
//               size: 'sm',
//               color: '#000000',
//               wrap: true,
//             },
//           ],
//         },
//       ],
//     },
//     {
//       type: 'box',
//       layout: 'horizontal',
//       contents: [
//         {
//           type: 'box',
//           layout: 'vertical',
//           contents: [
//             {
//               type: 'text',
//               text: '日時',
//               size: 'sm',
//               color: '#8C8C8C',
//               weight: 'bold',
//             },
//           ],
//           width: '80px',
//         },
//         {
//           type: 'box',
//           layout: 'vertical',
//           contents: [
//             {
//               type: 'text',
//               text: selectedDate
//                 ? format(selectedDate, 'yyyy年MM月dd日', {
//                     locale: ja,
//                   })
//                 : '',
//               size: 'sm',
//               color: '#000000',
//             },
//             {
//               type: 'text',
//               text: selectedTimeSlot
//                 ? `${selectedTimeSlot.startHour} 〜 ${selectedTimeSlot.endHour}`
//                 : '',
//               size: 'sm',
//               color: '#000000',
//             },
//           ],
//         },
//       ],
//       margin: 'md',
//     },
//     {
//       type: 'box',
//       layout: 'horizontal',
//       contents: [
//         {
//           type: 'box',
//           layout: 'vertical',
//           contents: [
//             {
//               type: 'text',
//               text: 'メニュー',
//               size: 'sm',
//               color: '#8C8C8C',
//               weight: 'bold',
//             },
//           ],
//           width: '80px',
//         },
//         {
//           type: 'box',
//           layout: 'vertical',
//           contents: [
//             {
//               type: 'text',
//               text: selectedMenus?.map((menu) => menu.name).join(', '),
//               size: 'sm',
//               color: '#000000',
//               wrap: true,
//             },
//           ],
//         },
//       ],
//       margin: 'md',
//     },
//   ]

//   if (selectedOptions && selectedOptions.length > 0) {
//     reservationDetailsContents.push({
//       type: 'box',
//       layout: 'horizontal',
//       contents: [
//         {
//           type: 'box',
//           layout: 'vertical',
//           contents: [
//             {
//               type: 'text',
//               text: 'オプション',
//               size: 'sm',
//               color: '#8C8C8C',
//               weight: 'bold',
//             },
//           ],
//           width: '80px',
//         },
//         {
//           type: 'box',
//           layout: 'vertical',
//           contents: [
//             {
//               type: 'text',
//               text: selectedOptions.map((option) => option.name).join(', '),
//               size: 'sm',
//               color: '#000000',
//               wrap: true,
//             },
//           ],
//         },
//       ],
//       margin: 'md',
//     })
//   }

//   reservationDetailsContents.push({
//     type: 'box',
//     layout: 'horizontal',
//     contents: [
//       {
//         type: 'box',
//         layout: 'vertical',
//         contents: [
//           {
//             type: 'text',
//             text: '小計',
//             size: 'sm',
//             color: '#8C8C8C',
//             weight: 'bold',
//           },
//         ],
//         width: '80px',
//       },
//       {
//         type: 'box',
//         layout: 'vertical',
//         contents: [
//           {
//             type: 'text',
//             text: subtotalPrice.toLocaleString() + '円',
//             size: 'sm',
//             color: '#000000',
//             wrap: true,
//           },
//         ],
//       },
//     ],
//     margin: 'md',
//   })

//   if (usePoints > 0) {
//     reservationDetailsContents.push({
//       type: 'box',
//       layout: 'horizontal',
//       contents: [
//         {
//           type: 'box',
//           layout: 'vertical',
//           contents: [
//             {
//               type: 'text',
//               text: 'ポイント利用',
//               size: 'sm',
//               color: '#1DB44D',
//               weight: 'bold',
//             },
//           ],
//           width: '80px',
//         },
//         {
//           type: 'box',
//           layout: 'vertical',
//           contents: [
//             {
//               type: 'text',
//               text: `- ${usePoints.toLocaleString()} P`,
//               size: 'sm',
//               color: '#1DB44D',
//               wrap: true,
//             },
//           ],
//         },
//       ],
//       margin: 'md',
//     })
//   }

//   if (couponDiscount > 0) {
//     reservationDetailsContents.push({
//       type: 'box',
//       layout: 'horizontal',
//       contents: [
//         {
//           type: 'box',
//           layout: 'vertical',
//           contents: [
//             {
//               type: 'text',
//               text: 'クーポン割引',
//               size: 'sm',
//               color: '#1DB44D',
//               weight: 'bold',
//             },
//           ],
//           width: '80px',
//         },
//         {
//           type: 'box',
//           layout: 'vertical',
//           contents: [
//             {
//               type: 'text',
//               text: `- ${couponDiscount.toLocaleString()} 円`,
//               size: 'sm',
//               color: '#1DB44D',
//               wrap: true,
//             },
//           ],
//         },
//       ],
//       margin: 'md',
//     })
//   }

//   reservationDetailsContents.push({
//     type: 'box',
//     layout: 'horizontal',
//     contents: [
//       {
//         type: 'box',
//         layout: 'vertical',
//         contents: [
//           {
//             type: 'text',
//             text: '合計料金',
//             size: 'sm',
//             color: '#8C8C8C',
//             weight: 'bold',
//           },
//         ],
//         width: '80px',
//       },
//       {
//         type: 'box',
//         layout: 'vertical',
//         contents: [
//           {
//             type: 'text',
//             text: calculateTotalPrice.toLocaleString() + '円',
//             size: 'sm',
//             color: '#000000',
//             wrap: true,
//             weight: 'bold',
//           },
//         ],
//       },
//     ],
//     margin: 'md',
//   })

//   reservationDetailsContents.push({
//     type: 'box',
//     layout: 'horizontal',
//     contents: [
//       {
//         type: 'box',
//         layout: 'vertical',
//         contents: [
//           {
//             type: 'text',
//             text: '担当',
//             size: 'sm',
//             color: '#8C8C8C',
//             weight: 'bold',
//           },
//         ],
//         width: '80px',
//       },
//       {
//         type: 'box',
//         layout: 'vertical',
//         contents: [
//           {
//             type: 'text',
//             text: selectedStaff?.name ?? '',
//             size: 'sm',
//             color: '#000000',
//             wrap: true,
//           },
//         ],
//       },
//     ],
//     margin: 'md',
//   })

//   reservationDetailsContents.push({
//     type: 'box',
//     layout: 'horizontal',
//     contents: [
//       {
//         type: 'box',
//         layout: 'vertical',
//         contents: [
//           {
//             type: 'text',
//             text: '予約番号',
//             size: 'sm',
//             color: '#8C8C8C',
//             weight: 'bold',
//           },
//         ],
//         width: '80px',
//       },
//       {
//         type: 'box',
//         layout: 'vertical',
//         contents: [
//           {
//             type: 'text',
//             text: reservationId,
//             size: 'sm',
//             color: '#000000',
//           },
//         ],
//       },
//     ],
//     margin: 'md',
//   })

//   const contentsBody: any[] = [
//     {
//       type: 'text',
//       text: '予約内容',
//       weight: 'bold',
//       size: 'lg',
//       color: '#5dade2',
//     },
//     {
//       type: 'separator',
//       margin: 'md',
//     },
//     {
//       type: 'box',
//       layout: 'vertical',
//       margin: 'lg',
//       spacing: 'sm',
//       contents: reservationDetailsContents,
//     },
//     {
//       type: 'separator',
//       margin: 'xxl',
//     },
//     {
//       type: 'box',
//       layout: 'vertical',
//       margin: 'md',
//       contents: [
//         {
//           type: 'text',
//           text: '店舗情報',
//           weight: 'bold',
//           size: 'md',
//           color: '#5dade2',
//         },
//         {
//           type: 'box',
//           layout: 'horizontal',
//           contents: [
//             {
//               type: 'box',
//               layout: 'vertical',
//               contents: [
//                 {
//                   type: 'text',
//                   text: '住所',
//                   size: 'sm',
//                   color: '#8C8C8C',
//                   weight: 'bold',
//                 },
//               ],
//               width: '80px',
//             },
//             {
//               type: 'box',
//               layout: 'vertical',
//               contents: [
//                 {
//                   type: 'text',
//                   text: orgConfig?.address ?? '',
//                   size: 'sm',
//                   color: '#000000',
//                   wrap: true,
//                 },
//               ],
//             },
//           ],
//           margin: 'md',
//         },
//         {
//           type: 'box',
//           layout: 'horizontal',
//           contents: [
//             {
//               type: 'box',
//               layout: 'vertical',
//               contents: [
//                 {
//                   type: 'text',
//                   text: '電話番号',
//                   size: 'sm',
//                   color: '#8C8C8C',
//                   weight: 'bold',
//                 },
//               ],
//               width: '80px',
//             },
//             {
//               type: 'box',
//               layout: 'vertical',
//               contents: [
//                 {
//                   type: 'text',
//                   text: orgConfig?.phone ?? '',
//                   size: 'sm',
//                   color: '#000000',
//                 },
//               ],
//             },
//           ],
//           margin: 'md',
//         },
//       ],
//     },
//     {
//       type: 'box',
//       layout: 'vertical',
//       margin: 'xxl',
//       contents: [
//         {
//           type: 'text',
//           text: 'ご予約に関する注意事項',
//           size: 'sm',
//           color: '#FF5551',
//           weight: 'bold',
//         },
//         {
//           type: 'text',
//           text: '・予約時間の5〜10分前にはご来店ください。',
//           size: 'xs',
//           color: '#8C8C8C',
//           margin: 'md',
//           wrap: true,
//         },
//         {
//           type: 'text',
//           text: `・キャンセルは予約日の${availableCancelDay.toString()}日前までにご連絡ください。`,
//           size: 'xs',
//           color: '#8C8C8C',
//           wrap: true,
//         },
//       ],
//     },
//   ]

//   return [
//     {
//       type: 'flex',
//       altText: '予約確認',
//       contents: {
//         type: 'bubble',
//         size: 'giga',
//         header: {
//           type: 'box',
//           layout: 'vertical',
//           contents: [
//             {
//               type: 'box',
//               layout: 'horizontal',
//               contents: [
//                 {
//                   type: 'text',
//                   text: orgConfig?.org_name ?? '',
//                   weight: 'bold',
//                   size: 'xl',
//                   color: '#ffffff',
//                   align: 'center',
//                   gravity: 'center',
//                   margin: 'md',
//                 },
//               ],
//               spacing: 'md',
//             },
//             {
//               type: 'text',
//               text: 'ご予約の確認',
//               color: '#ffffff',
//               align: 'center',
//               size: 'sm',
//               margin: 'xs',
//             },
//           ],
//           paddingAll: '20px',
//           backgroundColor: '#5dade2',
//           spacing: 'md',
//           paddingTop: '22px',
//         },
//         body: {
//           type: 'box',
//           layout: 'vertical',
//           contents: contentsBody,
//           paddingAll: '20px',
//         },
//         footer: {
//           type: 'box',
//           layout: 'vertical',
//           spacing: 'sm',
//           contents: [
//             {
//               type: 'button',
//               style: 'primary',
//               action: {
//                 type: 'uri',
//                 label: '予約を確認する',
//                 uri: 'https://example.com/change-reservation',
//               },
//               color: '#5dade2',
//             },
//             {
//               type: 'button',
//               style: 'secondary',
//               action: {
//                 type: 'uri',
//                 label: '予約をキャンセルする',
//                 uri: 'https://example.com/cancel-reservation',
//               },
//             },
//             {
//               type: 'box',
//               layout: 'vertical',
//               contents: [
//                 {
//                   type: 'text',
//                   text: 'ご不明な点がございましたら、お電話にてお問い合わせください。',
//                   color: '#8C8C8C',
//                   size: 'xxs',
//                   align: 'center',
//                   wrap: true,
//                   margin: 'md',
//                 },
//               ],
//               margin: 'sm',
//             },
//           ],
//           paddingAll: '20px',
//         },
//         styles: {
//           header: {
//             backgroundColor: '#5dade2',
//           },
//           footer: {
//             separator: true,
//           },
//         },
//       },
//     },
//   ]
// }
