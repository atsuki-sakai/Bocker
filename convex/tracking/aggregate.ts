import { TableAggregate } from '@convex-dev/aggregate'
import { components } from '../_generated/api'
import { DataModel, Id } from '../_generated/dataModel'

// サロンごとの合計カウント集計
export const trackingSummaryAggregate = new TableAggregate<{
  Namespace: Id<'salon'>
  Key: string // 日付をキーとして使用 (YYYY-MM-DD)
  DataModel: DataModel
  TableName: 'tracking_summaries'
  Value: number // 集計する値の型 (totalCount)
}>(components.trackingSummaryAggregate, {
  namespace: (doc) => doc.salonId,
  sortKey: (doc) => doc.date, // Assuming doc.date is string "YYYY-MM-DD"
  sumValue: (doc) => doc.totalCount,
})

// 日付およびイベントタイプごとの集計
export const trackingByDateAggregate = new TableAggregate<{
  Namespace: Id<'salon'>
  Key: [string, string] // [date (YYYY-MM-DD), eventType]
  DataModel: DataModel
  TableName: 'tracking_summaries'
  Value: number
}>(components.trackingByDateAggregate, {
  namespace: (doc) => doc.salonId,
  sortKey: (doc) => [doc.date, doc.eventType || ''], // Handle optional eventType
  sumValue: (doc) => doc.totalCount,
})

// コードおよび日付ごとの集計
export const trackingByCodeAggregate = new TableAggregate<{
  Namespace: Id<'salon'>
  Key: [string, string] // [code, date (YYYY-MM-DD)]
  DataModel: DataModel
  TableName: 'tracking_summaries'
  Value: number
}>(components.trackingByCodeAggregate, {
  namespace: (doc) => doc.salonId,
  sortKey: (doc) => [doc.code || '', doc.date], // Handle optional code
  sumValue: (doc) => doc.totalCount,
})

// 日付、コード、イベントタイプごとの集計
export const trackingByDateCodeEventTypeAggregate = new TableAggregate<{
  Namespace: Id<'salon'>
  Key: [string, string, string] // [date (YYYY-MM-DD), code, eventType]
  DataModel: DataModel
  TableName: 'tracking_summaries'
  Value: number
}>(components.trackingByDateCodeEventTypeAggregate, {
  namespace: (doc) => doc.salonId,
  sortKey: (doc) => [doc.date, doc.code || '', doc.eventType || ''], // Handle optional code and eventType
  sumValue: (doc) => doc.totalCount,
})
