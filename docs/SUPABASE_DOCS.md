# Supabase データベース仕様書

最終更新日: 2025年1月

## 概要

このドキュメントは、BockerプロジェクトのSupabaseデータベースの最新仕様を記載しています。
データベースは顧客管理、予約管理、ポイント管理、カルテ管理、トラッキングの各機能をサポートしています。

## システム構成

- **プロジェクト名**: Bocker
- **プロジェクトID**: fxpdfqrnaifxokumgrht
- **リージョン**: ap-northeast-1
- **PostgreSQLバージョン**: 15.8.1.094
- **Convexとの連携**: 一部のテーブルでConvex IDを保持

# 開発環境
- **プロジェクト名**: DEV_Bocker
- **プロジェクトID**: kafcgxiddgxbuimeitrm
- **リージョン**: ap-northeast-1
- **PostgreSQLバージョン**: 15.8.1.094
- **Convexとの連携**: 一部のテーブルでConvex IDを保持

## ID設計ルール

### 統一されたID型の設計方針

| ID種別 | データ型 | 用途 | 例 |
|--------|----------|------|-----|
| Supabase内部ID | UUID | Supabase内でのリレーション | customer.uid, carte.id |
| Convex参照ID | TEXT | Convexシステムへの参照 | staff_id, coupon_id, _convex_id |
| 外部システムID | TEXT | 外部システムとの連携 | stripe_checkout_session_id |

### 設計原則
1. **Supabase内でのリレーション**: UUID型を使用し、外部キー制約を設定
2. **Convexへの参照**: TEXT型を使用し、外部キー制約は設定しない
3. **データ移行**: Convex IDは`_convex_`プレフィックスを付けて保存

## データライフサイクル管理

すべてのテーブルに以下のフィールドが設定されています：

- **is_archive** (boolean): アーカイブフラグ、デフォルト値 `false`
- **deleted_at** (timestamptz): 自動削除予定日時

### deleted_atのデフォルト値設定

| テーブルグループ | deleted_atデフォルト値 | 対象テーブル |
|-----------------|---------------------|------------|
| 長期保存データ | 作成日時 + 3年 | customer, customer_detail, customer_points, reservation, reservation_detail |
| 短期保存データ | 作成日時 + 2年 | point_task_queue, point_transaction, coupon_transaction, carte, carte_detail, tracking_event, tracking_summaries |

## テーブル一覧

### 1. customer（顧客マスター）

顧客の基本情報を管理するマスターテーブル。システムの中心的なテーブルです。

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|----------|----------|--------------|------|
| uid | uuid | NO | gen_random_uuid() | 主キー |
| tenant_id | text | NO | '' | テナントID |
| org_id | text | NO | '' | 組織ID |
| line_id | text | YES | - | LINE ID |
| line_user_name | text | YES | - | LINEユーザー名 |
| phone | text | YES | - | 電話番号 |
| email | text | YES | - | メールアドレス |
| password | text | YES | - | パスワード（平文） |
| password_hash | text | YES | - | パスワードハッシュ |
| first_name | text | YES | - | 名 |
| last_name | text | YES | - | 姓 |
| searchable_text | text | YES | - | 検索用統合テキスト（名前・電話・メール等を小文字で結合） |
| use_count | integer | YES | - | 利用回数 |
| last_reservation_date_unix | bigint | YES | - | 最終予約日時（Unix時間） |
| initial_tracking | jsonb | YES | - | 初回トラッキング情報 |
| tags | text[] | YES | - | タグ配列 |
| total_reservation_count | integer | YES | - | 総予約回数 |
| customer_type | text | YES | - | 顧客タイプ |
| sort_key | text | YES | - | ソートキー |
| _creation_time | timestamptz | YES | now() | 作成日時（Convex由来） |
| is_archive | boolean | YES | false | アーカイブフラグ |
| updated_time | timestamptz | YES | now() | 更新日時（Convex由来） |
| created_at | timestamptz | NO | now() | 作成日時 |
| updated_at | timestamptz | NO | now() | 更新日時 |
| deleted_at | timestamptz | YES | NOW() + INTERVAL '3 years' | 自動削除予定日時 |

