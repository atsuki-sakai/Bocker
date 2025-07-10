import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Store,
  Clock,
  Calendar,
  CreditCard,
  Info,
  AlertTriangle,
  Image as ImageIcon,
  Phone,
  MapPin,
  Mail,
  Webhook,
  Shield,
  DollarSign,
  Building,
} from 'lucide-react'
import {
  Support,
  FaqCard,
  ErrorWarningInfoCard,
  ScenarioCard,
} from '@/app/[locale]/(document)/_components'

export default function SettingManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-muted rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">店舗設定機能</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              店舗基本情報・営業時間・予約ルール・決済設定の詳細操作方法
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>店舗情報</Badge>
          <Badge>営業時間</Badge>
          <Badge>LINE連携</Badge>
          <Badge>Stripe決済</Badge>
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
          <p className="text-muted-foreground">
            店舗の基本設定機能は、Bocker（ブッカー）でサロン運営に必要な基本情報、営業時間、予約ルール、LINE連携、決済設定などを一元管理するための中核機能です。
            この設定が適切に行われることで、お客様への適切な予約サービスの提供が可能になります。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">対象ユーザー</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>サロンオーナー、店舗管理者</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">主な用途</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>店舗の基本情報（名称、住所、連絡先）の登録・更新</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>営業時間と定休日の設定</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>予約受付ルールの設定</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>LINE公式アカウントとの連携・Stripe決済の設定</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 設定タブ構成 */}
      <Card>
        <CardHeader>
          <CardTitle>設定タブ構成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground mb-3">6つのタブで構成されています</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Store className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">基本設定タブ</p>
                    <p className="text-xs text-link-foreground">店舗の基本情報</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Webhook className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">API設定タブ</p>
                    <p className="text-xs text-link-foreground">LINE連携の設定</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Settings className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">予約設定タブ</p>
                    <p className="text-xs text-link-foreground">予約受付ルール</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Clock className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">営業時間タブ</p>
                    <p className="text-xs text-link-foreground">曜日別営業時間</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Calendar className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">休業日設定タブ</p>
                    <p className="text-xs text-link-foreground">特別な休業日</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <CreditCard className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">決済設定タブ</p>
                    <p className="text-xs text-link-foreground">Stripe決済連携</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4 text-white">
            <Info className="h-4 w-4 text-link-foreground" />
            <p className="text-link-foreground text-xs md:text-sm">
              アクセス方法: ダッシュボードのサイドメニュー → 「設定」をクリック →
              各タブで設定切り替え
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 基本設定 */}
      <Card>
        <CardHeader>
          <CardTitle>基本設定</CardTitle>
          <CardDescription>店舗の基本情報・画像・説明文を設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">店舗基本情報の入力</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">サロン名（最大120文字）</p>
                    <p className="text-sm text-muted-foreground">店舗の正式名称を入力</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <span>メールアドレス（任意）</span>
                    </p>
                    <p className="text-sm text-muted-foreground">店舗の連絡用メールアドレス</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>電話番号（8〜11桁）</span>
                    </p>
                    <p className="text-sm text-muted-foreground">ハイフンなしの数字で入力</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>郵便番号・住所</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      7桁の数字を入力すると住所が自動入力
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
                <h4 className="font-semibold text-foreground">店舗画像の設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <span>画像アップロード</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ドラッグ&ドロップまたはファイル選択で画像を設定
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">推奨設定</p>
                    <p className="text-sm text-muted-foreground">
                      横長（16:9）の画像、最大5MB、JPG/PNG形式
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
                <h4 className="font-semibold text-foreground">店舗説明・予約ルールの設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">店舗説明（最大2000文字）</p>
                    <p className="text-sm text-muted-foreground">お客様に向けた店舗の紹介文</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">予約ルール（最大2000文字）</p>
                    <p className="text-sm text-muted-foreground">
                      キャンセルポリシーなどの注意事項
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>注意:</strong>{' '}
              変更内容は保存するまで反映されません。他のタブに移動すると変更が失われます。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* LINE連携設定 */}
      <Card>
        <CardHeader>
          <CardTitle>LINE連携設定（API設定）</CardTitle>
          <CardDescription>
            LINE公式アカウントとの連携で顧客とのコミュニケーションを強化
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">LINE公式アカウントの作成</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">LINE公式アカウントマネージャー</p>
                    <p className="text-sm text-muted-foreground">
                      manager.line.biz にアクセスして新規作成
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">必要なチャンネル</p>
                    <p className="text-sm text-muted-foreground">
                      1. Messaging API（メッセージ送信用）
                      <br />
                      2. LINEログイン（顧客ログイン用）
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">Messaging APIチャンネルの作成</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">LINE Developers コンソール</p>
                    <p className="text-sm text-muted-foreground">
                      developers.line.biz/console にアクセス
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">チャンネル作成</p>
                    <p className="text-sm text-muted-foreground">
                      「チャンネルを作成」→「Messaging API」を選択
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">LINEログインチャンネルの作成</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">アプリタイプ</p>
                    <p className="text-sm text-muted-foreground">「ウェブアプリ」を選択</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">LIFF設定</p>
                    <p className="text-sm text-muted-foreground">
                      作成後、「LIFF」タブからLIFFアプリを追加
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">Bockerへの設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">必要な情報</p>
                    <div className="text-sm text-muted-foreground mt-1">
                      <p>• LINEアクセストークン（Messaging API）</p>
                      <p>• LINEチャンネルシークレット（Messaging API）</p>
                      <p>• LIFF ID（LINEログイン）</p>
                      <p>• LINEチャンネルID（LINEログイン）</p>
                      <p>• LineユーザーID（予約通知用）</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-warning/10 rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">有料サポートサービス</h4>
            <p className="text-sm text-muted-foreground">
              LINE設定が難しい場合、5,000円（税込）で完全サポートサービスを提供しています。
              API設定画面内のアコーディオンをご確認ください。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 予約設定 */}
      <Card>
        <CardHeader>
          <CardTitle>予約設定</CardTitle>
          <CardDescription>予約受付ルールと制限の設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">予約受付最大日数</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  今日を含めて何日先まで予約可能にするか（7〜90日）
                </p>
                <p className="text-xs text-muted-foreground">
                  推奨: 30日（繁忙期は60〜90日に延長）
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">キャンセル可能日数</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  予約日の何日前までキャンセル可能か（0〜14日）
                </p>
                <p className="text-xs text-muted-foreground">
                  推奨: 3日（期日を過ぎるとシステムでのキャンセル不可）
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">予約間隔</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  予約枠の時間間隔（15/30/60/90/120分）
                </p>
                <p className="text-xs text-muted-foreground">
                  推奨: 60分（施術時間と予約間隔の大きい方が適用）
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">予約可能席数</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  同時間帯の最大予約数（1〜20席）
                </p>
                <p className="text-xs text-muted-foreground">実際の席数に合わせて設定</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">最短の予約開始時間</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  当日予約で現在時刻から何分後以降を受付するか
                </p>
                <p className="text-xs text-muted-foreground">推奨: 30分</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4 text-white">
            <Info className="h-4 w-4 text-link-foreground" />
            <p className="text-link-foreground text-xs md:text-sm">
              予約設定の変更は新規予約から適用されます。既存の予約には影響しません。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 営業時間・休業日設定 */}
      <Card>
        <CardHeader>
          <CardTitle>営業時間・休業日設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">営業時間の設定</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. 各曜日をクリックして営業日/定休日を切り替え</p>
                <p>2. 共通設定または曜日別設定を選択</p>
                <p>3. 開始時間・終了時間を設定</p>
                <p>4. 「営業時間を保存」ボタンをクリック</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">休業日の設定</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. カレンダーから休業日にしたい日付をクリック</p>
                <p>2. 複数日選択可能（最大30日）</p>
                <p>3. 選択済みの日付を再度クリックで解除</p>
                <p>4. 「保存」ボタンをクリック</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">設定変更の推奨タイミング</h4>
            <div className="text-sm text-muted-foreground">
              <p>• 営業時間の変更：営業終了後</p>
              <p>• 予約設定の変更：予約の少ない時間帯</p>
              <p>• 休業日の設定：少なくとも1週間前</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stripe決済設定 */}
      <Card>
        <CardHeader>
          <CardTitle>Stripe決済設定</CardTitle>
          <CardDescription>クレジットカード決済の連携設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">初回連携</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  「Stripeと連携する」ボタンをクリックして、Stripeのオンボーディング画面へ遷移
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">必要情報の入力</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <Building className="h-4 w-4 text-primary" />
                      <span>ビジネス情報</span>
                    </p>
                    <p className="text-sm text-muted-foreground">店舗名、所在地、業種</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span>運営責任者情報</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      本人確認書類（鮮明な画像を用意）
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span>振込先銀行口座情報</span>
                    </p>
                    <p className="text-sm text-muted-foreground">売上金の振込先口座</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">審査と有効化</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  情報送信後、Stripeの審査（通常数分〜数時間）を経て、承認後に自動的にカード決済が利用可能になります
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-success/10 rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">決済手数料</h4>
            <p className="text-sm text-muted-foreground">
              <strong>売上の4% + 40円/件</strong>（振込手数料と月額固定費は無料）
            </p>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>注意:</strong>{' '}
              一度連携すると解除には別途手続きが必要です。本人確認書類は鮮明な画像を用意してください。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <ScenarioCard
        scenarioItems={[
          {
            title: 'シナリオA: 新規開業時の初期設定',
            description:
              '基本設定で店舗情報を入力 → 営業時間の設定 → 予約ルールの設定 → LINE連携（任意） → Stripe決済設定',
            helpText:
              '開業前にすべての設定を完了させることで、スムーズな運営開始が可能になります。',
          },
          {
            title: 'シナリオB: 年末年始の特別営業設定',
            description:
              '休業日設定タブを開く → カレンダーから12/31〜1/3を選択 → 保存ボタンをクリック → 必要に応じて営業時間も調整',
            helpText: '特別営業期間の設定により、お客様への適切な予約案内が可能になります。',
          },
          {
            title: 'シナリオC: LINE連携の追加設定',
            description:
              'LINE公式アカウントを作成 → 必要なチャンネルを作成 → API設定タブで各種IDとトークンを入力 → 保存して連携完了',
            helpText: 'LINE連携により、予約確認やリマインドメッセージの自動送信が可能になります。',
          },
        ]}
      />

      <FaqCard
        title="よくある質問"
        faqs={[
          {
            question: '郵便番号を入力しても住所が自動入力されません',
            answer: 'ハイフンを除いた7桁の数字で入力してください。例：1234567',
          },
          {
            question: '営業時間を変更したのに予約画面に反映されません',
            answer: 'ブラウザのキャッシュをクリアするか、プライベートモードで確認してください。',
          },
          {
            question: 'LINE連携がうまくいきません',
            answer:
              'Messaging APIとLINEログインの両方のチャンネルが作成済みか、各IDやトークンが正しくコピーされているか確認してください。',
          },
          {
            question: 'Stripeの審査にどのくらい時間がかかりますか？',
            answer:
              '通常は数分〜数時間で完了しますが、追加書類が必要な場合は数日かかることがあります。',
          },
        ]}
      />

      <ErrorWarningInfoCard
        errorItems={[
          {
            title: '「最大文字数を超えています」',
            description: '入力文字数を制限内に収めてください',
          },
          {
            title: '「画像のアップロードに失敗しました」',
            description: '画像サイズを5MB以下にし、JPG/PNG形式を使用してください',
          },
          {
            title: '「認証に失敗しました」',
            description: '各種トークン・IDが正しくコピーされているか確認してください',
          },
        ]}
        warningItems={[
          {
            title: '変更内容は保存するまで反映されません',
          },
          {
            title: '他のタブに移動すると変更が失われます',
          },
          {
            title: '営業時間変更は既存予約に影響しません',
          },
          {
            title: 'LINE連携は順序（Messaging API → LINEログイン）が重要',
          },
        ]}
      />

      <Support />
    </div>
  )
}