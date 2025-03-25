'use client';

import { useStaffAuth } from '@/hooks/useStaffAuth';
import { ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';

interface RoleBasedViewProps {
  children: ReactNode;
  requiredRole: 'admin' | 'manager' | 'staff';
  requiredPlan?: 'Lite' | 'Pro' | "Enterprise";
  currentPlan?: string | null;
  fallback?: ReactNode;
}

/**
 * 権限とサブスクリプションプランに基づいてUIを条件付きレンダリングするコンポーネント
 * オーナー（Clerk認証）とスタッフ（独自認証）の両方に対応
 */
export default function RoleBasedView({
  children,
  requiredRole,
  requiredPlan,
  currentPlan,
  fallback = null,
}: RoleBasedViewProps) {
  // スタッフ認証とClerk認証の両方を取得
  const { role: staffRole, checkPermission, isAuthenticated: isStaffAuthenticated } = useStaffAuth();
  const { isSignedIn } = useAuth();

  // スタッフとして認証されているかどうかを最優先
  // スタッフとして認証されていない場合のみClerk認証を考慮
  const isOwner = isSignedIn && !isStaffAuthenticated;
  
  // 権限チェック
  // 1. スタッフ認証の場合：役割に基づくアクセス制御
  // 2. オーナーの場合：常に最高権限
  const hasRoleAccess = isStaffAuthenticated 
    ? (staffRole && checkPermission(requiredRole)) 
    : isOwner;

  // プランチェック
  // requiredPlanが指定されていない場合はプランチェックをスキップ
  // Proプランが必要な場合は、currentPlanがProの場合のみアクセス可能
  // Liteプランが必要な場合は、currentPlanがLiteまたはProの場合にアクセス可能
  const hasPlanAccess = !requiredPlan || 
    (requiredPlan === 'Lite' && (currentPlan === 'Lite' || currentPlan === 'Pro')) ||
    (requiredPlan === 'Pro' && currentPlan === 'Pro');

  // 権限とプランの両方の条件を満たす場合のみアクセス許可
  const hasAccess = hasRoleAccess && hasPlanAccess;

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}