**インデックス**: 
- PRIMARY KEY (uid)

### 2. customer_detail（顧客詳細）

顧客の詳細情報を管理するテーブル。

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|----------|----------|--------------|------|
| uid | uuid | NO | - | 主キー |
| customer_uid | uuid | NO | - | 顧客ID（外部キー） |
| customer_id | uuid | YES | - | 顧客ID（レガシー） |
| email | text | YES | - | メールアドレス |
| age | integer | YES | - | 年齢 |
| birthday | date | YES | - | 誕生日 |
| gender | text | YES | - | 性別 |
| notes | text | YES | - | 備考 |
| tenant_id | text | NO | '' | テナントID |
| org_id | text | NO | '' | 組織ID |
| sort_key | text | YES | - | ソートキー |
| _creation_time | timestamptz | YES | now() | 作成日時（Convex由来） |
| is_archive | boolean | YES | false | アーカイブフラグ |
| updated_time | timestamptz | YES | now() | 更新日時（Convex由来） |
| created_at | timestamptz | NO | now() | 作成日時 |
| updated_at | timestamptz | NO | now() | 更新日時 |
| deleted_at | timestamptz | YES | NOW() + INTERVAL '3 years' | 自動削除予定日時 |

**制約**:
- PRIMARY KEY (uid)
- FOREIGN KEY (customer_uid) REFERENCES customer(uid)

### 3. customer_points（顧客ポイント）

顧客のポイント情報を管理するテーブル。

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|----------|----------|--------------|------|
| uid | uuid | NO | - | 主キー |
| customer_uid | uuid | NO | - | 顧客ID（外部キー） |
| customer_id | uuid | YES | - | 顧客ID（レガシー） |
| total_points | integer | YES | - | 合計ポイント |
| last_transaction_date_unix | bigint | YES | - | 最終取引日時（Unix時間） |
| tenant_id | text | NO | '' | テナントID |
| org_id | text | NO | '' | 組織ID |
| sort_key | text | YES | - | ソートキー |
| _creation_time | timestamptz | YES | now() | 作成日時（Convex由来） |
| is_archive | boolean | YES | false | アーカイブフラグ |
| updated_time | timestamptz | YES | now() | 更新日時（Convex由来） |
| created_at | timestamptz | NO | now() | 作成日時 |
| updated_at | timestamptz | NO | now() | 更新日時 |
| deleted_at | timestamptz | YES | NOW() + INTERVAL '3 years' | 自動削除予定日時 |

**制約**:
- PRIMARY KEY (uid)
- FOREIGN KEY (customer_uid) REFERENCES customer(uid)

### 4. point_transaction（ポイント取引）

ポイント取引の履歴を管理するテーブル。

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|----------|----------|--------------|------|
| id | uuid | NO | gen_random_uuid() | 主キー |
| tenant_id | text | NO | - | テナントID |
| org_id | text | NO | - | 組織ID |
| reservation_id | text | YES | - | 予約ID（Convex形式） |
| customer_id | uuid | NO | - | 顧客ID（外部キー） |
| points | integer | NO | - | ポイント数 |
| transaction_type | text | YES | - | 取引タイプ |
| transaction_date_unix | bigint | NO | - | 取引日時（Unix時間） |
| description | text | YES | - | 説明 |
| sort_key | text | YES | - | ソートキー |
| created_at | timestamptz | NO | now() | 作成日時 |
| updated_at | timestamptz | NO | now() | 更新日時 |
| is_archive | boolean | NO | false | アーカイブフラグ |
| deleted_at | timestamptz | YES | NOW() + INTERVAL '2 years' | 自動削除予定日時 |

