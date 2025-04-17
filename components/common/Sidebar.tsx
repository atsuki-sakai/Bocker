"use client";

import { usePathname } from 'next/navigation';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { usePreloadedQuery } from 'convex/react';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { Loading } from '@/components/common';
import RoleBasedView from './RoleBasedView';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
} from '@headlessui/react';
import {
  MenuIcon,
  CalendarIcon,
  SettingsIcon,
  UserCircleIcon,
  FileIcon,
  FolderIcon,
  HomeIcon,
  XIcon,
  CreditCardIcon,
  ChevronDownIcon,
  TicketIcon,
  GiftIcon,
} from 'lucide-react';
import { useClerk, useAuth } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';
import { Preloaded } from 'convex/react';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface SidebarProps {
  children: React.ReactNode;
  preloadedSalon: Preloaded<typeof api.salon.core.query.findByClerkId>;
}

export default function Sidebar({ children, preloadedSalon }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const salon = usePreloadedQuery(
    preloadedSalon as Preloaded<typeof api.salon.core.query.findByClerkId>
  );
  const {
    isAuthenticated: isStaffAuthenticated,
    logout: staffLogout,
    name: staffName,
    role: staffRole,
    salonId,
  } = useStaffAuth();
  const pathname = usePathname(); // 現在のパスを取得

  console.log('staffRole', staffRole);

  // オーナーかスタッフかを判定
  // スタッフ認証が存在する場合は、Clerkセッションがあってもスタッフとして扱う
  const isOwner = isSignedIn && !isStaffAuthenticated;

  // オーナーログアウト処理
  const handleOwnerSignOut = () => {
    signOut(() => {
      window.location.href = '/sign-in';
    });
  };

  // スタッフログアウト処理
  const handleStaffSignOut = () => {
    if (salonId) {
      staffLogout(salonId);
    }
  };
  // navigation の current は削除し、表示時に pathname と比較する
  const navigation = [
    {
      name: 'ダッシュボード',
      href: `/dashboard`,
      icon: HomeIcon,
      requiredRole: 'staff', //スタッフ以上
      requiredPlan: 'Lite',
    },
    {
      name: '予約カレンダー',
      href: `/dashboard/reservation`,
      icon: CalendarIcon,
      requiredRole: 'staff', //スタッフ以上
      requiredPlan: 'Lite',
    },
    {
      name: 'タイムライン',
      href: `/dashboard/timeline`,
      icon: CalendarIcon,
      requiredRole: 'staff', // スタッフ以上
      requiredPlan: 'Pro',
    },
    {
      name: 'スタッフ一覧',
      href: `/dashboard/staff`,
      icon: FolderIcon,
      requiredRole: 'owner', // オーナーのみ
      requiredPlan: 'Lite',
    },
    {
      name: 'メニュー一覧',
      href: `/dashboard/menu`,
      icon: FileIcon,
      requiredRole: 'manager', // マネージャー以上
      requiredPlan: 'Lite',
    },
    {
      name: '顧客一覧',
      href: `/dashboard/customer`,
      icon: UserCircleIcon,
      requiredRole: 'manager', // マネージャー以上
      requiredPlan: 'Lite',
    },
    {
      name: '顧客カルテ',
      href: `/dashboard/carte`,
      icon: TicketIcon,
      requiredRole: 'manager', // マネージャー以上
      requiredPlan: 'Pro',
    },
    {
      name: 'オプション一覧',
      href: `/dashboard/option`,
      icon: SettingsIcon,
      requiredRole: 'manager', // マネージャー以上
      requiredPlan: 'Pro',
    },
    {
      name: 'クーポン設定',
      href: `/dashboard/coupon`,
      icon: GiftIcon,
      requiredRole: 'manager', // マネージャー以上
      requiredPlan: 'Pro',
    },
    {
      name: 'ポイント設定',
      href: `/dashboard/point`,
      icon: TicketIcon,
      requiredRole: 'manager', // マネージャー以上
      requiredPlan: 'Pro',
    },
  ];

  // オーナーのみに表示する項目
  const ownerOnlyNavigation = [
    {
      name: 'サブスクリプション',
      href: `/dashboard/subscription`,
      icon: CreditCardIcon,
      requiredRole: 'admin', // オーナーのみ
    },
  ];

  if (!salon) {
    return <Loading />;
  }

  // サブスクリプションがアクティブでない場合はリダイレクト
  if (salon?.subscriptionStatus !== 'active' && pathname !== '/dashboard/subscription') {
    return redirect('/dashboard/subscription');
  }

  return (
    <>
      <div>
        <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
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
                    <XIcon aria-hidden="true" className="size-6 text-white" />
                  </button>
                </div>
              </TransitionChild>
              {/* Sidebar for mobile */}
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                <div className="flex flex-col mt-2">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-purple-500 bg-clip-text text-transparent">
                    Bcker
                  </h1>
                  <div className="flex items-center gap-x-2">
                    <p className="text-xs text-slate-500">サロンの運営をもっと便利に。</p>
                  </div>
                </div>

                <nav className="flex flex-1 flex-col">
                  {isOwner && salon?.subscriptionStatus !== 'active' && (
                    <div className="flex flex-col my-2 bg-green-50 p-2 rounded-md">
                      <p className="text-xs text-green-700">
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
                          // 現在のページかどうかを pathname と比較して判定
                          const isCurrent = pathname === item.href;

                          const linkContent = (
                            <a
                              href={item.href}
                              className={classNames(
                                isCurrent
                                  ? 'bg-gray-50 text-blue-600 font-bold'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-light',
                                'group flex gap-x-3 rounded-md p-2 text-sm/6'
                              )}
                            >
                              <item.icon
                                aria-hidden="true"
                                className={classNames(
                                  isCurrent
                                    ? 'text-blue-600 font-bold'
                                    : 'text-gray-400 group-hover:text-blue-600 font-light',
                                  'size-6 shrink-0'
                                )}
                              />
                              {item.name}
                            </a>
                          );

                          // 権限に基づいた表示（オーナーの場合は常に表示）
                          if (isOwner) {
                            // オーナーの場合でもプランに基づいた表示制御
                            if (item.requiredPlan) {
                              const hasPlanAccess =
                                (item.requiredPlan === 'Lite' &&
                                  (salon?.planName === 'Lite' || salon?.planName === 'Pro')) ||
                                (item.requiredPlan === 'Pro' && salon?.planName === 'Pro');

                              return hasPlanAccess ? <li key={item.name}>{linkContent}</li> : null;
                            }
                            return <li key={item.name}>{linkContent}</li>;
                          } else if (item.requiredRole) {
                            return (
                              <li key={item.name}>
                                <RoleBasedView
                                  requiredRole={
                                    item.requiredRole as 'staff' | 'admin' | 'manager' | 'owner'
                                  }
                                  requiredPlan={item.requiredPlan as 'Lite' | 'Pro' | undefined}
                                  currentPlan={salon?.planName}
                                >
                                  {linkContent}
                                </RoleBasedView>
                              </li>
                            );
                          }

                          return null;
                        })}

                        {/* オーナーにのみ表示する項目 */}
                        {isOwner &&
                          ownerOnlyNavigation.map((item) => {
                            const isCurrent = pathname === item.href;
                            return (
                              <li key={item.name}>
                                <a
                                  href={item.href}
                                  className={classNames(
                                    isCurrent
                                      ? 'bg-gray-50 text-blue-600 font-bold'
                                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-light',
                                    'group flex gap-x-3 rounded-md p-2 text-sm/6'
                                  )}
                                >
                                  <item.icon
                                    aria-hidden="true"
                                    className={classNames(
                                      isCurrent
                                        ? 'text-blue-600 font-bold'
                                        : 'text-gray-400 group-hover:text-blue-600 font-light',
                                      'size-6 shrink-0'
                                    )}
                                  />
                                  {item.name}
                                </a>
                              </li>
                            );
                          })}
                      </ul>
                    </li>

                    {isOwner && salon?.subscriptionStatus === 'active' && (
                      <a
                        href={`/dashboard/setting`}
                        className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm/6 text-slate-600 hover:bg-gray-50 hover:text-slate-800"
                      >
                        <SettingsIcon
                          aria-hidden="true"
                          className="size-6 shrink-0 text-slate-600 group-hover:text-slate-800"
                        />
                        設定
                      </a>
                    )}
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
            <div className="flex flex-col mt-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-purple-500 bg-clip-text text-transparent">
                Bcker
              </h1>
              <div className="flex items-center gap-x-2">
                <p className="text-xs text-slate-500">サロンの運営をもっと便利に。</p>
              </div>
            </div>
            <nav className="flex flex-1 flex-col">
              {isOwner && salon?.subscriptionStatus !== 'active' && (
                <div className="flex flex-col my-2 bg-green-50 p-2 rounded-md">
                  <p className="text-xs text-green-700">
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
                      const isCurrent = pathname === item.href;

                      const linkContent = (
                        <a
                          href={item.href}
                          className={classNames(
                            isCurrent
                              ? 'bg-gray-50 text-blue-600 font-bold'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-light',
                            'group flex gap-x-3 rounded-md p-2 text-sm/6'
                          )}
                        >
                          <item.icon
                            aria-hidden="true"
                            className={classNames(
                              isCurrent
                                ? 'text-blue-600'
                                : 'text-gray-400 group-hover:text-blue-600',
                              'size-6 shrink-0'
                            )}
                          />
                          {item.name}
                        </a>
                      );

                      // 権限に基づいた表示（オーナーの場合は常に表示）
                      if (isOwner) {
                        // オーナーの場合でもプランに基づいた表示制御
                        if (item.requiredPlan) {
                          const hasPlanAccess =
                            (item.requiredPlan === 'Lite' &&
                              (salon?.planName === 'Lite' || salon?.planName === 'Pro')) ||
                            (item.requiredPlan === 'Pro' && salon?.planName === 'Pro');

                          return hasPlanAccess && salon?.subscriptionStatus === 'active' ? (
                            <li key={item.name}>{linkContent}</li>
                          ) : null;
                        }
                        return <li key={item.name}>{linkContent}</li>;
                      } else if (item.requiredRole) {
                        return (
                          <li key={item.name}>
                            <RoleBasedView
                              requiredRole={
                                item.requiredRole as 'staff' | 'admin' | 'manager' | 'owner'
                              }
                              requiredPlan={item.requiredPlan as 'Lite' | 'Pro' | undefined}
                              currentPlan={salon?.planName}
                            >
                              {linkContent}
                            </RoleBasedView>
                          </li>
                        );
                      }

                      return null;
                    })}

                    {/* オーナーにのみ表示する項目 */}
                    {isOwner &&
                      ownerOnlyNavigation.map((item) => {
                        const isCurrent = pathname === item.href;
                        return (
                          <li key={item.name}>
                            <a
                              href={item.href}
                              className={classNames(
                                isCurrent
                                  ? 'bg-gray-50 text-blue-600 font-bold'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-light',
                                'group flex gap-x-3 rounded-md p-2 text-sm/6'
                              )}
                            >
                              <item.icon
                                aria-hidden="true"
                                className={classNames(
                                  isCurrent
                                    ? 'text-blue-600'
                                    : 'text-gray-400 group-hover:text-blue-600',
                                  'size-6 shrink-0'
                                )}
                              />
                              {item.name}
                            </a>
                          </li>
                        );
                      })}
                  </ul>
                </li>

                {isOwner && salon?.subscriptionStatus === 'active' && (
                  <li className="mt-auto">
                    <a
                      href={`/dashboard/setting`}
                      className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    >
                      <SettingsIcon
                        aria-hidden="true"
                        className="size-6 shrink-0 text-gray-400 group-hover:text-blue-600"
                      />
                      設定
                    </a>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </div>
        <div className="lg:pl-72">
          <div className="sticky top-0 z-40 lg:mx-auto lg:px-8">
            <div className="flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-xs sm:gap-x-6 sm:px-6 lg:px-0 lg:shadow-none">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
              >
                <span className="sr-only">サイドバーを開く</span>
                <MenuIcon aria-hidden="true" className="size-6" />
              </button>

              <div aria-hidden="true" className="h-6 w-px bg-gray-200 lg:hidden" />

              <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                <div className="flex items-center justify-start w-full"></div>
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                  {/* プロプランバッジは管理者のみ表示 */}
                  {salon?.planName && (
                    <div className="flex items-center gap-x-4 lg:gap-x-6">
                      <p className="text-xs tracking-widest w-fit text-center font-bold border border-blue-700 rounded-full px-4 py-1 bg-blue-100 text-blue-700">
                        {salon?.planName}
                      </p>
                    </div>
                  )}

                  <span className="text-xs tracking-wider text-slate-500">{salon.email}</span>

                  <div
                    aria-hidden="true"
                    className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200"
                  />
                  <Menu as="div" className="relative">
                    <MenuButton className="-m-1.5 flex items-center p-1.5">
                      <span className="sr-only">ユーザーメニューを開く</span>
                      <span className="flex lg:items-center">
                        <h5 className="text-sm text-gray-700">
                          {isOwner ? (staffName ?? '') : (staffName ?? '')}
                        </h5>
                        <ChevronDownIcon aria-hidden="true" className="ml-2 size-5 text-gray-400" />
                      </span>
                    </MenuButton>
                    <MenuItems
                      transition
                      className="absolute right-0 z-10 mt-2.5 w-52 origin-top-right rounded-md bg-white py-2 ring-1 shadow-lg ring-gray-900/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                    >
                      {isOwner && salon?.subscriptionStatus === 'active' && (
                        <MenuItem key="emailPreferences">
                          <Link
                            href={`/dashboard/setting/email-preferences`}
                            className="block px-3 py-1 text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden hover:bg-gray-50"
                          >
                            メールアドレス設定
                          </Link>
                        </MenuItem>
                      )}
                      {isOwner && salon?.subscriptionStatus === 'active' && (
                        <MenuItem key="changeEmail">
                          <Link
                            href={`/dashboard/setting/change-email`}
                            className="block px-3 py-1 text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden hover:bg-gray-50"
                          >
                            メールアドレス変更
                          </Link>
                        </MenuItem>
                      )}
                      {isOwner && salon?.subscriptionStatus === 'active' && (
                        <MenuItem key="changePassword">
                          <Link
                            href={`/dashboard/setting/change-password`}
                            className="block px-3 py-1 text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden hover:bg-gray-50"
                          >
                            パスワード変更
                          </Link>
                        </MenuItem>
                      )}
                      <MenuItem key="signOut">
                        <a
                          onClick={isOwner ? handleOwnerSignOut : handleStaffSignOut}
                          className="block px-3 py-1 text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden cursor-pointer hover:bg-gray-50"
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
  );
}