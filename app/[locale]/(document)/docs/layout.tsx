

'use client'

import { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  Calendar,
  BookIcon,
  FileText,
  Gift,
  Ticket,
  Settings,
  ShoppingCart,
  Menu as MenuIcon,
  type LucideIcon,
  Home,
} from 'lucide-react'

const inter = Inter({ subsets: ['latin'] })

interface DocSection {
  title: string
  href: string
  icon: LucideIcon
  description: string
  badge?: string
}

const docSections: DocSection[] = [
  {
    title: 'ドキュメント',
    href: '/docs',
    icon: BookIcon,
    description: 'Bockerの操作ドキュメント',
  },
  {
    title: '予約管理',
    href: '/docs/reservation',
    icon: Calendar,
    description: '予約の作成・管理・キャンセル',
    badge: '基本機能',
  },
  {
    title: '顧客管理',
    href: '/docs/customer',
    icon: Users,
    description: '顧客情報の登録・編集・検索',
    badge: '基本機能',
  },
  {
    title: 'カルテ管理',
    href: '/docs/carte',
    icon: FileText,
    description: '顧客の施術履歴・体質情報管理',
    badge: '写真機能',
  },
  {
    title: 'メニュー管理',
    href: '/docs/menu',
    icon: MenuIcon,
    description: 'サービスメニューの作成・編集',
    badge: '基本機能',
  },
  {
    title: 'オプション管理',
    href: '/docs/option',
    icon: ShoppingCart,
    description: '追加サービス・物販商品の管理',
    badge: '在庫管理',
  },
  {
    title: 'クーポン管理',
    href: '/docs/coupon',
    icon: Gift,
    description: '割引クーポンの作成・管理',
    badge: 'プロモーション',
  },
  {
    title: 'ポイント機能',
    href: '/docs/point',
    icon: Ticket,
    description: 'ポイント付与・利用システム',
    badge: 'リピート促進',
  },
  {
    title: 'スタッフ管理',
    href: '/docs/staff',
    icon: Users,
    description: 'スタッフの登録・権限管理',
    badge: '権限設定',
  },
  {
    title: '店舗設定',
    href: '/docs/setting',
    icon: Settings,
    description: '基本設定・営業時間・決済設定',
    badge: '初期設定',
  },
]

const SidebarContent = () => {
  const pathname = usePathname()

  console.log(pathname)

  return (
    <div className="sticky top-24">
      <nav className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground mb-4">機能別ガイド</h2>
        {docSections.map((section) => {
          const currentPath = pathname.split('/')[3]
          const isActive = currentPath === section.href.split('/')[2]
          return (
            <Link
              key={section.href}
              href={section.href}
              className={cn(
                'group flex items-center justify-between p-3 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:opacity-80'
              )}
            >
              <div className="flex items-center space-x-3">
                <section.icon className={cn('h-5 w-5', isActive && 'text-accent-foreground')} />
                <span className="font-medium">{section.title}</span>
              </div>
              {section.badge && (
                <Badge variant="secondary" className="text-xs border-border border">
                  {section.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

interface DocsLayoutProps {
  children: ReactNode
}

export default function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background', inter.className)}>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Image src="/assets/images/logo.png" alt="Bocker" width={32} height={32} />
                <h1 className="text-base md:text-lg font-bold text-foreground">
                  Bocker 操作ドキュメント
                </h1>
              </div>
            </div>
            <Button variant="outline" size="icon">
              <Link href="/sign-in">
                <Home className="h-6 w-6" />
              </Link>
            </Button>
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MenuIcon className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full max-w-xs sm:max-w-sm">
                  <SheetTitle className="sr-only">メニュー</SheetTitle>
                  <ScrollArea className="h-full pr-4">
                    <SidebarContent />
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <SidebarContent />
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <div className="bg-card rounded-lg shadow-sm border border-border">
              <ScrollArea className="h-full">
                <div className="p-4 md:p-6 lg:p-8">{children}</div>
              </ScrollArea>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 md:mt-16 border-t border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-xs md:text-sm text-muted-foreground">
            <p>© 2025 Bocker. All rights reserved.</p>
            <p className="mt-2">
              お困りの際は{' '}
              <a
                href="mailto:bocker.help@gmail.com"
                className="text-link-foreground hover:opacity-80 font-semibold underline"
              >
                bocker.help@gmail.com
              </a>{' '}
              までお問い合わせください
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
