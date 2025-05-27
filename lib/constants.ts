
// 環境変数が設定されていない場合のデフォルト値を追加
export const BASE_URL =
  process.env.NEXT_PUBLIC_NODE_ENV === 'development'
    ? process.env.NEXT_PUBLIC_DEVELOP_URL || 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_DEPLOY_URL || 'https://bocker.jp'

// ✅ ここで許可リストを定義
export const ALLOWED_DOMAINS = ['localhost', 'bocker.jp'];

/**
 * サロンの営業時間（24時間表記）を格納する配列。
 */
export const SALON_SCHEDULE_HOURS = [
  '00:00',
  '01:00',
  '02:00',
  '03:00',
  '04:00',
  '05:00',
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
];
/**
 * 予約キャンセル可能期限（日数）選択肢。
 */
export const SALON_RESERVATION_CANCEL_LIMIT_DAYS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
];
/**
 * 予約可能期限（日数）選択肢。
 */
export const SALON_RESERVATION_LIMIT_DAYS = [
  '30',
  '60',
  '90',
  '120',
  '150',
  '180',
  '210',
  '240',
  '270',
  '300',
  '330',
  '360',
];

// トライアル期間
export const PLAN_TRIAL_DAYS = 30
// --- 設定 ---
const PLAN_CHARGE_MONTHS_YEARLY = 10    // 年額プランで請求する月数

/**
 * プラン期間（月数）定義。
 */
export const PLAN_DURATION_MONTHS = {
  MONTHLY: 1,
  YEARLY: PLAN_CHARGE_MONTHS_YEARLY,
}

export const PLAN_MONTHLY_PRICES = {
  LITE: 6000,
  PRO: 10000,
}

// --- 年額プラン定義 ---
export const PLAN_YEARLY_PRICES = {
  LITE: {
    // 実際に請求する月数分を掛ける
    price: PLAN_MONTHLY_PRICES.LITE * PLAN_DURATION_MONTHS.YEARLY,
    // 割引率 = (本来の年間総額 − 請求額) ÷ 本来の年間総額 × 100
    savingPercent:
      (((PLAN_MONTHLY_PRICES.LITE * 12 -
        PLAN_MONTHLY_PRICES.LITE * PLAN_DURATION_MONTHS.YEARLY) /
        (PLAN_MONTHLY_PRICES.LITE * 12)) *
      100).toFixed(0),
  },
  PRO: {
    price: PLAN_MONTHLY_PRICES.PRO * PLAN_DURATION_MONTHS.YEARLY,
    savingPercent:
      (((PLAN_MONTHLY_PRICES.PRO * 12 -
        PLAN_MONTHLY_PRICES.PRO * PLAN_DURATION_MONTHS.YEARLY) /
        (PLAN_MONTHLY_PRICES.PRO * 12)) *
      100).toFixed(0),
  },
}

// Stripe Subscription Plans based on the provided HTML content
export const SUBSCRIPTION_PLANS = {
  LITE: {
    id: 'lite',
    name: 'Lite', // HTMLの表示は'LITE'ですが、例の形式に合わせて'Lite'とします
    features: [
      '予約カレンダー基本機能',
      '基本的なお客様情報管理',
      '予約管理 (予約カレンダー, スタッフスケジュール設定, 予約確認・変更・キャンセル, 24/365オンライン予約)',
      '顧客管理（基本情報, 予約・購入履歴）',
      'スタッフ管理 (アカウント作成, 基本的な予約・シフト管理) ※最大3名まで',
      'メニュー設定 (サービス登録, 料金・所要時間設定) ※最大15件まで',
      '顧客カルテ機能 (施術内容の詳細記録, 画像添付機能, 薬剤使用履歴管理, カルテテンプレート機能, 施術者引継ぎ機能)　※写真添付無し',
      'オプション販売機能 (オプションの追加, オプションの選択) ※最大10件まで',
      'ポイント・クーポン機能 (カスタマイズ可能なポイント付与システム, クーポン管理)',
      '自動リマインド・通知 (メール・LINE)',
      'スタッフ数(3名)、メニュー数(15件)、オプション数(10件)、予約数(200件/月)が無制限', // HTMLの記述通りに含めます
    ],
    monthly: {
      priceId: process.env.NEXT_PUBLIC_LITE_MONTHLY_PRC_ID || '',
      price: PLAN_MONTHLY_PRICES.LITE,
    },
    yearly: {
      priceId: process.env.NEXT_PUBLIC_LITE_YEARLY_PRC_ID || '',
      price: PLAN_YEARLY_PRICES.LITE.price,
      savingPercent: PLAN_YEARLY_PRICES.LITE.savingPercent,
    },
  },
  PRO: {
    id: 'pro',
    name: 'Pro', // HTMLの表示は'PRO'ですが、例の形式に合わせて'Pro'とします
    features: [
      'LITEプランの全機能',
      '予約時に理想の髪型の画像(1枚)を添付できる様になります。',
      'カルテ管理 (最大4枚の画像添付)',
      'スタッフ数、メニュー数、オプション数、予約数が無制限',
    ],
    monthly: {
      priceId: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRC_ID || '',
      price: PLAN_MONTHLY_PRICES.PRO,
    },
    yearly: {
      priceId: process.env.NEXT_PUBLIC_PRO_YEARLY_PRC_ID || '',
      price: PLAN_YEARLY_PRICES.PRO.price,
      savingPercent: PLAN_YEARLY_PRICES.PRO.savingPercent,
    },
  },
}

