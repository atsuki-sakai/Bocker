// Stripe types
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

// UI
export const genderType = ['male', 'female', 'all'] as const;
export const targetType = ['all', 'first', 'repeat'] as const;
export const menuPaymentMethodType = ['cash', 'credit_card', 'all'] as const;

export type GenderType = (typeof genderType)[number];
export type TargetType = (typeof targetType)[number];
export type MenuPaymentMethodType = (typeof menuPaymentMethodType)[number];

// スタッフ権限
export const staffRoleType = ['admin', 'manager', 'staff'] as const;
export type StaffRoleType = (typeof staffRoleType)[number];

// スタッフ性別
export const staffGenderType = ['male', 'female', 'unselected'] as const;
export type StaffGenderType = (typeof staffGenderType)[number];