**制約**:
- PRIMARY KEY (id)
- FOREIGN KEY (customer_id) REFERENCES customer(uid) [fk_point_transaction_customer]

### 5. point_task_queue（ポイントタスクキュー）

予定されたポイント付与タスクを管理するテーブル。

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|----------|----------|--------------|------|
| id | uuid | NO | gen_random_uuid() | 主キー |
| tenant_id | text | NO | - | テナントID |
| org_id | text | NO | - | 組織ID |
| reservation_id | text | YES | - | 予約ID（Convex形式） |
| customer_id | uuid | NO | - | 顧客ID（外部キー） |
| points | integer | YES | - | ポイント数 |
| scheduled_for_unix | bigint | YES | - | 実行予定日時（Unix時間） |
| status | text | YES | - | ステータス |
| sort_key | text | YES | - | ソートキー |
| created_at | timestamptz | NO | now() | 作成日時 |
| updated_at | timestamptz | NO | now() | 更新日時 |
| is_archive | boolean | NO | false | アーカイブフラグ |
| deleted_at | timestamptz | YES | NOW() + INTERVAL '2 years' | 自動削除予定日時 |

**制約**:
- PRIMARY KEY (id)
- FOREIGN KEY (customer_id) REFERENCES customer(uid) [fk_point_task_queue_customer]

### 6. coupon_transaction（クーポン取引）

クーポン使用履歴を管理するテーブル。

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|----------|----------|--------------|------|
| id | uuid | NO | gen_random_uuid() | 主キー |
| tenant_id | text | NO | - | テナントID |
| org_id | text | NO | - | 組織ID |
| coupon_id | text | NO | - | クーポンID（Convex形式・TEXT型） |
| customer_id | uuid | NO | - | 顧客ID（外部キー） |
| reservation_id | text | NO | - | 予約ID（Convex形式） |
| transaction_date_unix | bigint | NO | - | 取引日時（Unix時間） |
| discount_amount | integer | YES | - | 割引額 |
| sort_key | text | YES | - | ソートキー |
| created_at | timestamptz | NO | now() | 作成日時 |
| updated_at | timestamptz | NO | now() | 更新日時 |
| is_archive | boolean | NO | false | アーカイブフラグ |
| deleted_at | timestamptz | YES | NOW() + INTERVAL '2 years' | 自動削除予定日時 |

**制約**:
- PRIMARY KEY (id)
- FOREIGN KEY (customer_id) REFERENCES customer(uid)

### 7. carte（カルテ）

顧客のカルテ基本情報を管理するテーブル。顧客一人に一つのカルテが紐づく。

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|----------|----------|--------------|------|
| id | uuid | NO | gen_random_uuid() | 主キー |
| tenant_id | text | NO | - | テナントID |
| org_id | text | NO | - | 組織ID |
| customer_id | uuid | NO | - | 顧客ID（外部キー） |
| skin_type | text | YES | - | 肌タイプ |
| hair_type | text | YES | - | 髪タイプ |
| allergy_history | text | YES | - | アレルギー歴 |
| medical_history | text | YES | - | 医療歴 |
| ltv_price | integer | YES | 0 | 顧客の累計購入総額（LTV: Life Time Value） |
| sort_key | text | YES | - | ソートキー |
| created_at | timestamptz | NO | now() | 作成日時 |
| updated_at | timestamptz | NO | now() | 更新日時 |
| is_archive | boolean | NO | false | アーカイブフラグ |
| deleted_at | timestamptz | YES | NOW() + INTERVAL '2 years' | 自動削除予定日時 |

**制約**:
- PRIMARY KEY (id)
- FOREIGN KEY (customer_id) REFERENCES customer(uid)

### 8. carte_detail（カルテ詳細）

