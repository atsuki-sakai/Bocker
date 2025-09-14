'use client'

import { ModeToggle } from './'
import { useTranslations } from 'next-intl'
import { usePathname, Link } from '@/i18n/navigation'
import { useState, useEffect, useMemo, memo, useCallback } from 'react'
import { Separator } from '@/components/ui/separator'
import { Loading } from './'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from '@headlessui/react'
import { MenuIcon, XIcon } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { useTheme } from 'next-themes'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { hasAccess } from '@/lib/utils'
import type { SubscriptionPlanName } from '@/convex/types'
import { NAV_GROUPS, DASHBOARD_ITEM, type NavGroup } from '@/lib/constants'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { UserIcon } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'
import { Role } from '@/convex/types'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

// プラン名を正規化する関数（データベースの値をTypeScript型に合わせる）
function normalizePlanName(planName: string | undefined | null): SubscriptionPlanName {
  console.log('[normalizePlanName] Input:', planName, 'Type:', typeof planName)

  if (!planName) {
    console.log('[normalizePlanName] planName is falsy, returning UNKNOWN')
    return 'UNKNOWN'
  }

  const normalizedName = planName.toUpperCase().trim()
  console.log('[normalizePlanName] Normalized:', normalizedName)

  switch (normalizedName) {
    case 'MICRO':
      console.log('[normalizePlanName] Matched MICRO')
      return 'MICRO'
    case 'LITE':
      console.log('[normalizePlanName] Matched LITE')
      return 'LITE'
    case 'PRO':
      console.log('[normalizePlanName] Matched PRO')
      return 'PRO'
    default:
      console.log('[normalizePlanName] No match found, returning UNKNOWN for:', normalizedName)
      return 'UNKNOWN'
  }
}

// 共通コンポーネント: サイドバーヘッダー（ロゴとタイトル）
const SidebarHeader = memo(
  ({
    mounted,
    resolvedTheme,
    isMobile = false,
    showModeToggle = false,
  }: {
    mounted: boolean
    resolvedTheme: string | undefined
    isMobile?: boolean
    showModeToggle?: boolean
  }) => {
    const t = useTranslations('sidebar')
    return (
      <div className={`${isMobile ? 'relative' : ''} flex flex-col ${isMobile ? 'mt-2' : 'mt-2'}`}>
        <div className="flex items-center gap-x-2">
          <Image
            src={
              mounted && resolvedTheme === 'dark'
                ? '/assets/images/logo-white.png'
                : '/assets/images/logo-darkgreen.png'
            }
            alt="Bocker"
            width={42}
            height={42}
            priority
          />
          <h1
            className={`${isMobile ? 'text-xl bg-background bg-clip-text text-foreground font-thin' : 'text-2xl font-bold text-primary'}`}
          >
            Bocker
          </h1>
        </div>
        <div className="flex items-center gap-x-2">
          <p className={`text-xs ${isMobile ? 'text-primary' : 'text-muted-foreground'}`}>
            {t('tagline')}
          </p>
        </div>
        {isMobile && showModeToggle && (
          <div className="absolute right-1 top-2">
            <div className="relative lg:hidden">
              <ModeToggle />
            </div>
          </div>
        )}
      </div>
    )
  }
)
SidebarHeader.displayName = 'SidebarHeader'

