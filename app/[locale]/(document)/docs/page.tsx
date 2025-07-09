import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  type LucideIcon
} from 'lucide-react';

interface DocSection {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  badge?: string;
  features: string[];
}

const docSections: DocSection[] = [
  {
    title: '予約管理',
    href: '/docs/reservation',
    icon: Calendar,
    description: '予約の作成・管理・キャンセル機能の操作方法',
    badge: '基本機能',
    features: ['タイムライン表示', '現金・クレジット決済', 'キャンセル処理', '在庫管理']
  },
  {
    title: '顧客管理',
    href: '/docs/customer',
    icon: Users,
    description: '顧客情報の登録・編集・検索機能',
    badge: '基本機能',
    features: ['顧客情報登録', '検索機能', 'ポイント管理', 'マイページ']
  },
  {
    title: 'カルテ管理',
    href: '/docs/carte',
    icon: FileText,
    description: '顧客の施術履歴・体質情報管理',
    badge: '写真機能',
    features: ['基本情報管理', '施術写真', '音声入力', '履歴管理']
  },
  {
    title: 'メニュー管理',
    href: '/docs/menu',
    icon: Menu,
    description: 'サービスメニューの作成・編集・公開管理',
    badge: '基本機能',
    features: ['メニュー作成', '画像登録', 'カテゴリ分類', '価格設定']
  },
  {
    title: 'オプション管理',
    href: '/docs/option',
    icon: ShoppingCart,
    description: '追加サービス・物販商品の管理',
    badge: '在庫管理',
    features: ['物販商品', '施術オプション', '在庫管理', 'セール価格']
  },
  {
    title: 'クーポン管理',
    href: '/docs/coupon',
    icon: Gift,
    description: '割引クーポンの作成・管理',
    badge: 'プロモーション',
    features: ['パーセント/固定額割引', '期間限定設定', '除外メニュー', '利用回数管理']
  },
  {
    title: 'ポイント機能',
    href: '/docs/point',
    icon: Ticket,
    description: 'ポイント付与・利用システム',
    badge: 'リピート促進',
    features: ['自動ポイント付与', '有効期限管理', '履歴確認', '付与率設定']
  },
  {
    title: 'スタッフ管理',
    href: '/docs/staff',
    icon: Users,
    description: 'スタッフの登録・権限管理・勤務スケジュール',
    badge: '権限設定',
    features: ['メール招待', '権限管理', '勤務スケジュール', '指名料設定']
  },
  {
    title: '店舗設定',
    href: '/docs/setting',
    icon: Settings,
    description: '基本設定・営業時間・決済設定',
    badge: '初期設定',
    features: ['基本情報', '営業時間', 'LINE連携', 'Stripe決済']
  }
];

const planFeatures = [
  { plan: 'LITE', price: '8,000円', features: ['基本機能', '5メニュー', '5クーポン', '5オプション'] },
  { plan: 'PRO', price: '12,000円', features: ['全機能', '20メニュー', '20クーポン', '10オプション', '写真機能'] }
];

export default function DocsHomePage() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Book className="h-10 w-10 md:h-12 md:w-12 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Bocker 操作ガイド</h1>
        </div>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
          美容サロン向け予約管理システム「Bocker」の詳細な操作方法をご案内します。
          初めての方でも安心してご利用いただけるよう、機能別に丁寧に説明しています。
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <Badge variant="secondary">リアルタイム予約管理</Badge>
          <Badge variant="secondary">LINE連携</Badge>
          <Badge variant="secondary">クレジット決済</Badge>
          <Badge variant="secondary">顧客管理</Badge>
        </div>
      </div>

      {/* Quick Start */}
      <Card className="bg-accent border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
            <Star className="h-5 w-5 text-primary" />
            <span>はじめに</span>
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Bockerを初めてご利用の方は、まず店舗設定から始めることをお勧めします。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-card rounded-lg">
              <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <p className="font-medium text-sm md:text-base">店舗設定</p>
                <p className="text-xs md:text-sm text-muted-foreground">基本情報と営業時間を設定</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-card rounded-lg">
              <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <p className="font-medium text-sm md:text-base">メニュー作成</p>
                <p className="text-xs md:text-sm text-muted-foreground">提供するサービスを登録</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-card rounded-lg">
              <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <p className="font-medium text-sm md:text-base">予約受付開始</p>
                <p className="text-xs md:text-sm text-muted-foreground">予約の作成・管理開始</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Sections */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">機能別ガイド</h2>
          <p className="text-xs md:text-sm text-muted-foreground">各機能の詳細な操作方法をご確認いただけます</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {docSections.map((section) => (
            <Card key={section.href} className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-accent rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <section.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base md:text-lg">{section.title}</CardTitle>
                      {section.badge && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {section.badge}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription className="text-xs md:text-sm">
                  {section.description}
                </CardDescription>
                <div className="space-y-1">
                  {section.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <div className="w-1 h-1 bg-primary rounded-full" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start p-0 h-auto text-primary hover:text-primary/90 text-xs md:text-sm"
                  asChild
                >
                  <a href={section.href}>
                    詳細を見る
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </a>
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
            <Card key={plan.plan} className={plan.plan === 'PRO' ? 'border-primary/20 bg-accent' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg md:text-xl">{plan.plan}プラン</CardTitle>
                  <div className="text-right">
                    <div className="text-xl md:text-2xl font-bold text-primary">{plan.price}</div>
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
      <Card className="bg-muted border-border">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">サポート情報</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            ご不明な点がございましたら、お気軽にお問い合わせください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm md:text-base mb-2">メールサポート</h4>
              <p className="text-xs md:text-sm text-muted-foreground">
                <a href="mailto:support@bocker.jp" className="text-primary hover:text-primary/90">
                  support@bocker.jp
                </a>
              </p>
              <p className="text-xs text-muted-foreground/80 mt-1">営業時間: 平日 10:00-18:00</p>
            </div>
            <div>
              <h4 className="font-medium text-sm md:text-base mb-2">よくある質問</h4>
              <p className="text-xs md:text-sm text-muted-foreground">
                各機能ガイドの「FAQ・補足」セクションで、よくある質問とその回答をご確認いただけます。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}