施術ごとのカルテ詳細情報を管理するテーブル。予約のたびに生成する。

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|----------|----------|--------------|------|
| id | uuid | NO | gen_random_uuid() | 主キー |
| tenant_id | text | NO | - | テナントID |
| org_id | text | NO | - | 組織ID |
| carte_id | uuid | NO | - | カルテID（外部キー） |
| reservation_id | text | NO | - | 予約ID（Convex形式・TEXT型） |
| staff_id | text | NO | - | スタッフID（Convex形式・TEXT型） |
| after_images | jsonb | YES | - | 施術後の画像パス（original_url, thumbnail_url × 4枚 = 計8枚） |
| menu_details | jsonb | YES | - | メニュー詳細情報（Convex ID、名前、数量、価格を含む） |
| option_details | jsonb | YES | - | オプション詳細情報（Convex ID、名前、数量、価格を含む） |
| total_price | integer | YES | - | 合計金額 |
| notes | text | YES | - | 備考 |
| customer_requests | text | YES | - | お客様のリクエスト |
| sort_key | text | YES | - | ソートキー |
| created_at | timestamptz | NO | now() | 作成日時 |
| updated_at | timestamptz | NO | now() | 更新日時 |
| is_archive | boolean | NO | false | アーカイブフラグ |
| deleted_at | timestamptz | YES | NOW() + INTERVAL '2 years' | 自動削除予定日時 |

**制約**:
- PRIMARY KEY (id)
- FOREIGN KEY (carte_id) REFERENCES carte(id)

**JSONBフィールドの構造例**:
```json
// after_images
[
  {
    "original_url": "path/to/image1.jpg",
    "thumbnail_url": "path/to/thumb1.jpg"
  },
  // ... 計4枚分
]

// menu_details
[
  {
    "id": "convex_menu_id",
    "name": "カット",
    "quantity": 1,
    "price": 3000
  }
]

// option_details
[
  {
    "id": "convex_option_id",
    "name": "トリートメント",
    "quantity": 1,
    "price": 1500
  }
]
```

### 9. reservation（予約）

予約情報を管理するテーブル。Convexから移行されたデータを含みます。

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|----------|----------|--------------|------|
| uid | uuid | NO | gen_random_uuid() | 主キー |
| _convex_id | text | NO | - | Convexでの元のレコードID（一意識別子として使用） |
| tenant_id | text | NO | - | テナントID（Convex形式） |
| org_id | text | NO | - | 組織ID（Convex形式） |
| customer_id | uuid | YES | - | Supabase customer UUID（外部キー制約あり） |
| staff_id | text | NO | - | スタッフID（Convex形式） |
| customer_name | text | NO | - | 顧客名 |
| staff_name | text | NO | - | スタッフ名 |
| status | text | NO | - | 予約ステータス |
| payment_status | text | NO | - | 支払いステータス |
| stripe_checkout_session_id | text | YES | - | Stripe決済セッションID |
| date | text | NO | - | 予約日 |
| start_time_unix | bigint | NO | - | 開始時刻（Unix時間） |
| end_time_unix | bigint | NO | - | 終了時刻（Unix時間） |
| sort_key | text | YES | - | ソートキー |
| _creation_time | bigint | YES | - | 作成日時（Convex由来） |
| created_at | timestamptz | NO | now() | 作成日時 |
| updated_at | timestamptz | NO | now() | 更新日時 |
| is_archive | boolean | NO | false | アーカイブフラグ |
| deleted_at | timestamptz | YES | NOW() + INTERVAL '3 years' | 自動削除予定日時 |

**制約**:
- PRIMARY KEY (uid)
- UNIQUE (_convex_id)
- FOREIGN KEY (customer_id) REFERENCES customer(uid) [fk_reservation_customer]

**インデックス**:
- idx_reservation_customer_id (customer_id)
- idx_reservation_convex_id (_convex_id)

### 10. reservation_detail（予約詳細）

