// Stripe types
import { Role, ROLE_VALUES } from "@/convex/types";
export interface StripeLineItem {
  id: string;
  description: string | null;
  amount: number;
  proration: boolean;
  plan?: {
    nickname?: string;
    id: string;
  };
  type: string;
}

export interface StripePreviewInvoice {
  total: number;
  lines: {
    data: StripeLineItem[];
  };
}

export interface StripePreviewData {
  items: Array<{
    id: string;
    price: string;
  }>;
  status: string;
  previewInvoice: StripePreviewInvoice;
  prorationDate: number;
  success: boolean;
}

export type BillingPeriod = 'monthly' | 'yearly';

// Clerk
export type ClerkEmailAddress = {
  id: string;
  emailAddress: string;
  verification?: {
    status: string | null;
  };
  primary?: boolean;
};

// 開始と終了時刻を表す型
export type TimeRange = {
  startHour: string; // 開始時刻 "HH:mm"
  endHour: string; // 終了時刻 "HH:mm"
};

// ロールのレベルを定義
export const ROLE_LEVEL: Record<Role, number> = {
  admin: 4,
  owner: 3,
  manager: 2,
  staff: 1,
};


