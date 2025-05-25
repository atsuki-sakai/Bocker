'use client';

import { ModeToggle } from './'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, Fragment } from 'react'
import { Separator } from '@/components/ui/separator'
import Image from 'next/image'
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from '@headlessui/react'
import {
  MenuIcon,
  CalendarIcon,
  BookIcon,
  CheckIcon,
  SettingsIcon,
  UserCircleIcon,
  FileIcon,
  MenuSquareIcon,
  HomeIcon,
  XIcon,
  CreditCardIcon,
  TicketIcon,
  GiftIcon,
  TimerIcon,
  UsersIcon,
  CloudIcon,
  Building2,
} from 'lucide-react'
import { OrganizationProfile } from '@clerk/nextjs'
import { useOrganizationList } from '@clerk/nextjs'
import { useOrganization } from '@clerk/nextjs'
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { useTheme } from 'next-themes'
import { CreateOrganization } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'

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
  const [showOrgProfile, setShowOrgProfile] = useState(false)
  const { userMemberships } = useOrganizationList()
  const { tenantId, orgId, orgRole, isLoaded } = useTenantAndOrganization()
  const { organization } = useOrganization()

  console.log('orgRole: ', orgRole)
  console.log('tenantId: ', tenantId)
  console.log('orgId: ', orgId)
  console.log('isLoaded: ', isLoaded)
  console.log('userMemberships: ', userMemberships.data)
  console.log('organization: ', organization)

  const pathname = usePathname() // 現在のパスを取得
  const { resolvedTheme } = useTheme()

  const tenant = useQuery(api.tenant.query.findById, tenantId ? { id: tenantId } : 'skip')

  // 全てのナビゲーション項目を統合
  const navigation = [
    {
      name: 'ダッシュボード',
      href: `/dashboard`,
      icon: HomeIcon,
      role: 'staff',
    },
    {
      name: '予約作成',
      href: `/dashboard/reservation/add`,
      icon: BookIcon,
      role: 'staff',
    },
    {
      name: '予約ボード',
      href: `/dashboard/reservation`,
      icon: CalendarIcon,
      role: 'staff',
    },
    {
      name: '予約タイムライン',
      href: `/dashboard/timeline`,
      icon: TimerIcon,
      role: 'staff',
    },
    {
      name: '完了済みの予約',
      href: `/dashboard/reservations`,
      icon: CheckIcon,
      role: 'staff',
    },
    {
      name: 'スタッフ管理',
      href: `/dashboard/staff`,
      icon: UsersIcon,
      role: 'owner',
    },
    {
      name: 'メニュー管理',
      href: `/dashboard/menu`,
      icon: FileIcon,
      role: 'manager',
    },
    {
      name: '顧客管理',
      href: `/dashboard/customer`,
      icon: UserCircleIcon,
      role: 'staff',
    },
    {
      name: '顧客カルテ管理',
      href: `/dashboard/carte`,
      icon: CloudIcon,
      role: 'staff',
    },
    {
      name: 'オプション管理',
      href: `/dashboard/option`,
      icon: MenuSquareIcon,
      role: 'manager',
    },
    {
      name: 'クーポン管理',
      href: `/dashboard/coupon`,
      icon: GiftIcon,
      role: 'manager',
    },
    {
      name: 'ポイント設定',
      href: `/dashboard/point`,
      icon: TicketIcon,
      role: 'owner',
    },
    {
      name: 'サブスクリプション',
      href: `/dashboard/subscription`,
      icon: CreditCardIcon,
      role: 'admin',
    },
    {
      name: '設定',
      href: `/dashboard/setting`,
      icon: SettingsIcon,
      role: 'owner',
    },
  ]

  useEffect(() => {
    if (isLinkClicked) {
      setSidebarOpen(false)
      setIsLinkClicked(false)
    }
  }, [pathname, isLinkClicked, setSidebarOpen])
  useEffect(() => setMounted(true), [])

  console.log('orgRole: ', orgRole)

  if (!organization) {
    return (
      <div className="flex justify-center items-center h-screen">
        <CreateOrganization
          hideSlug={true}
          afterCreateOrganizationUrl="/dashboard"
          appearance={{
            baseTheme: resolvedTheme === 'dark' ? dark : undefined,
          }}
        />
      </div>
    )
  }

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
                  {tenant?.subscription_status !== 'active' && (
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
                    {navigation.map((item) => {
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
              {tenant?.subscription_status !== 'active' && (
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
                    {navigation.map((item) => {
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
                  {tenant?.plan_name && (
                    <div className="flex items-center gap-x-4 lg:gap-x-6">
                      <p className="text-xs tracking-widest w-fit text-center font-bold border border-muted-foreground rounded-full px-4 py-1 bg-primary text-primary-foreground">
                        {tenant.plan_name}
                      </p>
                    </div>
                  )}

                  <div aria-hidden="true" className="hidden lg:block lg:h-6 lg:w-px" />

                  <UserButton
                    appearance={{
                      baseTheme: resolvedTheme === 'dark' ? dark : undefined,
                    }}
                  />
                  {tenant?.subscription_status === 'active' && (
                    <>
                      <OrganizationSwitcher
                        hidePersonal={true}
                        afterCreateOrganizationUrl="/dashboard"
                        appearance={{
                          baseTheme: resolvedTheme === 'dark' ? dark : undefined,
                        }}
                      />
                      <Button variant="outline" size="icon" onClick={() => setShowOrgProfile(true)}>
                        <Building2 className="size-4" />
                      </Button>
                    </>
                  )}
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
        <Dialog
          className="fixed inset-0 w-full h-full z-50 flex flex-col justify-center items-center"
          open={showOrgProfile}
          onClose={() => setShowOrgProfile(false)}
        >
          <TransitionChild
            as={Fragment}
            enter="transition-opacity duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <DialogBackdrop className="fixed inset-0 bg-background/50 backdrop-blur-sm" />
          </TransitionChild>
          <TransitionChild
            as={Fragment}
            enter="transition-all duration-300 ease-out"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition-all duration-200 ease-in"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="relative w-full h-full flex flex-col">
              <div className="w-full h-full flex justify-center items-center relative">
                {/* Close button (X) positioned inside the modal content */}
                <Button
                  onClick={() => setShowOrgProfile(false)}
                  className="absolute top-5 right-5 z-10 border-background border h-10 w-10 rounded-full p-3 "
                >
                  <XIcon className="size-5 text-background" aria-hidden="true" />
                  <span className="sr-only">閉じる</span>
                </Button>

                <OrganizationProfile
                  routing="hash"
                  appearance={{ baseTheme: resolvedTheme === 'dark' ? dark : undefined }}
                />
              </div>
            </div>
          </TransitionChild>
        </Dialog>
      </div>
    </>
  )
}