予約の詳細情報を管理するテーブル。

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|----------|----------|--------------|------|
| uid | uuid | NO | gen_random_uuid() | 主キー |
| _convex_id | text | NO | - | Convex ID |
| _convex_reservation_id | text | NO | - | 関連する予約のConvex ID（外部キー） |
| tenant_id | text | NO | - | テナントID |
| org_id | text | NO | - | 組織ID |
| reservation_id | text | NO | - | 予約ID（Convex形式） |
| coupon_id | text | YES | - | クーポンID（Convex形式） |
| total_price | integer | YES | - | 合計金額 |
| payment_method | text | NO | - | 支払い方法 |
| menus | jsonb | YES | - | メニュー配列 |
| options | jsonb | YES | - | オプション配列 |
| extra_charge | integer | YES | - | 追加料金 |
| use_points | integer | YES | - | 使用ポイント |
| coupon_discount | integer | YES | - | クーポン割引額 |
| featured_hair_images | jsonb | YES | - | ヘアスタイル画像 |
| notes | text | YES | - | 備考 |
| sort_key | text | YES | - | ソートキー |
| _creation_time | bigint | YES | - | 作成日時（Convex由来） |
| created_at | timestamptz | NO | now() | 作成日時 |
| updated_at | timestamptz | NO | now() | 更新日時 |
| is_archive | boolean | NO | false | アーカイブフラグ |
| deleted_at | timestamptz | YES | NOW() + INTERVAL '3 years' | 自動削除予定日時 |

**制約**:
- PRIMARY KEY (uid)
- UNIQUE (_convex_id)
- FOREIGN KEY (_convex_reservation_id) REFERENCES reservation(_convex_id) ON DELETE CASCADE

**インデックス**:
- idx_reservation_detail_convex_reservation_id (_convex_reservation_id)
- idx_reservation_detail_reservation_id (reservation_id)

### 11. tracking_event（トラッキングイベント）

ユーザー行動のトラッキングイベントを記録するテーブル。

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|----------|----------|--------------|------|
| id | uuid | NO | gen_random_uuid() | 主キー |
| tenant_id | text | NO | - | テナントID |
| org_id | text | NO | - | 組織ID |
| session_id | text | NO | - | セッションID |
| event_timestamp_unix | bigint | NO | - | イベント発生時刻（Unix時間） |
| event_type | text | NO | - | イベントタイプ |
| event_source | text | NO | - | イベントソース |
| page_url | text | YES | - | ページURL |
| page_title | text | YES | - | ページタイトル |
| target_element | text | YES | - | 対象要素 |
| utm_source | text | YES | - | UTMソース |
| utm_medium | text | YES | - | UTMメディア |
| utm_campaign | text | YES | - | UTMキャンペーン |
| utm_term | text | YES | - | UTMターム |
| utm_content | text | YES | - | UTMコンテンツ |
| custom_data_json | jsonb | YES | - | カスタムデータ |
| sort_key | text | YES | - | ソートキー |
| created_at | timestamptz | NO | now() | 作成日時 |
| updated_at | timestamptz | NO | now() | 更新日時 |
| is_archive | boolean | NO | false | アーカイブフラグ |
| deleted_at | timestamptz | YES | NOW() + INTERVAL '2 years' | 自動削除予定日時 |

**制約**:
- PRIMARY KEY (id)

### 12. tracking_summaries（トラッキング集計）

トラッキングデータの集計結果を保存するテーブル。

| カラム名 | データ型 | NULL許可 | デフォルト値 | 説明 |
|---------|----------|----------|--------------|------|
| id | uuid | NO | gen_random_uuid() | 主キー |
| tenant_id | text | NO | - | テナントID |
| org_id | text | NO | - | 組織ID |
| summary_date | date | NO | - | 集計日 |
| dimension_type | text | NO | - | ディメンションタイプ |
| dimension_value | text | NO | - | ディメンション値 |
| total_count | integer | NO | - | 合計カウント |
| unique_user_count | integer | YES | - | ユニークユーザー数 |
| conversion_count | integer | YES | - | コンバージョン数 |
| sort_key | text | YES | - | ソートキー |
| created_at | timestamptz | NO | now() | 作成日時 |
| updated_at | timestamptz | NO | now() | 更新日時 |
| is_archive | boolean | NO | false | アーカイブフラグ |
| deleted_at | timestamptz | YES | NOW() + INTERVAL '2 years' | 自動削除予定日時 |

