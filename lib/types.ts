// Stripe types
import { Role, SubscriptionPlanName } from "@/convex/types";
import { Id } from "@/convex/_generated/dataModel";
import { Gender, ImageType } from "@/convex/types";


export type SessionPayload = {
  customerUid: string;
  email: string;
  tenantId: string;
  orgId: string;
}

export type StaffDisplay = {
  _id: Id<'staff'>
  name: string | undefined
  age: number | undefined
  gender: Gender | undefined
  description: string | undefined
  images: ImageType[] | undefined
  is_active: boolean | undefined
  tags: string[] | undefined
  _creationTime: number | undefined
  extra_charge: number | undefined
  priority: number | undefined
  instagram_link: string | undefined
  featured_hair_images: ImageType[]
}

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
  isManualPreview?: boolean; // 手動プレビューかどうかのフラグ
}

// Clerk
export type ClerkEmailAddress = {
  id: string;
  emailAddress: string;
  verification?: {
    status: string | null;
  };
  primary?: boolean;
};

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired' | 'missing'

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

export const PLAN_LEVEL: Record<SubscriptionPlanName, number> = {
  UNKNOWN: 0,
  LITE: 1,
  PRO: 2,
};

// スタッフ選択の状態管理用の型
export type StaffSelection = StaffDisplay | 'free' | null;

// 指名フリー予約の統合可能時間情報
export type IntegratedAvailabilityInfo = {
  available: boolean;
  timeSlots: Array<{
    start: string;
    end: string;
    availableStaffs: Array<{
      id: Id<'staff'>;
      name: string;
      priority: number;
      extra_charge: number;
    }>;
  }>;
  totalAvailableStaffs: number;
};

// 指名フリー予約のスタッフ割り当て結果
export type StaffAssignmentResult = {
  success: boolean;
  assignedStaff?: {
    id: Id<'staff'>;
    name: string;
    priority: number;
    extra_charge: number;
  };
  error?: string;
};


