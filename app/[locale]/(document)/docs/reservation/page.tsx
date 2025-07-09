import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Clock, 
  Users, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  Info,
  Star,
  Phone,
  Mail,
  LineChart
} from 'lucide-react';

export default function ReservationManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-muted rounded-lg">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">予約管理機能</h1>
            <p className="text-muted-foreground text-sm md:text-base">予約の作成・管理・キャンセル機能の詳細操作方法</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">基本機能</Badge>
          <Badge variant="secondary">リアルタイム管理</Badge>
          <Badge variant="secondary">決済連携</Badge>
          <Badge variant="secondary">在庫管理</Badge>
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
            予約管理機能は、美容サロンにおける予約の作成・管理・キャンセルを効率的に行うための総合システムです。
            リアルタイムでの空き状況確認、自動在庫管理、決済連携など、予約に関わるあらゆる業務をサポートします。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">サロンスタッフ向け</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>全体の予約状況把握、売上管理</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>自分の予約確認、顧客対応</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>電話・対面での予約受付</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">お客様向け</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>予約内容、日時、担当スタッフの確認</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>期限内での予約キャンセル</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>過去の施術履歴、支払い履歴の確認</span>
                </li>
              </ul>
            </div>
          </div>

          <Alert>
            <Star className="h-4 w-4" />
            <AlertDescription>
              <strong>主要機能:</strong> タイムライン表示、リスト表示、決済連携、クーポン・ポイント適用、メール・LINE通知、在庫管理
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 画面構成 */}
      <Card>
        <CardHeader>
          <CardTitle>画面構成と導線</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">サロンスタッフ向け管理画面</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">予約タイムライン画面</p>
                    <p className="text-sm text-muted-foreground">/dashboard/reservation</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">新規予約作成画面</p>
                    <p className="text-sm text-muted-foreground">/dashboard/reservation/add</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">予約詳細画面</p>
                    <p className="text-sm text-muted-foreground">/dashboard/reservation/[予約ID]</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">お客様向け画面</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Mail className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">予約完了メール</p>
                    <p className="text-sm text-muted-foreground">確認リンク付き</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Phone className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">LINE通知</p>
                    <p className="text-sm text-muted-foreground">予約確認・リマインダー</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <LineChart className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">マイページ</p>
                    <p className="text-sm text-muted-foreground">予約履歴・詳細確認</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 新規予約作成手順 */}
      <Card>
        <CardHeader>
          <CardTitle>新規予約作成手順</CardTitle>
          <CardDescription>管理画面から予約を作成する詳細手順</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">予約作成画面を開く</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  サイドメニューの「予約」→「予約を追加」をクリック、またはタイムライン画面右上の「新規予約」ボタンをクリック
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">顧客情報の入力</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">既存顧客の場合</p>
                    <p className="text-sm text-muted-foreground">「既存のお客様」を選択し、顧客検索ボックスで名前や電話番号を入力</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">新規顧客の場合</p>
                    <p className="text-sm text-muted-foreground">「新規のお客様」を選択し、姓・名（必須）、電話番号（必須）を入力</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">予約日時の選択</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  カレンダーから予約日を選択、開始時間をプルダウンから選択（終了時間は選択メニューから自動計算）
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">スタッフ・メニューの選択</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  担当スタッフをプルダウンから選択（指名料がある場合は自動加算）、メニュー一覧から施術内容を選択
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">5</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">料金計算と支払い方法</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  クーポン・ポイントの適用、支払い方法（現金・クレジットカード）を選択
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">6</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">予約の確定</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  「予約を作成」ボタンをクリック、確認画面で内容を最終確認後「確定」をクリック
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>ヒント:</strong> 時間の重複チェックは自動で行われます。オプションの在庫は予約作成時点で即座に減算されます。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 予約表示と確認 */}
      <Card>
        <CardHeader>
          <CardTitle>予約の確認・表示方法</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">タイムライン表示</h4>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">横軸: 5:00〜翌5:00の時間軸（30分刻み）</p>
                <p className="text-sm text-muted-foreground">縦軸: スタッフ別の予約状況</p>
                <p className="text-sm text-muted-foreground">予約ブロックをクリックで詳細表示</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">ステータス表示</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-primary rounded-full" />
                  <span className="text-sm">予約受付済み（confirmed）</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-warning rounded-full" />
                  <span className="text-sm">保留中（pending）※決済待ち</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-destructive rounded-full" />
                  <span className="text-sm">キャンセル済み（cancelled）</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success rounded-full" />
                  <span className="text-sm">完了（completed）</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 予約キャンセル */}
      <Card>
        <CardHeader>
          <CardTitle>予約キャンセル手順</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">スタッフによるキャンセル</h4>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">1. 予約詳細画面を開く</p>
                <p className="text-sm text-muted-foreground">2. 「予約をキャンセル」ボタンをクリック</p>
                <p className="text-sm text-muted-foreground">3. キャンセル理由を入力</p>
                <p className="text-sm text-muted-foreground">4. 在庫・ポイントが自動復元</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">お客様によるキャンセル</h4>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">1. メール・LINEのリンクからアクセス</p>
                <p className="text-sm text-muted-foreground">2. キャンセル可能期限を確認</p>
                <p className="text-sm text-muted-foreground">3. 「予約をキャンセル」ボタンをクリック</p>
                <p className="text-sm text-muted-foreground">4. 確認画面で「キャンセルする」をクリック</p>
              </div>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>注意:</strong> キャンセル期限を過ぎるとお客様自身ではキャンセルできません。スタッフは期限に関係なくキャンセル可能です。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 決済処理 */}
      <Card>
        <CardHeader>
          <CardTitle>決済処理の流れ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-success/10 rounded-lg">
              <h4 className="font-semibold text-foreground mb-3 flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-success" />
                <span>現金決済</span>
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. 予約作成時に「現金」を選択</p>
                <p>2. 予約が即座に「確定」ステータスに</p>
                <p>3. 来店時に現金で支払い</p>
                <p>4. 30日後に自動的にポイント付与</p>
              </div>
            </div>
            <div className="p-4 bg-info/10 rounded-lg">
              <h4 className="font-semibold text-foreground mb-3 flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span>クレジットカード決済</span>
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. 予約作成時に「クレジットカード」を選択</p>
                <p>2. 予約が「保留」ステータスで作成</p>
                <p>3. お客様がStripe決済ページで支払い</p>
                <p>4. 決済成功後、自動的に「確定」ステータスに変更</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 利用シナリオ */}
      <Card>
        <CardHeader>
          <CardTitle>典型的な利用シナリオ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">シナリオA: 電話予約の受付</h4>
              <p className="text-sm text-muted-foreground mb-3">
                お客様から電話で予約依頼 → 空き状況確認 → 予約作成 → 確認メール送信
              </p>
              <div className="text-xs text-muted-foreground/80">
                タイムライン画面で空き時間を確認し、新規予約作成画面で顧客情報を入力。現金決済を選択して予約確定。
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">シナリオB: リピーター様の次回予約</h4>
              <p className="text-sm text-muted-foreground mb-3">
                施術終了後のお会計時 → 前回と同じメニューで予約 → ポイント使用の提案 → 予約カード発行
              </p>
              <div className="text-xs text-muted-foreground/80">
                カルテ画面から「次回予約を作成」をクリック。前回の内容が自動入力されるため、日時のみ変更して予約作成。
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">シナリオC: 団体予約の受付</h4>
              <p className="text-sm text-muted-foreground mb-3">
                複数名の同時予約 → 時間調整 → グループ割引適用 → 合計金額計算
              </p>
              <div className="text-xs text-muted-foreground/80">
                各人ごとに個別の予約を作成。開始時間をずらして効率的に配置し、クーポンを使用してグループ割引を適用。
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* エラー・注意事項 */}
      <Card>
        <CardHeader>
          <CardTitle>エラー・注意事項</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-3">よくあるエラーと対処法</h4>
              <div className="space-y-3">
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="font-medium text-destructive text-sm">「この時間帯の予約はすでにいっぱいです」</p>
                  <p className="text-destructive/90 text-xs mt-1">別の時間帯またはスタッフを選択してください</p>
                </div>
                <div className="p-3 bg-warning/10 rounded-lg">
                  <p className="font-medium text-warning text-sm">「在庫が不足しています」</p>
                  <p className="text-warning/90 text-xs mt-1">オプションの数量を減らすか、別のオプションを選択してください</p>
                </div>
                <div className="p-3 bg-info/10 rounded-lg">
                  <p className="font-medium text-info text-sm">「決済に失敗しました」</p>
                  <p className="text-info/90 text-xs mt-1">カード情報を確認し、再度決済を試みてください</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">操作時の注意点</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>営業時間外の予約は作成できません</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>オプション在庫は即座に減算されるため慎重に選択</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>クーポンとポイントの併用可否を確認</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>30分ごとの自動保存機能あり</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>よくある質問</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground">Q: 予約の変更はできますか？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: 現在のシステムでは予約の直接変更はできません。一度キャンセルして新規作成してください。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: 予約確認メールが届かない場合</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: 顧客情報のメールアドレスが正しいか確認してください。迷惑メールフォルダも確認を。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: ダブルブッキングを防ぐには？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: システムが自動的に重複チェックを行います。警告が出た場合は時間を調整してください。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: キャンセル料は取れますか？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: 現在のシステムではキャンセル料の自動徴収機能はありません。別途対応が必要です。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* サポート情報 */}
      <Card className="bg-link border-border">
        <CardHeader>
          <CardTitle className="text-link-foreground">サポート情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-link-foreground mb-2">技術サポート</h4>
              <p className="text-sm text-link-foreground">
                support@bocker.jp
              </p>
              <p className="text-xs text-link-foreground mt-1">営業時間: 平日 10:00-18:00</p>
            </div>
            <div>
              <h4 className="font-semibold text-link-foreground mb-2">ヘルプセンター</h4>
              <p className="text-sm text-link-foreground">
                https://help.bocker.jp
              </p>
              <p className="text-xs text-link-foreground mt-1">よくある質問も掲載</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}