**制約**:
- PRIMARY KEY (id)

## 外部キー制約一覧

| 子テーブル | 子カラム | 親テーブル | 親カラム | 削除時の動作 | 制約名 |
|-----------|---------|-----------|---------|-------------|--------|
| customer_detail | customer_uid | customer | uid | RESTRICT | customer_detail_customer_uid_fkey |
| customer_points | customer_uid | customer | uid | RESTRICT | customer_points_customer_uid_fkey |
| point_transaction | customer_id | customer | uid | RESTRICT | fk_point_transaction_customer |
| point_task_queue | customer_id | customer | uid | RESTRICT | fk_point_task_queue_customer |
| coupon_transaction | customer_id | customer | uid | RESTRICT | coupon_transaction_customer_id_fkey |
| carte | customer_id | customer | uid | CASCADE | carte_customer_id_fkey |
| carte_detail | carte_id | carte | id | CASCADE | carte_detail_carte_id_fkey |
| reservation | customer_id | customer | uid | RESTRICT | fk_reservation_customer |
| reservation_detail | _convex_reservation_id | reservation | _convex_id | CASCADE | reservation_detail_convex_reservation_id_fkey |

**注意**: 以下のカラムは外部キー制約がありません（Convex参照のため）
- carte_detail.staff_id (TEXT型)
- carte_detail.reservation_id (TEXT型)
- coupon_transaction.coupon_id (TEXT型)
- reservation.staff_id (TEXT型)
- reservation_detail.coupon_id (TEXT型)

## 関数（Functions）

### 1. create_customer_with_details_and_points
顧客、顧客詳細、ポイント情報を一括で作成する関数。

**パラメータ（16個）**:
- p_email, p_first_name, p_last_name, p_phone
- p_tenant_id, p_org_id
- p_line_id, p_line_user_name
- p_password_hash
- p_detail_email, p_detail_gender, p_detail_birthday (date型)
- p_detail_age, p_detail_notes
- p_initial_points
- p_customer_type (デフォルト値: 'first_time')

### 2. update_customer_with_details_and_points
顧客、顧客詳細、ポイント情報を一括で更新する関数。

### 3. delete_customer_and_related_data
顧客と関連する全データを削除する関数。

### 4. search_customers_by_similarity
顧客を類似度で検索する関数（pg_trgm拡張を使用）。

### 5. update_modified_column / update_updated_at_column
更新日時を自動更新するトリガー関数。

## 拡張機能（Extensions）

- **btree_gin**: B-treeインデックスとGINインデックスの組み合わせ
- **pg_trgm**: トライグラムによる類似度検索

## セキュリティ上の注意事項

### ⚠️ Row Level Security (RLS)
**現在、全てのテーブルでRLSが無効になっています。** これは重大なセキュリティリスクです。
早急にRLSポリシーを設定し、適切なアクセス制御を実装する必要があります。

### 推奨されるRLSポリシーの例：
```sql
-- customerテーブルのRLSを有効化
ALTER TABLE customer ENABLE ROW LEVEL SECURITY;

-- テナントベースのアクセス制御ポリシー
CREATE POLICY "tenant_isolation" ON customer
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id'));
```

## 移行に関する注意事項

### Convexからの移行
- `_convex_id`カラムでConvexのレコードIDを保持
- reservation関連のテーブルは特にConvex依存が強い
- staff_id、coupon_idなどは現在Convexで管理（TEXT型で保存）

