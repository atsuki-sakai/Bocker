'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import {
  Book,
  Users,
  Calendar,
  FileText,
  Gift,
  Ticket,
  Settings,
  ShoppingCart,
  Menu,
  ArrowRight,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { Support } from '@/app/[locale]/(document)/_components'

interface DocSection {
  title: string
  href: string
  icon: LucideIcon
  description: string
  badge?: string
  features: string[]
}

const docSections: DocSection[] = [
  {
    title: '予約管理',
    href: '/docs/reservation',
    icon: Calendar,
    description: '予約の作成・管理・キャンセル機能の操作方法',
    badge: '基本機能',
    features: ['タイムライン表示', '現金・クレジット決済', 'キャンセル処理', '在庫管理'],
  },
  {
    title: '顧客管理',
    href: '/docs/customer',
    icon: Users,
    description: '顧客情報の登録・編集・検索機能',
    badge: '基本機能',
    features: ['顧客情報登録', '検索機能', 'ポイント管理', 'マイページ'],
  },
  {
    title: 'カルテ管理',
    href: '/docs/carte',
    icon: FileText,
    description: '顧客の施術履歴・体質情報管理',
    badge: '写真機能',
    features: ['基本情報管理', '施術写真', '音声入力', '履歴管理'],
  },
  {
    title: 'メニュー管理',
    href: '/docs/menu',
    icon: Menu,
    description: 'サービスメニューの作成・編集・公開管理',
    badge: '基本機能',
    features: ['メニュー作成', '画像登録', 'カテゴリ分類', '価格設定'],
  },
  {
    title: 'オプション管理',
    href: '/docs/option',
    icon: ShoppingCart,
    description: '追加サービス・物販商品の管理',
    badge: '在庫管理',
    features: ['物販商品', '施術オプション', '在庫管理', 'セール価格'],
  },
  {
    title: 'クーポン管理',
    href: '/docs/coupon',
    icon: Gift,
    description: '割引クーポンの作成・管理',
    badge: 'プロモーション',
    features: ['パーセント/固定額割引', '期間限定設定', '除外メニュー', '利用回数管理'],
  },
  {
    title: 'ポイント機能',
    href: '/docs/point',
    icon: Ticket,
    description: 'ポイント付与・利用システム',
    badge: 'リピート促進',
    features: ['自動ポイント付与', '有効期限管理', '履歴確認', '付与率設定'],
  },
  {
    title: 'スタッフ管理',
    href: '/docs/staff',
    icon: Users,
    description: 'スタッフの登録・権限管理・勤務スケジュール',
    badge: '権限設定',
    features: ['メール招待', '権限管理', '勤務スケジュール', '指名料設定'],
  },
  {
    title: '店舗設定',
    href: '/docs/setting',
    icon: Settings,
    description: '基本設定・営業時間・決済設定',
    badge: '初期設定',
    features: ['基本情報', '営業時間', 'LINE連携', 'Stripe決済'],
  },
]

const planFeatures = [
  {
    plan: 'LITE',
    price: '8,000円',
    features: ['予約管理'],
  },
  {
    plan: 'PRO',
    price: '12,000円',
    features: ['全機能', '20メニュー', '20クーポン', '10オプション', '写真機能'],
  },
]

export default function DocsHomePage() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="p-2 bg-neon-foreground rounded-lg">
            <Book className="h-6 w-6 text-neon" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">Bocker 操作ガイド</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              美容サロン向け予約管理システムの詳細な操作方法
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <Badge>リアルタイム予約管理</Badge>
          <Badge>LINE連携</Badge>
          <Badge>クレジット決済</Badge>
          <Badge>顧客管理</Badge>
        </div>
      </div>

      {/* Quick Start */}
      <div>
        <h2 className="text-xl md:text-3xl font-bold text-foreground mb-2">はじめに</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Bockerを初めてご利用の方は、まず店舗設定から始めることをお勧めします。
            初めての方でも安心してご利用いただけるよう、機能別に丁寧に説明しています。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <p className="font-semibold text-link-foreground">店舗設定</p>
                <p className="text-xs md:text-sm text-link-foreground">基本情報と営業時間を設定</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <p className="font-semibold text-link-foreground">メニュー作成</p>
                <p className="text-xs md:text-sm text-link-foreground">提供するサービスを登録</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <p className="font-semibold text-link-foreground">予約受付開始</p>
                <p className="text-xs md:text-sm text-link-foreground">予約の作成・管理開始</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4 text-white">
            <Star className="h-4 w-4 text-link-foreground" />
            <p className="text-link-foreground text-xs md:text-sm">
              初期設定完了後は、予約管理・顧客管理の順で進めることを推奨します。
            </p>
          </div>
        </div>
      </div>

      {/* Documentation Sections */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">機能別ガイド</h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            各機能の詳細な操作方法をご確認いただけます
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {docSections.map((section) => (
            <Card
              key={section.href}
              className="group hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-neon-foreground rounded-lg transition-colors">
                      <section.icon className="h-5 w-5 text-neon" />
                    </div>
                    <div>
                      <CardTitle className="text-base md:text-lg">{section.title}</CardTitle>
                      {section.badge && <Badge className="text-xs mt-1">{section.badge}</Badge>}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription className="text-xs md:text-sm">
                  {section.description}
                </CardDescription>
                <div className="space-y-1">
                  {section.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 text-xs text-muted-foreground"
                    >
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start p-0 h-auto text-primary hover:opacity-80 text-xs md:text-sm"
                  asChild
                >
                  <Link href={section.href}>
                    詳細を見る
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Plan Information */}
      <div className="space-y-6">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">プラン別機能</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {planFeatures.map((plan) => (
            <Card
              key={plan.plan}
              className={plan.plan === 'PRO' ? 'border-border bg-primary text-background' : ''}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg md:text-xl">{plan.plan}プラン</CardTitle>
                  <div className="text-right">
                    <div
                      className={`text-xl md:text-2xl font-bold ${
                        plan.plan === 'PRO' ? 'text-background' : 'text-primary'
                      }`}
                    >
                      {plan.price}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">月額（税込）</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2 text-sm md:text-base">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Support Information */}
      <Support />
    </div>
  )
}
