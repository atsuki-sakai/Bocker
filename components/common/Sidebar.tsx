'use client';

import { ModeToggle } from './'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, Fragment } from 'react'
import { Separator } from '@/components/ui/separator'
import { Loading } from './'
import Image from 'next/image'
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from '@headlessui/react'
import { MenuIcon, XIcon, CreditCard as CreditCardIcon } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { useTheme } from 'next-themes'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'
import { hasAccess } from '@/lib/utils'
import type { SubscriptionPlanName } from '@/convex/types'
import { NAV_ITEMS } from '@/lib/constants'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

interface SidebarProps {
  children: React.ReactNode
}

export default function Sidebar({ children }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLinkClicked, setIsLinkClicked] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { tenantId, role, isLoaded, ready } = useTenantAndOrganization()
  const pathname = usePathname() // 現在のパスを取得
  const { resolvedTheme } = useTheme()

  const tenant = useQuery(api.tenant.query.findById, tenantId ? { id: tenantId } : 'skip')
  const subscription = useQuery(
    api.tenant.subscription.query.findByStripeCustomerId,
    tenant?.stripe_customer_id ? { stripe_customer_id: tenant.stripe_customer_id } : 'skip'
  )

  const currentPlan: SubscriptionPlanName = (subscription?.plan_name ??
    'UNKNOWN') as SubscriptionPlanName

  const filteredNav = isLoaded
    ? NAV_ITEMS.filter((item) => hasAccess(role!, currentPlan, item.minRole, item.minPlan))
    : []
  filteredNav.push({
    name: 'サブスクリプション',
    href: `/dashboard/subscription`,
    icon: CreditCardIcon,
    minRole: 'admin',
    minPlan: 'LITE',
  })

  useEffect(() => {
    if (isLinkClicked) {
      setSidebarOpen(false)
      setIsLinkClicked(false)
    }
  }, [pathname, isLinkClicked, setSidebarOpen])
  useEffect(() => setMounted(true), [])

  // テナント情報とサブスクリプション情報が読み込まれるまでローディングを表示
  if (!ready || !isLoaded) {
    return <Loading />
  }

  // アクティブとトライアル中のみ有効と判断する
  const isSubscriptionActive =
    subscription?.status === 'active' || subscription?.status === 'trialing'

  return (
    <>
      <div>
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
                    <span className="sr-only">閉じる</span>
                    <XIcon aria-hidden="true" className="size-6 text-primary-foreground" />
                  </button>
                </div>
              </TransitionChild>
              {/* Sidebar for mobile */}
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background px-6 pb-4">
                <div className="relative flex flex-col mt-2">
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
                    />
                    <h1 className="text-xl bg-background bg-clip-text text-foreground font-thin">
                      Bocker
                    </h1>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <p className="text-xs text-primary">サロンの運営をもっと便利に。</p>
                  </div>
                  <div className="absolute right-1 top-2">
                    <div className="relative lg:hidden">
                      <ModeToggle />
                    </div>
                  </div>
                </div>
                <Separator className="my-2 w-2/3 mx-auto" />

                <nav className="flex flex-1 flex-col">
                  {!isSubscriptionActive && (
                    <div className="flex flex-col my-2 bg-muted p-2 rounded-md">
                      <p className="text-xs text-muted-foreground">
                        <span className="inline-block font-bold mb-2">
                          サブスクリプションをご契約ください。
                        </span>
                        <br />
                        以下のリンクから契約後にプラン毎の機能をご利用いただけます。
                      </p>
                    </div>
                  )}
                  <ul role="list" className="flex flex-1 flex-col gap-y-1">
                    {filteredNav.map((item) => {
                      const isCurrent = pathname === item.href

                      return (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            onClick={() => setIsLinkClicked(true)}
                            className={classNames(
                              isCurrent
                                ? 'text-accent-foreground bg-accent'
                                : 'text-primary hover:bg-primary-foreground hover:text-primary font-light',
                              'w-full group flex gap-x-3 rounded-md p-2 text-sm/6 items-center'
                            )}
                          >
                            <item.icon
                              aria-hidden="true"
                              className={classNames(
                                isCurrent ? 'text-accent-foreground bg-accent' : 'text-primary',
                                'size-4 shrink-0'
                              )}
                            />
                            <p className="w-full text-nowrap">{item.name}</p>
                            {isCurrent && (
                              <div className="w-full flex justify-end items-center pr-2">
                                <div className="h-3 w-3 bg-active border-ring border rounded-full" />
                              </div>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-background px-6 pb-4">
            <div className="flex flex-col mt-2">
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
                />
                <h1 className="text-2xl font-bold text-primary">Bocker</h1>
              </div>
              <div className="flex items-center gap-x-2">
                <p className="text-xs text-muted-foreground">サロンの運営をもっと便利に。</p>
              </div>
            </div>
            <Separator className="my-2" />
            <nav className="flex flex-1 flex-col">
              {!isSubscriptionActive && (
                <div className="flex flex-col my-2 bg-muted p-2 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    <span className="inline-block font-bold mb-2">
                      サブスクリプションをご契約ください。
                    </span>
                    <br />
                    以下のリンクから契約後にプラン毎の機能をご利用いただけます。
                  </p>
                </div>
              )}
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {filteredNav.map((item) => {
                      const isCurrent = pathname === item.href

                      return (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            onClick={() => setIsLinkClicked(true)}
                            className={classNames(
                              isCurrent
                                ? 'text-accent-foreground bg-accent'
                                : 'text-primary hover:bg-primary-foreground hover:text-primary font-light',
                              'w-full group flex gap-x-3 rounded-md p-2 text-sm/6 items-center'
                            )}
                          >
                            <item.icon
                              aria-hidden="true"
                              className={classNames(
                                isCurrent ? 'text-accent-foreground bg-accent' : 'text-primary',
                                'size-4 shrink-0'
                              )}
                            />
                            <p className="w-full text-nowrap">{item.name}</p>
                            {isCurrent && (
                              <div className="w-full flex justify-end items-center pr-2">
                                <div className="h-3 w-3 bg-active border-ring border rounded-full" />
                              </div>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              </ul>
            </nav>
          </div>
        </div>
        <div className="lg:pl-72 relative">
          <div className="sticky top-0 z-40 lg:mx-auto lg:px-8">
            <div className="flex h-16 items-center gap-x-1 md:gap-x-4 border-b border-primary bg-background px-4 shadow-xs sm:gap-x-6 sm:px-6 lg:px-0 lg:shadow-none">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="-m-2.5 p-2.5  lg:hidden"
              >
                <span className="sr-only">サイドバーを開く</span>
                <MenuIcon aria-hidden="true" className="size-6 text-primary" />
              </button>

              <div aria-hidden="true" className="h-6 w-px bg-primary lg:hidden" />

              <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                <div className="flex items-center justify-start w-full"></div>
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                  {subscription?.plan_name && (
                    <div className="flex items-center gap-x-4 lg:gap-x-6">
                      <p className="text-xs tracking-widest w-fit text-center font-bold border border-muted-foreground rounded-full px-4 py-1 bg-primary text-primary-foreground">
                        {subscription.plan_name}
                      </p>
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
                </div>
              </div>
            </div>
          </div>
          <main className="py-4 lg:py-8">
            <div className="mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </>
  )
}
