import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Menu, 
  Tag, 
  Plus,
  Edit3,
  Star,
  Info,
  Eye,
  Image as ImageIcon,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Search,
} from 'lucide-react';
import {
  Support,
  FaqCard,
  ErrorWarningInfoCard,
  ScenarioCard,
} from '@/app/[locale]/(document)/_components'

const scenarioItems = [
  {
    title: '新メニューの追加から予約受付まで',
    description:
      '新しいトリートメントメニューを作成 → 画像3枚を登録 → カテゴリ「トリートメント」を選択 → 公開設定をON',
    helpText:
      '価格5,000円、所要時間60分を設定。「髪質改善」「ダメージケア」などのタグを追加。顧客が予約時にメニューを選択可能に。',
  },
  {
    title: 'セットメニューの作成',
    description:
      '「カット＋カラー」などの複合メニューを作成 → 複数のカテゴリを選択 → セット価格を設定',
    helpText:
      '複数のカテゴリ（カット、カラー）を選択。セット価格を設定（個別より割引価格）。所要時間は合計時間を設定。',
  },
  {
    title: '期間限定キャンペーンの設定',
    description:
      '既存メニューの編集画面を開く → セール価格を設定 → タグに「期間限定」を追加 → 更新',
    helpText: '通常5,000円→4,000円のセール価格を設定。予約画面では割引価格が強調表示される。',
  },
]

const errorItems = [
  {
    title: '画像のアップロードに失敗しました',
    description: '画像を圧縮して6MB以下にしてから再度アップロード',
  },
  {
    title: 'メニュー名は必須です',
    description: 'メニュー名を入力してから保存',
  },
  {
    title: 'セール価格は通常価格より低く設定してください',
    description: 'セール価格を通常価格より低く設定',
  },
]

const warningItems = [
  {
    title: '1枚目の画像がサムネイルとして使用される',
    description: '顧客が最初に見る画像として適切なものを選択してください',
  },
  {
    title: '複数カテゴリを選択するとセットメニューとして扱われる',
    description: '単一メニューの場合は1つのカテゴリのみ選択してください',
  },
  {
    title: 'オンライン決済を有効にするには決済設定が必要',
    description: '事前にStripe Connectの設定を完了してください',
  },
  {
    title: '編集中のデータは自動保存されない',
    description: '必ず「更新」ボタンをクリックして保存してください',
  },
]

const faqs = [
  {
    question: 'メニューは何個まで作成できますか？',
    answer:
      'プランによって上限が異なります。スタータープラン：20個まで / スタンダードプラン：50個まで / プレミアムプラン：無制限',
  },
  {
    question: '削除したメニューを復元できますか？',
    answer: '削除したメニューは復元できません。非表示機能の利用をお勧めします。',
  },
  {
    question: '画像なしでメニューを作成できますか？',
    answer: 'はい、画像は任意項目です。後から追加することも可能です。',
  },
  {
    question: 'セットメニューの価格は自動計算されますか？',
    answer: 'いいえ、セットメニューの価格は手動で設定する必要があります。',
  },
]