### データ型の変換
- 日時データはUnix時間（bigint）とtimestamptzの両方で管理
- customer_idは全てUUID型に統一（2025年1月の改修で実施）
- Convex参照IDは全てTEXT型に統一（2025年1月の改修で実施）

## パフォーマンス最適化

### インデックス戦略
- 外部キー制約のカラムには自動的にインデックスが作成される
- 検索頻度の高いカラム（customer_id、_convex_id）には追加インデックスを設定
- searchable_textカラムでの全文検索に対応

### 推奨される追加インデックス
```sql
-- 日付範囲検索用
CREATE INDEX idx_reservation_date_range ON reservation(start_time_unix, end_time_unix);

-- ステータス別検索用
CREATE INDEX idx_reservation_status ON reservation(status) WHERE is_archive = false;

-- Convex ID検索用（TEXT型）
CREATE INDEX idx_carte_detail_staff_id ON carte_detail(staff_id);
CREATE INDEX idx_carte_detail_reservation_id ON carte_detail(reservation_id);

-- deleted_at検索用（アーカイブ処理の効率化）
CREATE INDEX idx_customer_deleted_at ON customer(deleted_at) WHERE is_archive = false;
CREATE INDEX idx_point_transaction_deleted_at ON point_transaction(deleted_at) WHERE is_archive = false;
```

## 今後の改善提案

1. **RLSポリシーの実装**（最優先）
2. **欠落しているマスターテーブルの追加**
   - staffテーブル（Convexとの同期またはSupabase管理）
   - couponテーブル（Convexとの同期またはSupabase管理）
3. **監査ログ機能の追加**
4. **パーティショニングの検討**（tracking_eventなど大量データテーブル）
5. **Convex依存の段階的解消**
6. **自動アーカイブ処理の実装**（deleted_atを利用した定期バッチ）

## 変更履歴

### 2025年1月の主な変更
1. reservation.master_idカラムを削除
2. reservation.customer_idをUUID型に変更し外部キー制約を追加
3. Convex参照IDを全てTEXT型に統一：
   - carte_detail.staff_id: UUID → TEXT
   - carte_detail.reservation_id: UUID → TEXT
   - coupon_transaction.coupon_id: UUID → TEXT
4. 外部キー制約の命名規則を統一（fk_プレフィックス）
5. **carteテーブルにltv_priceフィールドを追加**（顧客の累計購入総額を管理）
6. **carte_detailテーブルの大幅な整理と機能追加**：
   - 新規追加フィールド：
     - after_images: 施術後の画像パス（8枚分）
     - menu_details: Convex IDを含むメニュー詳細情報
     - option_details: Convex IDを含むオプション詳細情報
     - total_price: 合計金額
     - customer_requests: お客様のリクエスト
   - フィールド名の修正：
     - customre_requests → customer_requests（タイポ修正）
7. **create_customer_with_details_and_points関数の重複を解消**
   - 古い15パラメータ版を削除
   - 16パラメータ版（p_customer_type付き）を保持
8. **全テーブルにdeleted_atフィールドを追加**
   - 長期保存データ（customer等）: 3年後に自動削除
   - 短期保存データ（point_transaction等）: 2年後に自動削除

### carte_detailテーブルで削除されたレガシーフィールド

2025年1月の改修で、以下の不要なフィールドをcarte_detailテーブルから削除しました：

| 削除されたフィールド | データ型 | 削除理由 |
|---------------------|----------|----------|
| before_hair_img_path | text | after_imagesフィールドに統合 |
| after_hair_img_path | text | after_imagesフィールドに統合 |
| menu_details_json | jsonb | menu_detailsフィールドにリネーム・構造変更 |
| used_products_json | jsonb | 使用されていないレガシーフィールド |
| customer_requests | text | customer_requestsフィールドと重複（タイポ版が残存） |

これらの変更により、carte_detailテーブルはより整理され、明確な構造を持つようになりました。