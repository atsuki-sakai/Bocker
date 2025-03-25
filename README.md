# Bcker / ブッカー サロン向け予約管理Saas

## 概要

Bcker SaaSはサロン向けの予約・管理システムです。顧客が簡単に予約を作成でき、スタッフが効率的に予約管理を行えることを目的としています。

## 技術スタック

### フロントエンド
- Next.js 15.1.3
- React 19.0.0
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Framer Motion

### バックエンド
- Convex
- Clerk

### その他
- Stripe
- Sentry

## プロジェクト構造

```
app/
├── (salon)/
├── (auth)/
└── reservation/

convex/
├── salon/
├── staff/
├── customer/
├── reservation/
├── menu/
├── coupon/
├── subscription/
├── schedule/
└── point/
```

## 機能一覧

### 顧客向け
- 予約システム（作成・変更・キャンセル）
- 決済処理（Stripe対応）
- ポイント取得・利用
- クーポン適用

### スタッフ向け
- 予約管理（確認・変更・キャンセル）
- スケジュール管理
- メニュー管理
- 顧客管理

### サロン管理
- サロン情報管理
- スタッフ管理
- サブスクリプション管理
- クーポン・ポイント管理

