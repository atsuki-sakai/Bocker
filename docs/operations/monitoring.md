# Bocker 監視・アラート設定ガイド

**最終更新**: 2025年6月23日  
**ドキュメントバージョン**: 1.0

## 概要

Bockerの運用監視は、システムの安定性確保とパフォーマンス維持を目的として、複数のモニタリングツールを組み合わせて実装されています。

## 監視アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App  │───►│     Sentry      │───►│  Slack/Email    │
│   (Frontend)    │    │ (Error Monitor) │    │  (Alerts)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Convex      │───►│ Cloud Monitoring│───►│  Dashboard      │
│  (Database)     │    │  (Performance)  │    │  (Metrics)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│   Supabase      │───►│ Built-in Monitor│
│  (PostgreSQL)   │    │  (DB Metrics)   │
└─────────────────┘    └─────────────────┘
```

## 監視対象とメトリクス

### 1. アプリケーション監視（Sentry）

#### エラー監視
- **JavaScript Errors**: フロントエンドのランタイムエラー
- **API Errors**: バックエンドAPIのエラー
- **Performance Issues**: パフォーマンス問題の検出
- **User Context**: エラー発生時のユーザー情報

#### 設定済みアラート
```typescript
// instrumentation.ts
export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
      beforeSend(event) {
        // PII情報のフィルタリング
        return filterSensitiveData(event);
      }
    });
  }
}
```

### 2. データベース監視（Convex）

#### パフォーマンスメトリクス
- **Function Calls**: 月間API呼び出し回数
- **Database Operations**: データベース操作回数
- **Response Time**: レスポンス時間
- **Active Subscriptions**: アクティブなリアルタイム接続数

#### 監視閾値
```typescript
const convexAlerts = {
  functionCalls: {
    warning: 8_000_000,    // 月間800万回で警告
    critical: 10_000_000   // 月間1000万回で緊急
  },
  responseTime: {
    warning: 500,          // 500ms以上で警告
    critical: 1000         // 1秒以上で緊急
  },
  errorRate: {
    warning: 0.05,         // 5%以上で警告
    critical: 0.1          // 10%以上で緊急
  }
};
```

### 3. PostgreSQL監視（Supabase）

#### システムメトリクス
- **Database Size**: データベース容量
- **Active Connections**: アクティブ接続数
- **Query Performance**: クエリ実行時間
- **Disk I/O**: ディスクI/O使用率

#### アラート設定
```sql
-- 長時間実行クエリの監視
SELECT query, query_start, now() - query_start AS duration
FROM pg_stat_activity 
WHERE now() - query_start > interval '30 seconds'
  AND state = 'active'
  AND query NOT LIKE '%pg_stat_activity%';
