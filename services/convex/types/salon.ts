/**
 * サロンドメイン型定義
 *
 * このモジュールはサロン関連の型定義を提供します。
 * サロン、サロン設定、スケジュール設定などの型を管理します。
 */

import { Id, Doc } from '@/convex/_generated/dataModel';
import { CommonFields } from '@/services/convex/shared/types/common';

/**
 * サロンエンティティインターフェース
 */
export type Salon = Doc<'salon'> & typeof CommonFields;

/**
 * サロン作成入力インターフェース
 */
export type SalonCreateInput = Omit<
  Doc<'salon'>,
  | 'subscriptionId'
  | 'subscriptionStatus'
  | 'planName'
  | 'priceId'
  | 'billingPeriod'
  | 'stripeConnectId'
  | 'stripeConnectStatus'
  | 'stripeConnectCreatedAt'
  | 'isArchive'
  | 'deletedAt'
  | '_id'
  | '_creationTime'
>;

/**
 * サロン更新入力インターフェース
 */
export type SalonUpdateInput = Partial<
  Omit<
    Doc<'salon'>,
    Exclude<
      keyof Doc<'salon'>,
      | 'email'
      | 'stripeCustomerId'
      | 'subscriptionId'
      | 'subscriptionStatus'
      | 'planName'
      | 'priceId'
      | 'billingPeriod'
    >
  >
>;

/**
 * サロン基本設定エンティティインターフェース
 */
export type SalonConfig = Doc<'salon_config'>;

/**
 * サロン基本設定入力インターフェース
 */

export type SalonConfigInput = Partial<
  Omit<Doc<'salon_config'>, 'isArchive' | 'deletedAt' | '_creationTime'>
> & {
  salonId: Id<'salon'>;
};

/**
 * サロンAPI設定エンティティインターフェース
 */

export type SalonApiConfig = Partial<
  Omit<Doc<'salon_api_config'>, 'isArchive' | 'deletedAt' | '_id' | '_creationTime'>
> & {
  salonId: Id<'salon'>;
};

/**
 * サロンAPI設定入力インターフェース
 */
export type SalonApiConfigInput = Partial<
  Omit<Doc<'salon_api_config'>, 'isArchive' | 'deletedAt' | '_id' | '_creationTime'>
> & {
  salonId: Id<'salon'>;
};

/**
 * サロンスケジュール設定エンティティインターフェース
 */
export type SalonScheduleConfig = Partial<
  Omit<Doc<'salon_schedule_config'>, 'isArchive' | 'deletedAt' | '_id' | '_creationTime'>
> & {
  salonId: Id<'salon'>;
};

/**
 * サロンスケジュール設定入力インターフェース
 */
export type SalonScheduleConfigInput = Partial<
  Omit<Doc<'salon_schedule_config'>, 'isArchive' | 'deletedAt' | '_id' | '_creationTime'>
> & {
  salonId: Id<'salon'>;
};

/**
 * サロンStripe設定エンティティインターフェース
 */
export type SalonStripeConnect = Partial<Doc<'salon'>>;

/**
 * サロンStripe設定入力インターフェース
 */
export interface SalonStripeConnectInput {
  salonId: string;
  status: string;
  accountId: string;
}
