import { defineApp } from 'convex/server';
import migrations from '@convex-dev/migrations/convex.config';
import aggregate from '@convex-dev/aggregate/convex.config'

const app = defineApp()
if (migrations) app.use(migrations)

// 複数の集計コンポーネントを登録
app.use(aggregate, { name: 'trackingSummaryAggregate' })
app.use(aggregate, { name: 'trackingByDateAggregate' })
app.use(aggregate, { name: 'trackingByCodeAggregate' })
app.use(aggregate, { name: 'trackingByDateCodeEventTypeAggregate' })

export default app
