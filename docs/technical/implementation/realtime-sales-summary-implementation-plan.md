# リアルタイム売上集計システム実装計画

## 📊 概要

Bockerプロジェクトにリアルタイム売上集計システムを実装し、予約完了時に即座に売上データを集計・表示する機能を追加します。

### 🎯 目標
- **パフォーマンス**: 既存のN+1クエリ問題を解決し、99%の高速化を実現
- **リアルタイム性**: 予約完了と同時に売上集計を更新
- **セキュリティ**: Clerk認証 + HMAC署名 + RLS によるマルチテナント隔離
- **運用性**: シンプルなSSR設計、WebSocket不要

## 🏗️ アーキテクチャ

### データフロー
```
ブラウザ → Next.js Server Component → Clerk認証 → HMAC署名 → Supabase → RLS → 集計テーブル
                                                    ↓
予約完了 → PostgreSQLトリガー → リアルタイム集計更新
```

### セキュリティ設計
- **Clerk認証**: Middleware でセッション検証
- **HMAC署名**: ヘッダー偽装対策
- **RLS**: テナント間データ隔離
- **専用ロール**: 集計更新権限分離

## 📁 ファイル構成

```
bocker/
├── docs/technical/implementation/
│   └── realtime-sales-summary-implementation-plan.md  # この文書
├── supabase/migrations/
│   ├── 20250710000000_create_sales_summary_tables.sql      # 集計テーブル作成
│   ├── 20250710000001_create_sales_summary_rls.sql         # RLS設定
│   ├── 20250710000002_create_sales_summary_triggers.sql    # リアルタイムトリガー
│   ├── 20250710000003_create_sales_summary_backfill.sql    # バックフィル処理
│   └── 20250710000004_optimize_autovacuum.sql              # VACUUM最適化
├── tests/
│   └── sales_summary_test.sql                              # pgTAPテスト
├── lib/
│   ├── secure-token.ts                                     # HMAC署名システム
│   └── supabase/
│       └── server-client.ts                               # セキュアSupabaseクライアント
├── services/supabase/repositories/analytics/
│   └── SalesSummaryRepository.ts                          # 集計データアクセス
├── middleware.ts                                          # Clerk → ヘッダー変換
├── app/dashboard/sales/
│   └── page.tsx                                           # 売上ダッシュボード
└── docs/technical/implementation/
    ├── realtime-sales-summary-deployment.md              # デプロイ手順書
    └── realtime-sales-summary-testing.md                 # テスト手順書
```

## 🔄 実装フェーズ

### Phase 1: データベース基盤 (High Priority)
#### 1.1 集計テーブル作成
- `daily_sales_summary`: 日別売上集計
- `staff_sales_summary`: スタッフ別売上集計  
- `menu_sales_summary`: メニュー別売上集計
- 基本インデックス + updated_at自動更新

#### 1.2 RLS設定
- 専用ロール `role_sales_writer` 作成
- ヘッダーベースRLSポリシー (`current_setting('request.headers.x-tenant-id')`)
- 直接更新禁止ポリシー

#### 1.3 VACUUM最適化  
- UPDATE頻発対策: `autovacuum_vacuum_scale_factor = 0.02`
- 膨張抑制設定

#### 1.4 リアルタイム集計トリガー
- `update_sales_summaries()` 関数
- reservation テーブルの INSERT/UPDATE トリガー
- JSONB一括処理による高速化
- SECURITY DEFINER による権限昇格

### Phase 2: セキュリティ基盤 (High Priority)  
#### 2.1 HMAC署名システム (`lib/secure-token.ts`)
```typescript
export const sign = (value: string) => crypto.createHmac('sha256', SECRET).update(value).digest('hex')
export const verify = (value: string, sig: string) => crypto.timingSafeEqual(...)
```

#### 2.2 セキュアSupabaseクライアント (`lib/supabase/server-client.ts`)
- ヘッダー検証付きクライアント生成
- **重要**: 署名検証はNext.js側で完結（Supabaseでは検証しない）
- エラーハンドリング強化

#### 2.3 Middleware強化 (`middleware.ts`)
- Clerk認証からのヘッダー生成
- 署名付きヘッダー設定
- ダッシュボード・API Route 対象

### Phase 3: テスト基盤 (Medium Priority)
#### 3.1 pgTAPテスト (`tests/sales_summary_test.sql`)
- RLS隔離テスト
- トリガー動作確認
- データ整合性テスト

#### 3.2 CI統合
- 自動テスト実行
- デグレ検知

### Phase 4: アプリケーション層 (Medium Priority)
#### 4.1 SalesSummaryRepository
- BaseRepositoryを継承
- O(1)高速集計取得メソッド
- 既存ReservationRepositoryの統計機能置き換え

