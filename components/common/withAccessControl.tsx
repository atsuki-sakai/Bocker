'use client'

import { ComponentType, ReactElement } from 'react'
import { usePathname } from 'next/navigation'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { hasAccess } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import { Loading } from '@/components/common/'
import { UnauthorizedAccess } from '@/components/common/UnauthorizedAccess'
import type { Role, SubscriptionPlanName } from '@/convex/types'

interface WithAccessControlOptions {
  minRole?: Role
  minPlan?: SubscriptionPlanName
  fallback?: ReactElement
  loading?: ReactElement
}

/**
 * ページレベルのアクセス制御を提供するHOC
 * NAV_ITEMSの設定と同期してアクセス制御を行う
 */
export function withAccessControl<P extends object>(
  WrappedComponent: ComponentType<P>,
  options?: WithAccessControlOptions
) {
  const WithAccessControlComponent = (props: P) => {
    const pathname = usePathname()
    const { role, planName, isLoaded, ready } = useTenantAndOrganization()

    // NAV_ITEMSから現在のパスに対応するアクセス要件を取得
    const navItem = NAV_ITEMS.find((item) => {
      // 完全一致または部分一致で検索
      return pathname === item.href || pathname.startsWith(item.href + '/')
    })

    // オプションで指定された要件か、NAV_ITEMSの要件を使用
    const requiredRole = options?.minRole || navItem?.minRole || 'staff'
    const requiredPlan = options?.minPlan || navItem?.minPlan || 'LITE'

    // ローディング状態
    if (!isLoaded || !ready) {
      return options?.loading || <Loading />
    }

    if (!planName) {
      return options?.fallback || <UnauthorizedAccess />
    }

    // アクセス権限チェック
    if (!role || !hasAccess(role, planName, requiredRole, requiredPlan as SubscriptionPlanName)) {
      return options?.fallback || <UnauthorizedAccess />
    }

    // アクセス許可されている場合、コンポーネントをレンダリング
    return <WrappedComponent {...props} />
  }

  WithAccessControlComponent.displayName = `withAccessControl(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`

  return WithAccessControlComponent
}

/**
 * 特定の権限要件でページを保護するヘルパー関数
 */
export const withRoleAccess = <P extends object>(
  WrappedComponent: ComponentType<P>,
  minRole: Role,
  minPlan: SubscriptionPlanName = 'LITE'
) => {
  return withAccessControl(WrappedComponent, { minRole, minPlan })
}

/**
 * オーナー以上のアクセス権限が必要なページを保護
 */
export const withOwnerAccess = <P extends object>(WrappedComponent: ComponentType<P>) => {
  return withRoleAccess(WrappedComponent, 'owner')
}

/**
 * マネージャー以上のアクセス権限が必要なページを保護
 */
export const withManagerAccess = <P extends object>(WrappedComponent: ComponentType<P>) => {
  return withRoleAccess(WrappedComponent, 'manager')
}

/**
 * PRO プランが必要なページを保護
 */
export const withProPlanAccess = <P extends object>(
  WrappedComponent: ComponentType<P>,
  minRole: Role = 'staff'
) => {
  return withRoleAccess(WrappedComponent, minRole, 'PRO')
}

/**
 * マネージャー以上 + PRO プランが必要なページを保護（クーポン管理など）
 */
export const withManagerProAccess = <P extends object>(
  WrappedComponent: ComponentType<P>
) => {
  return withRoleAccess(WrappedComponent, 'manager', 'PRO')
}
