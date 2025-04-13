/**
 * サブスクリプションドメイン型定義
 *
 * このモジュールはサブスクリプション関連の型定義を提供します。
 * サブスクリプション作成、更新、同期などの型を管理します。
 */

import { Id, Doc } from '@/convex/_generated/dataModel';
import { CommonFields } from '@/services/convex/shared/types/common';

/**
 * サブスクリプションエンティティインターフェース
 */
export type Subscription = Doc<'subscription'> & typeof CommonFields;

/**
 * サブスクリプション同期入力インターフェース
 */
export interface SubscriptionSyncInput {
  subscriptionId: string;
  stripeCustomerId: string;
  status: string;
  priceId: string;
  currentPeriodEnd: number;
  planName: string;
  billingPeriod: 'monthly' | 'yearly';
}

/**
 * サブスクリプション支払い失敗入力インターフェース
 */
export interface SubscriptionPaymentFailedInput {
  subscriptionId: string;
  stripeCustomerId: string;
  transactionId?: string;
  includeArchive?: boolean;
}

/**
 * サブスクリプションセッション作成入力インターフェース
 */
export interface SubscriptionSessionInput {
  clerkUserId: string;
  stripeCustomerId: string;
  priceId: string;
  trialDays?: number;
}

/**
 * サブスクリプション更新プレビュー入力インターフェース
 */
export interface SubscriptionUpdatePreviewInput {
  subscriptionId: string;
  newPriceId: string;
  customerId: string;
}

/**
 * サブスクリプションBilling Portalセッション作成入力インターフェース
 */
export interface SubscriptionBillingPortalSessionInput {
  stripeCustomerId: string;
  returnUrl: string;
}

/**
 * サブスクリプション更新確認入力インターフェース
 */
export interface SubscriptionConfirmSubscriptionUpdateInput {
  subscriptionId: string;
  newPriceId: string;
  items: { id: string; price: string }[];
  prorationDate: number;
}
