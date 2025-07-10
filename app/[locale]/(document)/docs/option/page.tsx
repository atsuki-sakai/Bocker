import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ShoppingCart,
  Plus,
  Package,
  DollarSign,
  Clock,
  Image as ImageIcon,
  Star,
  Info,
  AlertTriangle,
  Tag,
  Edit3,
  TrendingUp,
} from 'lucide-react'
import {
  Support,
  FaqCard,
  ErrorWarningInfoCard,
  ScenarioCard,
} from '@/app/[locale]/(document)/_components'

export default function OptionManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-muted rounded-lg">
            <ShoppingCart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">オプション管理機能</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              追加サービス・物販商品の管理・在庫管理の詳細操作方法
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>在庫管理</Badge>
          <Badge>物販商品</Badge>
          <Badge>追加サービス</Badge>
          <Badge>プロモーション</Badge>
        </div>
      </div>

      {/* 機能概要 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-primary" />
            <span>機能概要</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground/90">
            オプション機能は、美容サロンがメインメニューに追加できる「オプションサービス」や「物販商品」を管理する機能です。
            施術時間を設定することで追加施術サービスとして、施術時間を0分に設定すると物販商品として利用できる柔軟な機能です。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">対象ユーザー</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>サロンオーナー、店長、マネージャー</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">主な用途</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>物販商品の管理（シャンプー、トリートメント、スタイリング剤など）</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>追加施術サービスの管理（ヘッドスパ、トリートメント、眉カットなど）</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>在庫管理による売上機会の最大化</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>セール価格設定によるプロモーション施策</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4 text-white">
            <Star className="h-4 w-4 text-link-foreground" />
            <p className="text-link-foreground text-xs md:text-sm">
              プラン別上限: LITEプラン: 最大5個 / PROプラン: 最大10個
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 画面構成 */}
      <Card>
        <CardHeader>
          <CardTitle>画面構成と導線</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground mb-3">オプション機能の画面一覧</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">オプション一覧画面</p>
                    <p className="text-xs text-link-foreground">/dashboard/option</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Plus className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">オプション追加画面</p>
                    <p className="text-xs text-link-foreground">/dashboard/option/add</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Edit3 className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">オプション編集画面</p>
                    <p className="text-xs text-link-foreground">
                      /dashboard/option/[option_id]/edit
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4 text-white">
            <Star className="h-4 w-4 text-link-foreground" />
            <p className="text-link-foreground text-xs md:text-sm">
              導線: ダッシュボード → サイドメニュー「オプション」→ オプション一覧画面 →
              「オプションを作成」ボタン → オプション追加画面
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 新規作成手順 */}
      <Card>
        <CardHeader>
          <CardTitle>新規オプション作成手順</CardTitle>
          <CardDescription>新しいオプションサービス・物販商品を作成する詳細手順</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">オプション追加画面を開く</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  サイドメニューの「オプション」→「オプションを作成」ボタンをクリック
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">画像のアップロード（任意）</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <span>推奨サイズ：正方形（1:1）の画像</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      対応形式：JPEG、PNG、WebP（自動圧縮・最適化）
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
                <h4 className="font-semibold text-foreground">基本情報の入力</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-xs md:text-sm text-link-foreground">
                      オプションメニュー名（必須）
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      例：「ヘッドスパ15分」「シャンプー（500ml）」
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-xs md:text-sm text-link-foreground">
                      最大注文数（必須、デフォルト：1）
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      1回の予約で選択できる最大数
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-xs md:text-sm flex items-center space-x-2 text-link-foreground">
                      <Package className="h-4 w-4 text-link-foreground" />
                      <span>在庫数（必須、デフォルト：1）</span>
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      物販：実際の在庫数 / 施術サービス：999などの大きな数値
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
                <h4 className="font-semibold text-foreground">価格設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span>通常価格（必須）</span>
                    </p>
                    <p className="text-sm text-muted-foreground">例：3000円</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">セール価格（任意）</p>
                    <p className="text-sm text-muted-foreground">
                      通常価格より低い金額を設定（空欄可）
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
                <h4 className="font-semibold text-foreground">施術時間の設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>スタッフが稼働する施術時間（必須）</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      物販：0分 / 施術サービス：5分刻みで最大360分
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                6
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">タグ設定・説明文・公開設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <span>タグ（任意、最大5つ）</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      例：「人気」「期間限定」「新商品」
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">説明文（必須、最大1000文字）</p>
                    <p className="text-sm text-muted-foreground">効果や特徴、使用方法などを記載</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">公開設定</p>
                    <p className="text-sm text-muted-foreground">
                      ON: 予約画面に表示 / OFF: 非表示
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                7
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">
                  「オプションを追加」ボタンをクリックして完了
                </h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  入力した情報が保存され、オプション一覧画面に戻ります
                </p>
              </div>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>重要:</strong>{' '}
              在庫が0になると自動的に選択不可になります。物販商品は実際の在庫数を正確に設定してください。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 在庫管理 */}
      <Card>
        <CardHeader>
          <CardTitle>在庫管理のポイント</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">在庫数の確認</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• 一覧画面で現在の在庫数が表示されます</p>
                <p>• 在庫が少なくなったら早めに補充・更新</p>
                <p>• 定期的に在庫状況をチェックしましょう</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">在庫切れの対応</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• 在庫が0になると自動的に選択不可に</p>
                <p>• 予約時に在庫が自動的に減少</p>
                <p>• キャンセル時は在庫が自動的に復元</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-warning/10 rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">在庫管理のベストプラクティス</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 物販商品：実際の在庫数を正確に設定</li>
              <li>• 施術サービス：999などの大きな数値を設定</li>
              <li>• 在庫が5個以下になったら早めに補充を検討</li>
              <li>• 季節商品は適切なタイミングで在庫調整</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <ScenarioCard
        scenarioItems={[
          {
            title: 'シナリオA: 物販商品（シャンプー）の登録',
            description:
              '商品画像をアップロード → 「オーガニックシャンプー 500ml」として登録 → 在庫数20個、価格3500円、セール価格3000円設定 → 施術時間0分で物販として登録',
            helpText:
              '最大注文数3で1人3本まで購入可能に設定。タグに「人気」「オーガニック」を追加。商品の特徴や成分を説明文に詳しく記載。',
          },
          {
            title: 'シナリオB: 施術サービス（ヘッドスパ）の登録',
            description:
              'サービス画像をアップロード → 「極上ヘッドスパ」として登録 → 在庫数999個、価格4000円設定 → 施術時間30分で追加サービスとして登録',
            helpText:
              '最大注文数1で1回の予約で1つまで。タグに「リラクゼーション」「人気」を追加。施術内容や効果を説明文に詳しく記載。',
          },
          {
            title: 'シナリオC: 期間限定キャンペーンの設定',
            description:
              '既存オプションを編集 → セール価格を設定 → タグに「期間限定」を追加 → 説明文にキャンペーン期間を追記',
            helpText:
              '通常価格より低いセール価格を設定し、キャンペーン感を演出。期間終了後はセール価格を削除して通常価格に戻す。',
          },
        ]}
      />

      <ErrorWarningInfoCard
        errorItems={[
          {
            title: '「セール価格は通常価格より低く設定してください」',
            description: 'セール価格を通常価格より低い金額に変更するか、セール価格を空欄に',
          },
          {
            title: '「在庫が不足しています」',
            description: '在庫数を確認し、必要に応じて更新してください',
          },
          {
            title: '「画像のアップロードに失敗しました」',
            description: '画像を圧縮してから再度アップロード、またはネットワーク接続を確認',
          },
        ]}
        warningItems={[
          {
            title: '物販商品は定期的に在庫数を更新しましょう',
          },
          {
            title: '施術時間の設定ミスは予約システムに影響します',
          },
          {
            title: '価格設定は保存前に必ず再確認',
          },
          {
            title: '高品質な画像で商品・サービスの魅力を伝えましょう',
          },
        ]}
      />

      <FaqCard
        title="よくある質問"
        faqs={[
          {
            question: '在庫が0になったらどうなりますか？',
            answer:
              '自動的にお客様の予約画面で選択不可になります。在庫を追加すると再び選択可能になります。',
          },
          {
            question: '施術時間を後から変更できますか？',
            answer: 'はい、編集画面から変更可能です。ただし、既存の予約には影響しません。',
          },
          {
            question: '削除したオプションを復元できますか？',
            answer:
              'いいえ、一度削除したオプションは復元できません。削除前に十分確認してください。',
          },
          {
            question: '物販と施術サービスを見分ける方法は？',
            answer:
              '一覧画面の「トータル施術時間」欄を確認してください。0分なら物販、それ以外は施術サービスです。',
          },
        ]}
      />

      {/* 活用のヒント */}
      <Card>
        <CardHeader>
          <CardTitle>活用のヒント</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-accent-2-foreground rounded-lg">
              <h4 className="font-semibold text-accent-2 mb-2 flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>季節商品の活用</span>
              </h4>
              <p className="text-sm text-accent-2">
                夏は日焼け止め、冬は保湿クリームなど季節に応じた商品を登録。
                タグに「季節限定」を付けて訴求力アップ。
              </p>
            </div>
            <div className="p-4 bg-accent-2-foreground rounded-lg">
              <h4 className="font-semibold text-accent-2 mb-2">セット販売の工夫</h4>
              <p className="text-sm text-accent-2">
                「シャンプー＆トリートメントセット」のようなセット商品も登録可能。
                お得感を演出してアップセルにつなげましょう。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Support />
    </div>
  )
}