#### 4.2 売上ダッシュボード (`app/dashboard/sales/page.tsx`)
- SSRによるリアルタイム表示
- 日別・スタッフ別・メニュー別集計
- シンプルなテーブル形式

### Phase 5: データ移行 & 統合 (Medium Priority)  
#### 5.1 バックフィル処理
- 既存予約データからの初期集計
- トリガーON/OFF制御
- 安全な一括処理

#### 5.2 既存機能統合
- ReservationRepository.getOrganizationReservationStats置き換え
- N+1クエリ問題解決

### Phase 6: デプロイ & ドキュメント (Low Priority)
#### 6.1 デプロイ手順書
- 環境変数設定
- マイグレーション実行順序
- Clerk設定方法

#### 6.2 PR作成 & レビュー
- main ブランチへのマージ

## 🛡️ セキュリティ考慮事項

### ヘッダー偽装対策
1. **サーバーサイドでのみヘッダー生成**
   - Middleware で Clerk → 署名付きヘッダー
   - ブラウザ直接アクセス禁止

2. **HMAC-SHA256署名**
   ```typescript
   const signature = generateHmac(`${tenantId}:${orgId}`)
   ```

3. **検証ポイント**
   - ❌ Supabase RLS内での検証（技術的制約）
   - ✅ Next.js API層での検証完結

### マルチテナント隔離
1. **RLSポリシー**
   ```sql
   USING (tenant_id = current_setting('request.headers.x-tenant-id', true))
   ```

2. **専用ロール**
   - `role_sales_writer`: 集計テーブル更新専用
   - SECURITY DEFINER: トリガー関数の権限昇格

### データ整合性
1. **原子的UPSERT**
   ```sql
   INSERT ... ON CONFLICT ... DO UPDATE
   ```

2. **トランザクション保証**
   - 予約完了 + 集計更新が同一トランザクション
   - エラー時の自動ロールバック

## ⚡ パフォーマンス最適化

### クエリ最適化
1. **JSONB一括処理**
   ```sql
   INSERT ... SELECT * FROM jsonb_to_recordset(detail_record.menus)
   ```

2. **部分インデックス**
   ```sql
   CREATE INDEX ... WHERE is_archive = false AND deleted_at IS NULL
   ```

3. **ON CONFLICT による原子的UPSERT**
   - ロック期間最小化
   - 競合状態の安全な処理

### ロック競合対策
1. **更新順序の統一**
   - 日別 → スタッフ別 → メニュー別
   - デッドロック回避

2. **VACUUM設定**
   ```sql
   autovacuum_vacuum_scale_factor = 0.02
   autovacuum_analyze_scale_factor = 0.01
   ```

### スケーラビリティ
1. **パーティション対応準備**
   - 日付ベースパーティション
   - 大量データ対応

2. **アーカイブ戦略**
   - expiry_at による自動アーカイブ予定
   - deleted_at による論理削除

## 🔧 環境変数

### 新規追加
```env
HEADER_SIGNATURE_SECRET=your-secret-key-here
```

### 既存確認
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Clerk設定
```typescript
// publicMetadata に追加
{
  "tenant_id": "tenant_123",
  "org_id": "org_456"
}
```

## 📊 期待効果

### パフォーマンス向上
- **N+1クエリ → O(1)**: 統計取得時間 99%短縮
- **リアルタイム集計**: 予約完了即時反映
- **メモリ効率**: 事前計算済みデータの高速読み取り

### 開発・運用効率
- **シンプルSSR**: WebSocket不要、複雑な状態管理なし
- **既存構造準拠**: プロジェクトのマルチテナント設計と完全整合
- **段階的実装**: 各フェーズでの動作確認

### セキュリティ強化
- **多層防御**: Clerk + HMAC + RLS
- **監査ログ**: 集計テーブルの変更履歴
- **権限分離**: 専用ロールによる最小権限

## 🚀 実装開始手順

### 1. ブランチ作成
```bash
git checkout -b feature/realtime-sales-summary
git push -u origin feature/realtime-sales-summary
```

### 2. 環境変数設定
```bash
echo "HEADER_SIGNATURE_SECRET=$(openssl rand -hex 32)" >> .env.local
```

### 3. マイグレーション実行
```bash
pnpm migrate:supabase
```

### 4. 段階的実装
各フェーズごとに実装・テスト・確認を行い、安全に進める。

---

## 📝 実装ログ

### 2025-01-10
- ✅ 実装計画書作成
- ⏳ Phase 1: データベース基盤開始

### TODO
- [ ] ブランチ作成
- [ ] 集計テーブル作成
- [ ] RLS設定
- [ ] トリガー実装
- [ ] セキュリティ基盤
- [ ] アプリケーション層
- [ ] テスト・デプロイ

---

*この計画書は実装進捗に応じて更新されます。*