// 共通コンポーネント: ナビゲーション部分
const SidebarNavigation = memo(
  ({
    filteredGroups,
    staffId,
    role,
    pathname,
    isSubscriptionActive,
    currentPlan,
    isMobile = false,
  }: {
    filteredGroups: NavGroup[]
    staffId: Id<'staff'> | null
    role: Role | null
    pathname: string
    isSubscriptionActive: boolean
    currentPlan: SubscriptionPlanName
    isMobile?: boolean
  }) => {
    const t = useTranslations('sidebar')
    const tNav = useTranslations('navigation')
    const tGroups = useTranslations('navigationGroups')

    // 現在のパスに基づいてアクティブなグループを決定
    const getActiveGroup = useCallback(() => {
      return filteredGroups.find((group) => group.items.some((item) => pathname === item.href))
    }, [filteredGroups, pathname])

    // 現在のパスに基づいて開くグループを決定
    const getOpenGroups = useCallback(() => {
      const activeGroup = getActiveGroup()
      return activeGroup ? [activeGroup.id] : []
    }, [getActiveGroup])

    // アコーディオンの開閉状態を管理
    const [openGroups, setOpenGroups] = useState<string[]>(getOpenGroups())

    // パスが変更されたらアクティブなグループを開く
    useEffect(() => {
      const newOpenGroups = getOpenGroups()
      setOpenGroups(newOpenGroups)
    }, [getOpenGroups])

    return (
      <nav className="flex flex-1 flex-col">
        {!isSubscriptionActive ? (
          <>
            <div className="flex flex-col my-2 bg-muted p-2 rounded-md">
              <p className="text-xs text-muted-foreground">
                <span className="inline-block font-bold mb-2">{t('subscriptionRequired')}</span>
                <br />
                {t('subscriptionRequiredDetail')}
              </p>
            </div>
            <Link
              href="/dashboard/subscription"
              className="text-sm text-primary hover:text-primary-foreground"
            >
              <Button className="text-xs w-full">{t('goToSubscription')}</Button>
            </Link>
          </>
        ) : (
          <div className="flex flex-1 flex-col">
            {/* マイページ */}
            {staffId && (
              <div className="mb-4">
                <Link
                  href={`/dashboard/staff/${staffId}/my-page`}
                  className={classNames(
                    pathname === `/dashboard/staff/${staffId}/my-page`
                      ? 'text-accent-foreground bg-accent'
                      : 'text-primary bg-background border border-border font-light',
                    'w-full group flex gap-x-3 rounded-md p-2 text-sm/6 items-center'
                  )}
                >
                  <UserIcon
                    aria-hidden="true"
                    className={classNames(
                      pathname === `/dashboard/staff/${staffId}/my-page`
                        ? 'text-accent-foreground bg-accent'
                        : 'text-primary',
                      'size-4 shrink-0'
                    )}
                  />
                  <p className="w-full text-nowrap">{tNav('myPage')}</p>
                  {pathname === `/dashboard/staff/${staffId}/my-page` && (
                    <div className="w-full flex justify-end items-center pr-2">
                      <div className="h-3 w-3 bg-accent border-ring border rounded-full" />
                    </div>
                  )}
                </Link>
              </div>
            )}

            {/* ダッシュボード（常に表示） */}
            {hasAccess(
              role as Role,
              currentPlan,
              DASHBOARD_ITEM.minRole,
              DASHBOARD_ITEM.minPlan
            ) && (
              <div className="mb-2">
                <Link
                  href={DASHBOARD_ITEM.href}
                  className={classNames(
                    pathname === DASHBOARD_ITEM.href
                      ? 'text-accent-foreground bg-accent'
                      : 'text-primary hover:bg-primary-foreground hover:text-primary font-light',
                    'w-full group flex gap-x-3 rounded-md p-2 border border-border items-center'
                  )}
                >
                  <DASHBOARD_ITEM.icon
                    aria-hidden="true"
                    className={classNames(
                      pathname === DASHBOARD_ITEM.href
                        ? 'text-accent-foreground bg-accent'
                        : 'text-primary',
                      'size-4 shrink-0'
                    )}
                  />
                  <p className="w-full text-nowrap">{tNav(DASHBOARD_ITEM.name)}</p>
                  {pathname === DASHBOARD_ITEM.href && (
                    <div className="w-full flex justify-end items-center pr-2">
                      <div className="h-3 w-3 bg-accent border-ring border rounded-full" />
                    </div>
                  )}
                </Link>
              </div>
            )}

            {/* アコーディオンナビゲーション */}
            <Accordion
              type="multiple"
              value={openGroups}
              onValueChange={setOpenGroups}
              className="w-full space-y-2"
            >
              {filteredGroups.map((group) => {
                return (
                  <AccordionItem key={group.id} value={group.id} className="border-b-0">
                    <AccordionTrigger
                      className={classNames(
                        'hover:no-underline py-2 px-2 text-sm font-medium rounded-md transition-colors',
                        isMobile ? 'text-base' : ''
                      )}
                    >
                      <div className="flex items-center gap-2">{tGroups(group.name)}</div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {group.items.map((item) => {
                          const isCurrent = pathname === item.href
                          return (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                className={classNames(
                                  isCurrent
                                    ? 'text-accent-foreground bg-accent'
                                    : 'text-primary hover:bg-primary-foreground hover:text-primary font-light',
                                  'w-full group flex gap-x-3 p-2 text-sm items-center border border-border rounded-md'
                                )}
                              >
                                <item.icon
                                  aria-hidden="true"
                                  className={classNames(
                                    isCurrent ? 'text-accent-foreground bg-accent' : 'text-primary',
                                    'size-4 shrink-0'
                                  )}
                                />
                                <p className="w-full text-nowrap">{tNav(item.name)}</p>
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>
        )}
      </nav>
    )
  }
)
SidebarNavigation.displayName = 'SidebarNavigation'

interface SidebarProps {
  children: React.ReactNode
}

export default function Sidebar({ children }: SidebarProps) {
  const t = useTranslations('sidebar')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { role, isLoaded, ready, staffId, subscription } = useTenantAndOrganization()
  const pathname = usePathname() // 現在のパスを取得

  console.log('[Sidebar] Component render:', {
    pathname,
    isLoaded,
    ready,
    hasRole: !!role,
    hasSubscription: !!subscription,
    timestamp: new Date().toISOString(),
  })
  const { resolvedTheme } = useTheme()

  // デバッグログ: サブスクリプション情報を確認
  console.log('=== Sidebar Debug ===')
  console.log('subscription object:', subscription)
  console.log('subscription?.plan_name:', subscription?.plan_name)
  console.log('subscription?.status:', subscription?.status)
  console.log('role:', role)
  console.log('isLoaded:', isLoaded)
  console.log('ready:', ready)

  const currentPlan: SubscriptionPlanName = normalizePlanName(subscription?.plan_name)
  console.log('currentPlan after normalization:', currentPlan)

  const filteredGroups = useMemo(() => {
    console.log('[filteredGroups] Calculating with:', { isLoaded, role, currentPlan })

    if (!isLoaded || !role) {
      console.log('[filteredGroups] Not loaded or no role, returning empty array')
      return []
    }

    const groups = NAV_GROUPS.map((group) => {
      const filteredItems = group.items.filter((item) => {
        const access = hasAccess(role, currentPlan, item.minRole, item.minPlan)
        console.log(
          `[filteredGroups] Item ${item.name}: hasAccess(${role}, ${currentPlan}, ${item.minRole}, ${item.minPlan}) = ${access}`
        )
        return access
      })

      return {
        ...group,
        items: filteredItems,
      }
    }).filter((group) => group.items.length > 0)

    console.log('[filteredGroups] Final groups:', groups)
    return groups
  }, [isLoaded, role, currentPlan])
  useEffect(() => {
    // パスが変更されたときにサイドバーを閉じる
    setSidebarOpen(false)
  }, [pathname])
  useEffect(() => setMounted(true), [])

  // テナント情報とサブスクリプション情報が読み込まれるまでローディングを表示
  if (!ready || !isLoaded) {
    return <Loading />
  }

  // アクティブとトライアル中のみ有効と判断する
  const isSubscriptionActive =
    subscription?.status === 'active' || subscription?.status === 'trialing'

  return (
    <div>
      {/* モバイル用ダイアログ */}
      <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-primary opacity-60 transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />

        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
          >
            <TransitionChild>
              <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="-m-2.5 p-2.5"
                >
                  <span className="sr-only">{t('closeSidebar')}</span>
                  <XIcon aria-hidden="true" className="size-6 text-primary-foreground" />
                </button>
              </div>
            </TransitionChild>
            {/* Sidebar for mobile */}
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background px-6 pb-4">
              <SidebarHeader
                mounted={mounted}
                resolvedTheme={resolvedTheme}
                isMobile={true}
                showModeToggle={true}
              />
              <Separator className="my-2 w-2/3 mx-auto" />
              <SidebarNavigation
                staffId={staffId}
                role={role}
                pathname={pathname}
                filteredGroups={filteredGroups}
                isSubscriptionActive={isSubscriptionActive}
                currentPlan={currentPlan}
                isMobile={true}
              />
              <LanguageSwitcher />
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* デスクトップ用固定サイドバー */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-background px-6 pb-4">
          <SidebarHeader
            mounted={mounted}
            resolvedTheme={resolvedTheme}
            isMobile={false}
            showModeToggle={false}
          />
          <Separator className="my-2" />
          <SidebarNavigation
            staffId={staffId}
            role={role}
            pathname={pathname}
            filteredGroups={filteredGroups}
            isSubscriptionActive={isSubscriptionActive}
            currentPlan={currentPlan}
            isMobile={false}
          />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="lg:pl-72 relative">
        <div className="sticky top-0 z-40 lg:mx-auto lg:px-8">
          <div className="flex h-16 items-center gap-x-1 md:gap-x-4 border-b border-primary bg-background px-4 shadow-xs sm:gap-x-6 sm:px-6 lg:px-0 lg:shadow-none">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="-m-2.5 p-2.5  lg:hidden"
            >
              <span className="sr-only">{t('openSidebar')}</span>
              <MenuIcon aria-hidden="true" className="size-6 text-primary" />
            </button>

            <div aria-hidden="true" className="h-6 w-px bg-primary lg:hidden" />

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <div className="flex items-center justify-start w-full"></div>
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                {subscription?.plan_name && (
                  <div className="flex items-center gap-x-4 lg:gap-x-6">
                    {isSubscriptionActive ? (
                      <p className="text-xs tracking-widest w-fit text-center font-bold border border-muted-foreground rounded-full px-4 py-1 bg-primary text-primary-foreground [writing-mode:horizontal-tb] [text-orientation:mixed]">
                        {subscription.plan_name}
                      </p>
                    ) : (
                      <p className="text-xs tracking-widest w-[100px] text-center font-bold border border-destructive rounded-full px-4 py-1 bg-destructive-foreground text-destructive [writing-mode:horizontal-tb] [text-orientation:mixed]">
                        {t('subscriptionExpired')}
                      </p>
                    )}
                  </div>
                )}

                <div aria-hidden="true" className="hidden lg:block lg:h-6 lg:w-px" />

                <UserButton
                  appearance={{
                    baseTheme: resolvedTheme === 'dark' ? dark : undefined,
                  }}
                />

                <div className="relative hidden lg:block">
                  <ModeToggle />
                </div>
                <div className="relative hidden lg:block">
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </div>
        </div>
        <main className="py-4 lg:py-8">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">{children}</div>
        </main>
      </div>
    </div>
  )
}
