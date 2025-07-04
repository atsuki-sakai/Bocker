export const LANGUAGES = ['ja', 'en'] as const
export type Languages = typeof LANGUAGES[number]


import { getAppUrl, getEnv } from './env-config';

// 環境変数が設定されていない場合のデフォルト値を追加
export const BASE_URL = getAppUrl()

// ✅ ここで許可リストを定義
export const ALLOWED_DOMAINS = ['localhost', 'bocker.jp', 'bocker-project.vercel.app'];

/**
 * サロンの営業時間（24時間表記）を格納する配列。
 */
export const SCHEDULE_HOURS = [
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
export const RESERVATION_CANCEL_LIMIT_DAYS = [
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
export const RESERVATION_LIMIT_DAYS = [
  '7',
  '14',
  '30',
  '60',
  '90'
];

// トライアル期間
export const PLAN_TRIAL_DAYS = 30
// --- 設定 ---
export const PLAN_CHARGE_MONTHS_YEARLY = 10   // 年額プランで請求する月数

/**
 * プラン期間（月数）定義。
 */
export const PLAN_DURATION_MONTHS = {
  MONTHLY: 1,
  YEARLY: PLAN_CHARGE_MONTHS_YEARLY,
}

export const PLAN_MONTHLY_PRICES = {
  LITE: 8000,
  PRO: 12000,
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
      'features.lite.1',
      'features.lite.2',
      'features.lite.3',
      'features.lite.4',
      'features.lite.5',
      'features.lite.6',
      'features.lite.7',
      'features.lite.8',
      'features.lite.9',
    ],
    monthly: {
      priceId: '',  // Set dynamically in runtime
      price: PLAN_MONTHLY_PRICES.LITE,
    },
    yearly: {
      priceId: '',  // Set dynamically in runtime
      price: PLAN_YEARLY_PRICES.LITE.price,
      savingPercent: PLAN_YEARLY_PRICES.LITE.savingPercent,
    },
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    features: ['features.pro.1', 'features.pro.2', 'features.pro.3', 'features.pro.4'],
    monthly: {
      priceId: getEnv('NEXT_PUBLIC_PRO_MONTHLY_PRC_ID'),  // Set dynamically in runtime
      price: PLAN_MONTHLY_PRICES.PRO,
    },
    yearly: {
      priceId: getEnv('NEXT_PUBLIC_PRO_YEARLY_PRC_ID'),  // Set dynamically in runtime
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
export const BASE_REFERRAL_DISCOUNT_AMOUNT = 4000
export const MAX_REFERRAL_COUNT = 6

import {
  Home as HomeIcon,
  Book as BookIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  Timer as TimerIcon,
  File as FileIcon,
  UserCircle as UserCircleIcon,
  Cloud as CloudIcon,
  MenuSquare as MenuSquareIcon,
  Gift as GiftIcon,
  Ticket as TicketIcon,
  Settings as SettingsIcon,
  type LucideIcon
} from 'lucide-react';
import type { Role, SubscriptionPlanName } from '@/convex/types';

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  minRole: Role;
  minPlan: SubscriptionPlanName;
};



export const NAV_ITEMS: NavItem[] = [
  {
    name: 'dashboard',
    href: `/dashboard`,
    icon: HomeIcon,
    minRole: 'staff',
    minPlan: 'LITE',
  },
  {
    name: 'reservationCreate',
    href: `/dashboard/reservation/add`,
    icon: BookIcon,
    minRole: 'staff',
    minPlan: 'LITE',
  },
  {
    name: 'reservationList',
    href: `/dashboard/reservation`,
    icon: CalendarIcon,
    minRole: 'staff',
    minPlan: 'LITE',
  },
  {
    name: 'staffSchedule',
    href: `/dashboard/staff-schedule`,
    icon: TimerIcon,
    minRole: 'manager',
    minPlan: 'LITE',
  },
  
  {
    name: 'staff',
    href: `/dashboard/staff`,
    icon: UsersIcon,
    minRole: 'owner',
    minPlan: 'LITE',
  },
  {
    name: 'menu',
    href: `/dashboard/menu`,
    icon: FileIcon,
    minRole: 'manager',
    minPlan: 'LITE',
  },
  {
    name: 'customers',
    href: `/dashboard/customer`,
    icon: UserCircleIcon,
    minRole: 'manager',
    minPlan: 'LITE',
  },
  {
    name: 'customerCarte',
    href: `/dashboard/carte`,
    icon: CloudIcon,
    minRole: 'staff',
    minPlan: 'LITE',
  },
  {
    name: 'options',
    href: `/dashboard/option`,
    icon: MenuSquareIcon,
    minRole: 'manager',
    minPlan: 'LITE',
  },
  {
    name: 'coupons',
    href: `/dashboard/coupon`,
    icon: GiftIcon,
    minRole: 'manager',
    minPlan: 'LITE',
  },
  {
    name: 'pointSettings',
    href: `/dashboard/point`,
    icon: TicketIcon,
    minRole: 'owner',
    minPlan: 'LITE',
  },
  {
    name: 'settings',
    href: `/dashboard/setting`,
    icon: SettingsIcon,
    minRole: 'owner',
    minPlan: 'LITE',
  },
]
