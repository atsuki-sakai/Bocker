# Bocker SaaS 多言語化実装フェーズ

## Phase 1: next-intl導入 (完了)
✅ next-intlパッケージをインストール  
✅ i18n設定ファイルを作成  
✅ メッセージファイル（日本語・英語）を作成  
✅ middleware.tsを更新してlocale処理を追加  
✅ app/[locale]ディレクトリ構造に変更  
✅ 言語切り替えコンポーネントを作成  
✅ 認証画面（サインイン・サインアップ）を多言語化  

# 日付のフォーマットの国際化
// ■ 日付フォーマット
import { formatDate } from '@/lib/formatDate'
import type { SupportedLocale } from '@/lib/dateLocale'

const locale = useLocale() as SupportedLocale


const [selectedDate, setSelectedDate] = useState(() => new Date())
const [dateLabel, setDateLabel] = useState('')


useEffect(() => {
  const formatSelectedDate = async () => {
    const formatted = await formatDate(selectedDate, 'PPP', locale)
    setDateLabel(formatted)
  }
  formatSelectedDate()
}, [selectedDate, locale])



<span className="text-xs md:text-base font-bold text-primary">{dateLabel}</span>

---



---

## Phase 2: ダッシュボード主要画面の多言語化

### 2-1. DashBoard・Componentsの多言語化
**タスク管理（ここで完了したページを　x でマークしてください）**:
- [x] NAV_ITEMSの多言語化å
- [x] サイドバーメニュー項目の翻訳
- [x] サブスクリプション関連メッセージの翻訳
- [x] dashboard/coupon/add
- [x] dashboard/coupon/edit
- [x] dashboard/coupon/CouponList
- [x] dashboard/menu/add
- [x] dashboard/menu/[menu_id]/edit
- [x] dashboard/menu/[menu_id]/MenuDetailContent
- [x] dashboard/menu/MenuList
- [x] dashboard/option/add
- [x] dashboard/option/edit
- [x] dashboard/option/OptionList
- [x] dashboard/staff/add
- [x] dashboard/staff/[staff_id]/edit
- [x] dashboard/staff/[staff_id]/StaffDetailContent
- [x] dashboard/staff/StaffList
- [x] dashboard/customer/add
- [x] dashboard/customer/[customer_id]/edit/CustomerEditForm.tsx
- [x] dashboard/customer/[customer_id]/page.tsx (顧客詳細ページ)
- [x] dashboard/point
- [x] dashboard/point/pointTabs
- [x] dashboard/reservation/[reservation_id]/page
- [x] dashboard/reservation/add
- [x] dashboard/reservation/ReservationForm
- [x] dashboard/staff-schedule
- [x] dashboard/subscription/*以下全てのページ
- [ ] 言語ファイルに重複した項目がないかja.jsonとen.jsonをチェックして最適化


### 2-2. Componentsの多言語化
- [ ] components/common/*以下のファイル全て
- [ ] components/emails/*以下のファイル全て
- [ ] 言語ファイルに重複した項目がないかja.jsonとen.jsonをチェックして最適化



### 2-3. APIのエラーメッセージの多言語化
- [ ] エラーメッセージの効果的な管理方法の策定、決定
- [ ] app/api/*エラメッセージの多言語化
- [ ] 言語ファイルに重複した項目がないかja.jsonとen.jsonをチェックして最適化



### 2-4. (auth)フォルダ以下のページの多言語化
- [ ] customer/reset-password/confirm/page.tsx
- [ ] sign-in/*配下の全てのページ
- [ ] sign-up/*は以下の全てのページ
- [ ] staff/invite-accept/page.tsx
- [ ] 言語ファイルに重複した項目がないかja.jsonとen.jsonをチェックして最適化


### 2-5. (home)フォルダ以下のページの多言語化
- [ ] maintenance/*配下の全てのページ
- [ ] page.tsx、layout.tsxの翻訳
- [ ] 言語ファイルに重複した項目がないかja.jsonとen.jsonをチェックして最適化


### 2-6. (reservation)フォルダ以下のページの多言語化
- [ ] [id]/*配下の全てのページ
- [ ] page.tsx, layout.tsx
- [ ] 言語ファイルに重複した項目がないかja.jsonとen.jsonをチェックして最適化




**翻訳対象テキスト**:
```json
{
  "navigation": {
    "dashboard": "ダッシュボード / Dashboard",
    "reservations": "予約管理 / Reservations",
    "customers": "顧客管理 / Customers", 
    "menu": "メニュー管理 / Menu Management",
    "staff": "スタッフ管理 / Staff Management",
    "options": "オプション管理 / Options",
    "coupons": "クーポン管理 / Coupons",
    "points": "ポイント管理 / Points",
    "settings": "設定 / Settings",
    "subscription": "サブスクリプション / Subscription",
    "staffSchedule": "スタッフスケジュール / Staff Schedule"
  }
}
```

### 2-2. ダッシュボードホーム画面
**ファイル**: `app/[locale]/(dashboard)/dashboard/page.tsx`

**タスク**:
- [x] ReservationLinkコンポーネントの多言語化
- [x] ReferralCardコンポーネントの多言語化
- [x] トラッキングリンク説明の多言語化
- [x] 紹介プログラム説明の多言語化

**翻訳対象テキスト**:
```json
{
  "dashboard": {
    "title": "ダッシュボード / Dashboard",
    "todayReservations": "本日の予約 / Today's Reservations",
    "monthlyRevenue": "月間売上 / Monthly Revenue",
    "totalCustomers": "総顧客数 / Total Customers",
    "newReservation": "新規予約 / New Reservation",
    "viewAll": "すべて表示 / View All"
  }
}
```

### 2-3. 共通コンポーネント
**ファイル**: `components/common/DashboardSection.tsx`, `components/common/Loading.tsx`

**タスク**:
- [x] Loadingコンポーネントの多言語化
- [x] DashboardSectionはprops経由でテキストを受け取る設計のため対応不要

---

## Phase 3: 予約・顧客管理画面の多言語化

### 3-1. 予約管理
**ファイル**: 
- `app/[locale]/(dashboard)/dashboard/reservation/page.tsx`
- `app/[locale]/(dashboard)/dashboard/reservation/ReservationList.tsx`
- `app/[locale]/(dashboard)/dashboard/reservation/add/ReservationForm.tsx`

**タスク**:
- [x] 予約タイムライン画面の基本的な多言語化
- [x] 翻訳キーの追加（タイムライン、リスト表示、ステータス等）
- [x] ReservationListコンポーネントの完全な多言語化実装
- [x] 予約詳細ダイアログの多言語化
- [x] 統計カードの多言語化

**翻訳対象テキスト**:
```json
{
  "reservations": {
    "title": "予約管理 / Reservation Management",
    "newReservation": "新規予約 / New Reservation",
    "customerName": "顧客名 / Customer Name",
    "date": "日付 / Date",
    "time": "時間 / Time",
    "service": "サービス / Service",
    "staff": "担当者 / Staff",
    "status": "ステータス / Status",
    "confirmed": "確定 / Confirmed",
    "pending": "保留中 / Pending",
    "cancelled": "キャンセル / Cancelled",
    "search": "検索 / Search",
    "filter": "フィルター / Filter"
  }
}
```

### 3-2. 顧客管理
**ファイル**:
- `app/[locale]/(dashboard)/dashboard/customer/page.tsx`
- `app/[locale]/(dashboard)/dashboard/customer/CustomerList.tsx`
- `app/[locale]/(dashboard)/dashboard/customer/add/CustomerAddForm.tsx`
- `app/[locale]/(dashboard)/dashboard/customer/[customer_id]/edit/CustomerEditForm.tsx`

**タスク**:
- [x] 顧客一覧画面の多言語化
- [ ] 顧客登録フォームの多言語化
- [ ] 顧客編集フォームの多言語化
- [ ] 顧客詳細画面の多言語化

**翻訳対象テキスト**:
```json
{
  "customers": {
    "title": "顧客管理 / Customer Management",
    "addCustomer": "顧客追加 / Add Customer",
    "editCustomer": "顧客編集 / Edit Customer",
    "firstName": "名前 / First Name",
    "lastName": "姓 / Last Name",
    "email": "メールアドレス / Email",
    "phone": "電話番号 / Phone",
    "birthday": "生年月日 / Birthday",
    "address": "住所 / Address",
    "notes": "備考 / Notes",
    "visitHistory": "来店履歴 / Visit History"
  }
}
```

### 3-3. 予約カレンダー（顧客向け）
**ファイル**:
- `app/[locale]/(reservation)/reservation/[id]/calendar/page.tsx`
- `app/[locale]/(reservation)/reservation/[id]/calendar/_components/*.tsx`

**タスク**:
- [ ] カレンダー表示の多言語化
- [ ] 日時選択画面の多言語化
- [ ] メニュー選択画面の多言語化
- [ ] スタッフ選択画面の多言語化
- [ ] 確認画面の多言語化

---

## Phase 4: 設定・管理画面の多言語化

### 4-1. メニュー・オプション管理
**ファイル**:
- `app/[locale]/(dashboard)/dashboard/menu/page.tsx`
- `app/[locale]/(dashboard)/dashboard/menu/menuList.tsx`
- `app/[locale]/(dashboard)/dashboard/menu/add/MenuAddForm.tsx`
- `app/[locale]/(dashboard)/dashboard/option/page.tsx`
- `app/[locale]/(dashboard)/dashboard/option/OptionList.tsx`

**タスク**:
- [ ] メニュー管理画面の多言語化
- [ ] メニュー登録・編集フォームの多言語化
- [ ] オプション管理画面の多言語化
- [ ] オプション登録・編集フォームの多言語化

### 4-2. スタッフ管理
**ファイル**:
- `app/[locale]/(dashboard)/dashboard/staff/page.tsx`
- `app/[locale]/(dashboard)/dashboard/staff/StaffList.tsx`
- `app/[locale]/(dashboard)/dashboard/staff/[staff_id]/edit/StaffEditForm.tsx`
- `app/[locale]/(dashboard)/dashboard/staff/_components/InviteManagement.tsx`

**タスク**:
- [ ] スタッフ一覧画面の多言語化
- [ ] スタッフ登録・編集フォームの多言語化
- [ ] スタッフ招待機能の多言語化
- [ ] スケジュール管理の多言語化

### 4-3. 設定画面
**ファイル**:
- `app/[locale]/(dashboard)/dashboard/setting/page.tsx`
- `app/[locale]/(dashboard)/dashboard/setting/_components/*.tsx`

**タスク**:
- [ ] 組織設定の多言語化
- [ ] 営業時間設定の多言語化
- [ ] 決済設定の多言語化
- [ ] API設定の多言語化
- [ ] 通知設定の多言語化

### 4-4. クーポン・ポイント管理
**ファイル**:
- `app/[locale]/(dashboard)/dashboard/coupon/page.tsx`
- `app/[locale]/(dashboard)/dashboard/point/page.tsx`

**タスク**:
- [ ] クーポン管理画面の多言語化
- [ ] ポイント管理画面の多言語化
- [ ] 設定フォームの多言語化

---

### date-fns多言語化実装

**実装内容**:
- lib/dateLocale.ts: ロケール解決ユーティリティ
- lib/formatDate.ts: 共通フォーマッター
- 動的importで必要なロケールのみ読み込み
- サポート言語: ja, en, fr, zh, ko

**使用例**:
```typescript
import { formatDate } from '@/lib/formatDate'
import { useLocale } from 'next-intl'
import type { SupportedLocale } from '@/lib/dateLocale'

const locale = useLocale() as SupportedLocale
const formatted = await formatDate(new Date(), 'PPP', locale)
```

---

## 追加実装事項

### バリデーション・エラーメッセージ
**ファイル**: `lib/validations/*.ts`

**タスク**:
- [ ] Zodスキーマエラーメッセージの多言語化
- [ ] API エラーメッセージの多言語化
- [ ] フォームバリデーションメッセージの統一

### メール通知
**ファイル**: `components/emails/*.tsx`, `lib/email_templates/*.ts`

**タスク**:
- [ ] 予約確認メールの多言語化
- [ ] パスワードリセットメールの多言語化
- [ ] 顧客登録メールの多言語化

### 通知・トーストメッセージ
**全コンポーネント横断**

**タスク**:
- [ ] toast.success/error メッセージの多言語化
- [ ] 操作完了メッセージの統一
- [ ] 確認ダイアログメッセージの多言語化

---

## 技術実装ガイドライン

### ファイル命名規則
```
languages/
├── ja.json          # 日本語
├── en.json          # 英語
└── zh.json          # 中国語（将来的）
```

### 翻訳キー命名規則
```json
{
  "feature.component.element": "テキスト / Text",
  "auth.signIn.title": "ログインページ / Sign In Page",
  "dashboard.reservations.newButton": "新規予約 / New Reservation"
}
```

### コンポーネント実装パターン
```typescript
import { useTranslations } from 'next-intl'

export function Component() {
  const t = useTranslations('feature.component')
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <Button>{t('saveButton')}</Button>
    </div>
  )
}
```

### リンク実装パターン
```typescript
import { Link } from 'next/navigation'
import { useLocale } from 'next-intl'

export function Component() {
  const locale = useLocale()
  
  return (
    <Link href={`/${locale}/dashboard`}>
      {t('navigation.dashboard')}
    </Link>
  )
}
```

---

## 推定工数・優先度

| フェーズ | 期間 | 優先度 | 依存関係 | 進捗 |
|---------|------|-------|----------|------|
| Phase 1 | - | - | - | ✅ 完了 |
| Phase 2 | 1週間 | 高 | Phase 1完了 | ✅ 完了 |
| Phase 3 | 1.5週間 | 高 | Phase 2完了 | 🟡 進行中（40%） |
| Phase 4 | 1週間 | 中 | Phase 3完了 | ⚪ 未着手 |
| 追加実装 | 0.5週間 | 低 | 全フェーズ完了 | ⚪ 未着手 |

**総工数**: 約4週間  
**開発者**: 1名  
**影響範囲**: 全画面（100+ ファイル）

## 実装済み内容（2025/1/11時点）

### 完了項目
- ✅ Phase 1: next-intl導入と基本設定
- ✅ Phase 2-1: ナビゲーション・サイドバーの多言語化
- ✅ Phase 2-2: ダッシュボードホーム画面の多言語化
- ✅ Phase 2-3: 共通コンポーネントの多言語化
- ✅ Phase 3-1: 予約管理の完全な多言語化実装（ReservationListコンポーネント）
- ✅ Phase 3-2: 顧客管理画面の多言語化（CustomerListコンポーネント）
- ✅ date-fns多言語化システムの実装
- ✅ 英語翻訳ファイル（en.json）のcustomersセクション追加

### 作成ドキュメント
- ✅ I18N_STRUCTURE.md: 翻訳ファイル構造と命名規則を定義
- ✅ lib/dateLocale.ts: date-fnsロケール管理
- ✅ lib/formatDate.ts: 多言語対応日付フォーマッター

### 次のステップ
1. CustomerAddFormコンポーネントの多言語化
2. CustomerEditFormコンポーネントの多言語化
3. メニュー管理画面の多言語化

---

## テスト計画

### 多言語表示テスト
- [ ] 各言語での画面表示確認
- [ ] 文字化け・レイアウト崩れチェック
- [ ] 長いテキストの表示確認

### 言語切り替えテスト
- [ ] 言語切り替え後のURL確認
- [ ] セッション維持確認
- [ ] ブラウザ戻る/進むボタンでの動作確認

### 機能テスト
- [ ] 各フォームでの多言語バリデーション
- [ ] 多言語メール送信テスト
- [ ] 多言語エラーメッセージ表示テスト