import { migrateHistoricalData } from '@/lib/migration/convex-to-supabase'
import dotenv from 'dotenv'

// 環境変数の読み込み
dotenv.config()

// データ移行を実行する関数
async function runMigration() {
  console.log('データ移行を開始します...')

  try {
    // 1. ポイント履歴の移行
    console.log('ポイントキューの移行を開始...')
    const pointResult = await migrateHistoricalData({
      tableName: 'point_task_queue',
      targetTable: 'point_history',
      // 3ヶ月以上前のデータを移行
      cutoffDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    })
    console.log(`ポイントキュー移行結果: ${pointResult.migrated}件の移行完了`)

    // 2. 予約履歴の移行
    console.log('予約履歴の移行を開始...')
    const reservationResult = await migrateHistoricalData({
      tableName: 'reservation',
      targetTable: 'reservations_history',
      // 3ヶ月以上前のデータを移行
      cutoffDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    })
    console.log(`予約履歴移行結果: ${reservationResult.migrated}件の移行完了`)

    // 3. 決済履歴の移行
    console.log('決済履歴の移行を開始...')
    const paymentResult = await migrateHistoricalData({
      tableName: 'payment',
      targetTable: 'payment_history',
      // 3ヶ月以上前のデータを移行
      cutoffDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    })
    console.log(`決済履歴移行結果: ${paymentResult.migrated}件の移行完了`)

    console.log('データ移行が完了しました！')
  } catch (error) {
    console.error('移行中にエラーが発生しました:', error)
    process.exit(1)
  }
}

// スクリプト実行
runMigration()
