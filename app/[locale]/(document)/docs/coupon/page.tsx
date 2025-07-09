import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Gift, 
  Plus, 
  Calendar, 
  Users, 
  Star,
  Info,
  CheckCircle,
  AlertTriangle,
  Edit3,
  TrendingUp,
  Eye
} from 'lucide-react';

export default function CouponManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-accent rounded-lg">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">クーポン管理機能</h1>
            <p className="text-muted-foreground">割引クーポンの作成・管理・マーケティング活用の詳細操作方法</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">プロモーション</Badge>
          <Badge variant="secondary">割引管理</Badge>
          <Badge variant="secondary">マーケティング</Badge>
          <Badge variant="secondary">顧客獲得</Badge>
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
            クーポン機能は、美容サロンがお客様に対して割引クーポンを発行・管理できる機能です。
            新規顧客の獲得やリピーター顧客の来店促進、特定メニューのプロモーションなど、様々なマーケティング施策に活用できます。
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
                  <span>新規顧客向けの初回割引クーポン発行</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>リピーター向けの特別割引クーポン</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>期間限定キャンペーンの実施</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>特定メニューのプロモーション</span>
                </li>
              </ul>
            </div>
          </div>

          <Alert>
            <Star className="h-4 w-4" />
            <AlertDescription>
              <strong>プラン別上限:</strong> LITEプラン: 最大5個 / PROプラン: 最大20個
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
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground mb-3">クーポン機能の画面一覧</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Gift className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">クーポン一覧画面</p>
                    <p className="text-sm text-muted-foreground">/dashboard/coupon</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Plus className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">クーポン作成画面</p>
                    <p className="text-sm text-muted-foreground">/dashboard/coupon/add</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Edit3 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">クーポン編集画面</p>
                    <p className="text-sm text-muted-foreground">/dashboard/coupon/[coupon_id]/edit</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg text-sm">
            <h4 className="font-semibold text-foreground mb-2">各画面への導線</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>ダッシュボード → サイドメニュー「クーポン」→ クーポン一覧画面</p>
              <p>クーポン一覧画面 → 「クーポンを追加」ボタン → クーポン作成画面</p>
              <p>クーポン一覧画面 → 各クーポンの「編集」ボタン → クーポン編集画面</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 新規作成手順 */}
      <Card>
        <CardHeader>
          <CardTitle>新規クーポン作成手順</CardTitle>
          <CardDescription>新しい割引クーポンを作成する詳細手順</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">クーポン作成画面を開く</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  サイドメニューの「クーポン」→「クーポンを追加」ボタンをクリック
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">基本情報の入力</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">クーポン名（必須）</p>
                    <p className="text-sm text-muted-foreground">例：「新規顧客限定20%OFF」</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">クーポンコード（必須、最大12文字）</p>
                    <p className="text-sm text-muted-foreground">例：「NEWUSER20」「SUMMER2025」</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">割引タイプ</p>
                    <p className="text-sm text-muted-foreground">パーセント割引（1〜100%）/ 固定額割引（¥1〜¥99,999）</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">対象顧客の選択</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>全ての顧客</span>
                    </p>
                    <p className="text-sm text-muted-foreground">誰でも使用可能</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">初回利用のみ</p>
                    <p className="text-sm text-muted-foreground">初めて来店するお客様限定</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">リピーター限定</p>
                    <p className="text-sm text-muted-foreground">2回目以降の来店客限定</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">期間と利用条件の設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>有効期限</span>
                    </p>
                    <p className="text-sm text-muted-foreground">開始日・終了日を設定（必ず未来の日付を選択）</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">最大利用回数（0〜99,999回）</p>
                    <p className="text-sm text-muted-foreground">0に設定すると無制限に使用可能</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">5</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">メニューとステータスの設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">有効/無効</p>
                    <p className="text-sm text-muted-foreground">「有効」にすると即座に使用可能</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">除外メニュー（任意）</p>
                    <p className="text-sm text-muted-foreground">クーポンを適用したくないメニューを選択</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">6</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">「作成」ボタンをクリックして完了</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  作成したクーポンが一覧画面に表示されます
                </p>
              </div>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>重要:</strong> 一度作成したクーポンコードは変更しないことを推奨します。お客様への混乱を避けるためです。
            </AlertDescription>
          </Alert>
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
              <h4 className="font-semibold text-foreground mb-2">シナリオA: 新規顧客向け初回割引クーポン</h4>
              <p className="text-sm text-muted-foreground mb-3">
                「初回限定30%OFF」クーポンを作成 → コード「FIRST30」で設定 → 対象顧客を「初回利用のみ」に設定 → ホームページやSNSで告知
              </p>
              <div className="text-xs text-muted-foreground/80">
                パーセント割引30%、最大利用回数は無制限に設定。新規顧客獲得の施策として活用し、予約時にクーポンコードを入力してもらう。
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">シナリオB: 期間限定サマーキャンペーン</h4>
              <p className="text-sm text-muted-foreground mb-3">
                「夏季限定¥1,000OFF」クーポンを作成 → コード「SUMMER1000」で設定 → 有効期限7月1日〜8月31日 → 最大利用回数200回
              </p>
              <div className="text-xs text-muted-foreground/80">
                固定額割引¥1,000で設定し、高額メニューや新メニューを除外リストに追加。利用回数を定期的にチェックし、上限に達したら自動的に使用不可に。
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">シナリオC: リピーター向け特別クーポン</h4>
              <p className="text-sm text-muted-foreground mb-3">
                「いつもありがとう20%OFF」クーポンを作成 → コード「THANKS20」で設定 → 対象顧客を「リピーター限定」に設定 → 来店回数の多いお客様にLINEで個別配信
              </p>
              <div className="text-xs text-muted-foreground/80">
                パーセント割引20%で設定し、リピーター限定で配布。利用状況を確認してリピート率向上の効果を測定。
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
                  <p className="font-medium text-destructive text-sm">「クーポンコードが既に存在します」</p>
                  <p className="text-destructive/90 text-xs mt-1">別のクーポンコードを使用してください</p>
                </div>
                <div className="p-3 bg-warning/10 rounded-lg">
                  <p className="font-medium text-warning text-sm">「プランの上限に達しました」</p>
                  <p className="text-warning/90 text-xs mt-1">不要なクーポンを削除するか、プランをアップグレードしてください</p>
                </div>
                <div className="p-3 bg-info/10 rounded-lg">
                  <p className="font-medium text-info text-sm">「終了日は開始日より後の日付を選択してください」</p>
                  <p className="text-info/90 text-xs mt-1">終了日を開始日より後の日付に設定してください</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">操作時の注意点</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>一度お客様に配布したコードは変更しない</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>分かりやすく覚えやすいコードを設定する</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>パーセント割引と固定額割引を間違えないよう注意</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>新メニューや高額メニューは除外設定を忘れずに</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 削除・無効化 */}
      <Card>
        <CardHeader>
          <CardTitle>クーポンの削除・無効化方法</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">クーポンの削除</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. 一覧画面で「削除」ボタンをクリック</p>
                <p>2. 確認ダイアログで「削除」をクリック</p>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>注意:</strong> 削除すると復元できません。利用履歴も失われます。
                  </AlertDescription>
                </Alert>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">クーポンの無効化（推奨）</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. 編集画面で「有効」のチェックを外す</p>
                <p>2. 「更新」ボタンをクリック</p>
                <p>3. 無効化されたクーポンは使用できなくなります</p>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    データは保持され、再度有効化可能です
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* よくある質問 */}
      <Card>
        <CardHeader>
          <CardTitle>よくある質問</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground">Q: クーポンを一時的に使用停止したい</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: 編集画面で「有効」のチェックを外して更新してください。削除せずにデータを保持できます。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: 同じお客様が何度も使えるクーポンを作りたい</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: 「対象顧客」を「全ての顧客」に設定し、「最大利用回数」を大きな数値または0（無制限）に設定してください。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: クーポンの利用履歴を確認したい</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: 現在のバージョンでは、各クーポンの総利用回数のみ確認可能です。詳細な利用履歴機能は今後のアップデートで追加予定です。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: クーポンをLINEで配信したい</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: クーポンコードをコピーして、LINE配信機能でメッセージに含めて送信してください。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 補足情報 */}
      <Card>
        <CardHeader>
          <CardTitle>補足情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-accent-2-foreground rounded-lg">
              <h4 className="font-semibold text-accent-2 mb-2 flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>プレビュー機能</span>
              </h4>
              <p className="text-sm text-accent-2">
                作成・編集画面では、右側にリアルタイムプレビューが表示されます。
                設定内容がどのように表示されるか確認しながら作成できます。
              </p>
            </div>
            <div className="p-4 bg-accent-2-foreground rounded-lg">
              <h4 className="font-semibold text-accent-2 mb-2 flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>今後の機能追加予定</span>
              </h4>
              <p className="text-sm text-accent-2">
                クーポンの複製機能、QRコード生成、詳細な利用統計・分析機能、
                メール・LINE自動配信連携などを予定しています。
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
              <h4 className="font-semibold text-link-foreground mb-2">データ保存について</h4>
              <p className="text-sm text-link-foreground">
                作成・更新ボタンを押すまでデータは保存されません
              </p>
              <p className="text-xs text-link-foreground mt-1">重要な設定は必ず保存を確認してください</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}