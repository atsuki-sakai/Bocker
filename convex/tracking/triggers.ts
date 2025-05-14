import { Triggers } from 'convex-helpers/server/triggers'
import { DataModel } from '../_generated/dataModel' // Ensure this path is correct
import {
  trackingSummaryAggregate,
  trackingByDateAggregate,
  trackingByCodeAggregate, // Enable if registered and used
} from './aggregate' // Ensure this path is correct

const triggers = new Triggers<DataModel>()

// tracking_summariesテーブルの変更を各集計コンポーネントに反映
triggers.register('tracking_summaries', trackingSummaryAggregate.trigger())
triggers.register('tracking_summaries', trackingByDateAggregate.trigger())
triggers.register('tracking_summaries', trackingByCodeAggregate.trigger()) // Enable if registered and used

export default triggers