// Cookieの有効期限（日数）
export const COOKIE_EXPIRES_DAYS = 7;

// UI
export const POINT_EXPIRATION_DAYS = [
  { value: 365, label: '1年' },
  { value: 730, label: '2年' },
  { value: 1095, label: '3年' },
];

// Referral Discount
export const BASE_REFERRAL_DISCOUNT_AMOUNT = 2000
export const MAX_REFERRAL_COUNT = 10

import {
  Home as HomeIcon,
  Book as BookIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  CreditCard as CreditCardIcon,
  Timer as TimerIcon,
  Check as CheckIcon,
  File as FileIcon,
  UserCircle as UserCircleIcon,
  Cloud as CloudIcon,
  MenuSquare as MenuSquareIcon,
  Gift as GiftIcon,
  Ticket as TicketIcon,
  Settings as SettingsIcon,
  type LucideIcon
} from 'lucide-react';
import type { Role } from '@/convex/types';

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  minRole: Role;
};



export const NAV_ITEMS: NavItem[] = [
  {
    name: 'ダッシュボード',
    href: `/dashboard`,
    icon: HomeIcon,
    minRole: 'staff',
  },
  {
    name: '予約作成',
    href: `/dashboard/reservation/add`,
    icon: BookIcon,
    minRole: 'staff',
  },
  {
    name: '予約ボード',
    href: `/dashboard/reservation`,
    icon: CalendarIcon,
    minRole: 'staff',
  },
  {
    name: '予約タイムライン',
    href: `/dashboard/timeline`,
    icon: TimerIcon,
    minRole: 'staff',
  },
  {
    name: '完了済みの予約',
    href: `/dashboard/reservations`,
    icon: CheckIcon,
    minRole: 'staff',
  },
  {
    name: 'スタッフ管理',
    href: `/dashboard/staff`,
    icon: UsersIcon,
    minRole: 'owner',
  },
  {
    name: 'メニュー管理',
    href: `/dashboard/menu`,
    icon: FileIcon,
    minRole: 'manager',
  },
  {
    name: '顧客管理',
    href: `/dashboard/customer`,
    icon: UserCircleIcon,
    minRole: 'staff',
  },
  {
    name: '顧客カルテ管理',
    href: `/dashboard/carte`,
    icon: CloudIcon,
    minRole: 'staff',
  },
  {
    name: 'オプション管理',
    href: `/dashboard/option`,
    icon: MenuSquareIcon,
    minRole: 'manager',
  },
  {
    name: 'クーポン管理',
    href: `/dashboard/coupon`,
    icon: GiftIcon,
    minRole: 'manager',
  },
  {
    name: 'ポイント設定',
    href: `/dashboard/point`,
    icon: TicketIcon,
    minRole: 'owner',
  },
  {
    name: 'サブスクリプション',
    href: `/dashboard/subscription`,
    icon: CreditCardIcon,
    minRole: 'admin',
  },
  {
    name: '設定',
    href: `/dashboard/setting`,
    icon: SettingsIcon,
    minRole: 'owner',
  },
]