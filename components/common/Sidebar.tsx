'use client';

import { ModeToggle } from './'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Separator } from '@/components/ui/separator'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
} from '@headlessui/react'
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
  ChevronDownIcon,
  TicketIcon,
  GiftIcon,
  TimerIcon,
  UsersIcon,
  CloudIcon,
} from 'lucide-react'
import { useClerk } from '@clerk/nextjs'
import { useOrganizationList } from '@clerk/nextjs'
import { useAuth, useUser } from '@clerk/nextjs'
import { useOrganization } from '@clerk/nextjs'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

interface SidebarProps {
  children: React.ReactNode
}

export default function Sidebar({ children }: SidebarProps) {
  const { resolvedTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLinkClicked, setIsLinkClicked] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { signOut } = useClerk()
  const { isLoaded: listLoaded, userMemberships, setActive } = useOrganizationList()
  const { isLoaded: authLoaded, userId, orgId } = useAuth()
  const { user } = useUser()
  const { organization } = useOrganization()

  console.log('organization: ', organization)
  console.log('user.tenant_id: ', user?.publicMetadata?.tenant_id)
  console.log('orgId: ', orgId)
  console.log('userId: ', userId)

  const pathname = usePathname() // 現在のパスを取得

  // ログアウト処理
  const handleSignOut = () => {
    signOut(() => {
      window.location.href = '/sign-in'
    })
  }

  // 全てのナビゲーション項目を統合
  const navigation = [
    {
      name: 'ダッシュボード',
      href: `/dashboard`,
      icon: HomeIcon,
    },
    {
      name: '予約作成',
      href: `/dashboard/reservation/add`,
      icon: BookIcon,
    },
    {
      name: '予約ボード',
      href: `/dashboard/reservation`,
      icon: CalendarIcon,
    },
    {
      name: '予約タイムライン',
      href: `/dashboard/timeline`,
      icon: TimerIcon,
    },
    {
      name: '完了済みの予約',
      href: `/dashboard/reservations`,
      icon: CheckIcon,
    },
    {
      name: 'スタッフ管理',
      href: `/dashboard/staff`,
      icon: UsersIcon,
    },
    {
      name: 'メニュー管理',
      href: `/dashboard/menu`,
      icon: FileIcon,
    },
    {
      name: '顧客管理',
      href: `/dashboard/customer`,
      icon: UserCircleIcon,
    },
    {
      name: '顧客カルテ管理',
      href: `/dashboard/carte`,
      icon: CloudIcon,
    },
    {
      name: 'オプション管理',
      href: `/dashboard/option`,
      icon: MenuSquareIcon,
    },
    {
      name: 'クーポン管理',
      href: `/dashboard/coupon`,
      icon: GiftIcon,
    },
    {
      name: 'ポイント設定',
      href: `/dashboard/point`,
      icon: TicketIcon,
    },
    {
      name: 'サブスクリプション',
      href: `/dashboard/subscription`,
      icon: CreditCardIcon,
    },
    {
      name: '設定',
      href: `/dashboard/setting`,
      icon: SettingsIcon,
    },
  ]

  useEffect(() => {
    if (isLinkClicked) {
      setSidebarOpen(false)
      setIsLinkClicked(false)
    }
  }, [pathname, isLinkClicked, setSidebarOpen])
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!listLoaded || !authLoaded) return

    // アクティブ組織が無い時だけ実行
    if (!orgId && userMemberships.data.length > 0) {
      void setActive({ organization: userMemberships.data[0].organization.id })
    }
  }, [listLoaded, authLoaded, orgId, userMemberships, setActive])

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
                  {/* {tenant?.subscription_status !== 'active' && (
                    <div className="flex flex-col my-2 bg-muted p-2 rounded-md">
                      <p className="text-xs text-muted-foreground">
                        <span className="inline-block font-bold mb-2">
                          サブスクリプションをご契約ください。
                        </span>
                        <br />
                        以下のリンクから契約後にプラン毎の機能をご利用いただけます。
                      </p>
                    </div>
                  )} */}
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
              {/* {tenant?.subscription_status !== 'active' && (
                <div className="flex flex-col my-2 bg-muted p-2 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    <span className="inline-block font-bold mb-2">
                      サブスクリプションをご契約ください。
                    </span>
                    <br />
                    以下のリンクから契約後にプラン毎の機能をご利用いただけます。
                  </p>
                </div>
              )} */}
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
                  {/* プランバッジ表示
                  {tenant?.plan_name && (
                    <div className="flex items-center gap-x-4 lg:gap-x-6">
                      <p className="text-xs tracking-widest w-fit text-center font-bold border border-muted-foreground rounded-full px-4 py-1 bg-primary text-primary-foreground">
                        {tenant.plan_name}
                      </p>
                    </div>
                  )}

                  <span className="text-xs tracking-wider text-muted-foreground">
                    {organization?.org_email || tenant?.user_email}
                  </span> */}

                  <div aria-hidden="true" className="hidden lg:block lg:h-6 lg:w-px" />
                  <div className="relative hidden lg:block">
                    <ModeToggle />
                  </div>
                  <Menu as="div" className="relative">
                    <MenuButton className="-m-1.5 flex items-center p-1.5">
                      <span className="sr-only">ユーザーメニューを開く</span>
                      <span className="flex lg:items-center">
                        {/* <h5 className="text-sm text-muted-foreground">
                          {organization?.org_name || 'ユーザー'}
                        </h5> */}
                        <ChevronDownIcon
                          aria-hidden="true"
                          className="ml-2 size-5 text-muted-foreground"
                        />
                      </span>
                    </MenuButton>
                    <MenuItems
                      transition
                      className="absolute right-0 z-10 mt-2.5 w-52 origin-top-right rounded-md bg-background py-2 shadow-lg border border-ring transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                    >
                      <MenuItem key="emailPreferences">
                        <Link
                          href={`/dashboard/setting/email-preferences`}
                          className="block px-3 py-1 text-sm/6 text-primary data-focus:bg-gray-50 data-focus:outline-hidden hover:opacity-80 hover:bg-muted"
                        >
                          メールアドレス設定
                        </Link>
                      </MenuItem>
                      <MenuItem key="changeEmail">
                        <Link
                          href={`/dashboard/setting/change-email`}
                          className="block px-3 py-1 text-sm/6 text-primary data-focus:bg-gray-50 data-focus:outline-hidden hover:opacity-80 hover:bg-muted"
                        >
                          メールアドレス変更
                        </Link>
                      </MenuItem>
                      <MenuItem key="changePassword">
                        <Link
                          href={`/dashboard/setting/change-password`}
                          className="block px-3 py-1 text-sm/6 text-primary data-focus:bg-muted data-focus:outline-hidden hover:opacity-80 hover:bg-muted"
                        >
                          パスワード変更
                        </Link>
                      </MenuItem>
                      <MenuItem key="signOut">
                        <a
                          onClick={handleSignOut}
                          className="block px-3 py-1 text-sm/6 text-primary data-focus:bg-gray-50 data-focus:outline-hidden cursor-pointer hover:opacity-80 hover:bg-muted"
                        >
                          ログアウト
                        </a>
                      </MenuItem>
                    </MenuItems>
                  </Menu>
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