```

### 4. インフラ監視（GCP）

#### Cloud Storage
- **Storage Usage**: ストレージ使用量
- **Request Count**: アクセス回数
- **Egress Traffic**: 転送量
- **Error Rate**: エラー率

#### CDN監視
- **Cache Hit Rate**: キャッシュヒット率（目標95%以上）
- **Origin Requests**: オリジンリクエスト数
- **Latency**: レスポンス時間

## アラート設定

### 1. 緊急度レベル

#### Critical（即座対応）
- **システム全体停止**
- **データ損失の可能性**
- **セキュリティインシデント**
- **支払い処理の障害**

#### Warning（監視強化）
- **パフォーマンス劣化**（レスポンス時間増加）
- **エラー率上昇**（5%以上）
- **リソース使用率高騰**（80%以上）
- **予算超過アラート**

#### Info（記録のみ）
- **通常の運用イベント**
- **定期メンテナンス**
- **設定変更**

### 2. 通知チャンネル

#### Slack統合
```typescript
// アラート通知の例
const slackAlert = {
  channel: '#dev-alerts',
  message: {
    text: '🚨 Critical Alert: High Error Rate Detected',
    attachments: [{
      color: 'danger',
      fields: [
        { title: 'Error Rate', value: '12%', short: true },
        { title: 'Time', value: new Date().toISOString(), short: true },
        { title: 'Service', value: 'Convex API', short: true }
      ]
    }]
  }
};
```

#### メール通知
- **緊急時**: 即座にオンコール担当者へ
- **警告時**: 開発チーム全体へ
- **日次レポート**: ステークホルダーへ

## 監視ダッシュボード

### 1. リアルタイムダッシュボード

#### 主要KPI
- **システム稼働率**（99.9%目標）
- **平均レスポンス時間**（500ms以下目標）
- **エラー率**（0.1%以下目標）
- **アクティブユーザー数**

#### 業務メトリクス
- **予約作成数**（日別・時間別）
- **決済成功率**（目標99%以上）
- **ユーザーアクティビティ**
- **機能使用率**

### 2. 運用ダッシュボード

#### コストモニタリング
```typescript
// 月次コスト監視
const costMonitoring = {
  convex: {
    budget: 2000,        // USD
    current: 1850,       // USD
    utilization: 92.5    // %
  },
  gcp: {
    budget: 500,         // USD
    current: 320,        // USD
    utilization: 64      // %
  },
  total: {
    budget: 3000,        // USD
    current: 2170,       // USD
    utilization: 72.3    // %
  }
};
```

#### パフォーマンストレンド
- **月次成長率**
- **機能別使用量**
- **地域別アクセス分布**
- **デバイス別利用状況**

## 運用手順

### 1. 日次チェックリスト

#### 朝のヘルスチェック（9:00）
- [ ] システム稼働率確認
- [ ] 夜間バッチ処理結果確認
- [ ] エラーログレビュー
- [ ] パフォーマンスメトリクス確認

#### 夕方の状況確認（18:00）
- [ ] 日中のピーク時パフォーマンス確認
- [ ] 新規アラート確認
- [ ] コスト使用状況確認
- [ ] 明日の予定確認

### 2. 週次レビュー

#### 月曜日の週次レビュー
- [ ] 先週の運用サマリー作成
- [ ] トレンド分析
- [ ] 改善アクション項目の確認
- [ ] 今週の重要イベント確認

### 3. 月次レポート

#### 運用レポート内容
- **稼働率サマリー**
- **パフォーマンス分析**
- **コスト分析**
- **インシデント分析**
- **改善提案**

## トラブルシューティング

### 1. よくある問題と対処法

#### 高レスポンス時間
```bash
# 原因調査手順
1. Convexダッシュボードでボトルネック特定
2. データベースクエリの最適化確認
3. CDNキャッシュ状況確認
4. 必要に応じてスケールアップ
```

#### エラー率上昇
```bash
# 対処手順
1. Sentryでエラー詳細確認
2. 影響範囲の特定
3. 緊急修正の必要性判断
4. ユーザー向け告知の検討
```

### 2. エスカレーション手順

#### Level 1: 自動対応
- **自動復旧**: システムの自動回復
- **自動スケーリング**: 負荷に応じた自動調整

#### Level 2: チーム対応
- **開発チーム**: 技術的問題の対応
- **運用チーム**: システム運用の対応

#### Level 3: 管理層エスカレーション
- **重大インシデント**: 事業影響が大きい場合
- **セキュリティ問題**: セキュリティ関連の問題

## 改善計画

### 短期改善（1-3ヶ月）
- [ ] 予測アラートの実装
- [ ] ダッシュボードのカスタマイズ
- [ ] 自動復旧機能の拡充

### 中期改善（3-6ヶ月）
- [ ] AI/MLによる異常検知
- [ ] 業務メトリクスの強化
- [ ] 顧客影響度の可視化

### 長期改善（6-12ヶ月）
- [ ] 予測スケーリング
- [ ] ゼロダウンタイム運用
- [ ] 完全自動化運用

---

**関連ドキュメント**:
- [コスト分析](./cost-analysis.md)
- [環境セットアップ](./setup/environment.md)
- [パフォーマンス最適化](../technical/implementation/performance-optimizations.md)