export default function MenuManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-neon-foreground rounded-lg">
            <Menu className="h-6 w-6 text-neon" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">メニュー管理機能</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              サービスメニューの作成・編集・公開管理の詳細操作方法
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>基本機能</Badge>
          <Badge>画像登録</Badge>
          <Badge>カテゴリ分類</Badge>
          <Badge>価格設定</Badge>
        </div>
      </div>

      {/* 機能概要 */}
      <div>
        <h2 className="text-xl md:text-3xl font-bold text-foreground mb-2">機能概要</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            メニュー機能は、美容サロンで提供するサービスメニューを管理するための機能です。
            メニューの作成、編集、価格設定、カテゴリ分類、画像登録など、サービスメニューに関する全ての情報を一元管理できます。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">対象ユーザー</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>サロンオーナー: メニューの作成・価格設定・公開管理</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>スタッフ: メニュー情報の確認・予約時のメニュー選択</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>顧客: 予約時にメニューを選択（LINE予約システム経由）</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">主な機能</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>メニュー作成・編集・削除</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>画像登録（最大3枚）</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>カテゴリ分類・タグ付け</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>価格設定・セール価格</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4 text-white">
            <Star className="h-4 w-4 text-link-foreground" />
            <p className="text-link-foreground text-xs md:text-sm">
              プラン別上限: スタータープラン: 20個まで / スタンダードプラン: 50個まで /
              プレミアムプラン: 無制限
            </p>
          </div>
        </div>
      </div>

      {/* 画面構成 */}
      <Card>
        <CardHeader>
          <CardTitle>画面構成と導線</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground mb-3">メニュー機能の画面一覧</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Menu className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">メニュー一覧画面</p>
                    <Link
                      target="_blank"
                      href="/dashboard/menu"
                      className="text-xs text-link-foreground underline"
                    >
                      /dashboard/menu
                    </Link>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Plus className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">メニュー新規作成画面</p>
                    <Link
                      target="_blank"
                      href="/dashboard/menu/add"
                      className="text-xs text-link-foreground underline"
                    >
                      /dashboard/menu/add
                    </Link>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Eye className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">メニュー詳細画面</p>
                    <p className="text-xs text-link-foreground">/dashboard/menu/[menu_id]</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Edit3 className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">メニュー編集画面</p>
                    <p className="text-xs text-link-foreground">/dashboard/menu/[menu_id]/edit</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg text-sm">
            <h4 className="font-semibold text-foreground mb-2">各画面への導線</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>ダッシュボード → サイドメニュー「メニュー」→ メニュー一覧画面</p>
              <p>メニュー一覧画面 → 「新規作成」ボタン → メニュー新規作成画面</p>
              <p>メニュー一覧画面 → メニュー項目クリック → メニュー詳細画面</p>
              <p>メニュー詳細画面 → 「編集」ボタン → メニュー編集画面</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 新規作成手順 */}
      <Card>
        <CardHeader>
          <CardTitle>新規メニュー作成手順</CardTitle>
          <CardDescription>新しいサービスメニューを作成する詳細手順</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">基本情報の入力</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">メニュー名（必須）</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      例：カット、カラー、パーマ
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">カテゴリ（必須）</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      1つ以上選択（最大5つまで）
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">価格・所要時間（必須）</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      通常価格（1円〜999,999円）、所要時間（5分〜360分）
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">説明文（必須）</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      メニューの詳細説明を入力
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">画像の登録（任意）</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground flex items-center space-x-2">
                      <ImageIcon className="h-4 w-4 text-link-foreground" />
                      <span>最大3枚まで登録可能</span>
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      画像エリアをクリックまたはドラッグ&ドロップ（1枚あたり最大6MB）
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">対応形式</p>
                    <p className="text-xs md:text-sm text-link-foreground">JPG、PNG、WebP、GIF</p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">推奨サイズ</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      800×1200px（縦長）、最小サイズ：400×600px
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">詳細設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-link-foreground" />
                      <span>セール価格（任意）</span>
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      キャンペーン価格を設定
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">ターゲット設定</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      対象顧客：全員/初回のみ/リピーターのみ、性別：全性別/男性のみ/女性のみ
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-link-foreground" />
                      <span>タグ（任意）</span>
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      検索用キーワードを最大5つまで設定
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">支払い方法と公開設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">支払い方法</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      店頭決済のみ/オンライン決済のみ/両方対応
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">公開設定</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      「メニューを公開する」スイッチで公開/非公開を設定
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                5
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">
                  「メニューを追加」ボタンをクリックして保存
                </h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  入力した情報が保存され、メニュー一覧画面に戻ります
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4">
            <Info className="h-6 w-6 text-link-foreground" />
            <p className="text-xs md:text-sm text-link-foreground">
              メニューを作成した後、公開設定をONにすることで顧客向けの予約システムに表示されます。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 編集・更新手順 */}
      <Card>
        <CardHeader>
          <CardTitle>メニューの編集・更新</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">
                  メニュー一覧画面から編集したいメニューをクリック
                </h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  メニュー詳細画面が表示されます
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">
                  メニュー詳細画面で「編集」ボタンをクリック
                </h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  編集画面に移動します
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">編集画面で情報を修正</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">画像の変更</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      既存画像の削除、新規画像の追加、順序変更が可能
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">価格変更</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      通常価格・セール価格の変更
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">その他の項目</p>
                    <p className="text-xs md:text-sm text-link-foreground">全ての項目が編集可能</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">「更新」ボタンをクリックして保存</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  変更内容が保存され、詳細画面に戻ります
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 検索・フィルター */}
      <Card>
        <CardHeader>
          <CardTitle>検索・フィルターの使い方</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">メニュー一覧での検索</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">メニュー名で検索</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">価格で検索</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">タグで検索</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  リアルタイムで結果が絞り込まれます
                </p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">カテゴリフィルター（予約画面）</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">「カテゴリを絞り込む」ボタンをクリック</p>
                  <p>表示したいカテゴリにチェック</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">複数選択可能</p>
                  <p>選択したカテゴリのメニューのみ表示</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 削除・非表示 */}
      <Card>
        <CardHeader>
          <CardTitle>メニューの削除・非表示方法</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">メニューの削除</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. メニュー詳細画面で「削除」ボタンをクリック</p>
                <p>2. 確認ダイアログで「削除する」をクリック</p>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>注意:</strong> 削除したメニューは復元できません
                  </AlertDescription>
                </Alert>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">メニューの非表示（推奨）</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. メニュー編集画面で「メニューを公開する」スイッチをOFF</p>
                <p>2. 「更新」ボタンをクリック</p>
                <p>3. 非表示のメニューは予約画面に表示されません</p>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>データは保持され、再度有効化可能です</AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 利用シナリオ */}
      <ScenarioCard scenarioItems={scenarioItems} />

      {/* エラー・注意事項 */}
      <ErrorWarningInfoCard
        mainTitle="エラー・注意事項"
        errorItems={errorItems}
        warningItems={warningItems}
      />

      {/* FAQ */}
      <FaqCard title="よくある質問" faqs={faqs} />

      {/* サポート情報 */}
      <Support />
    </div>
  )
}