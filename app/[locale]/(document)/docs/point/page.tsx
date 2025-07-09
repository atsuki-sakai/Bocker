import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Ticket, 
  Settings, 
  Users, 
  Calendar, 
  Percent, 
  Star,
  Info,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react';

export default function PointManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-accent rounded-lg">
            <Ticket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">ポイント機能</h1>
            <p className="text-muted-foreground text-sm md:text-base">リピート促進のためのポイント付与・利用システムの詳細操作方法</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">リピート促進</Badge>
          <Badge variant="secondary">自動付与</Badge>
          <Badge variant="secondary">顧客満足度</Badge>
          <Badge variant="secondary">割引制度</Badge>
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
            ポイント機能は、美容サロンの顧客に対して、施術利用金額に応じてポイントを自動付与し、
            次回以降の施術で「1ポイント = 1円」として利用できるリピート促進システムです。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">対象ユーザー</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>サロンオーナー：ポイント付与率・有効期限の設定</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>サロンスタッフ：予約受付時のポイント利用処理</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>顧客：予約時のポイント使用で割引</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">主な特徴</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>施術完了の30日後に自動でポイント付与</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>有効期限の自動管理（1年/2年/3年）</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>ポイント使用・付与の履歴管理</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>予約キャンセル時の自動返還機能</span>
                </li>
              </ul>
            </div>
          </div>

          <Alert>
            <Star className="h-4 w-4" />
            <AlertDescription>
              <strong>1ポイント = 1円:</strong> 施術料金の支払いに直接利用可能な実用的なポイントシステム
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
            <h4 className="font-semibold text-foreground mb-3">ポイント機能の画面一覧</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Settings className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">ポイント設定画面（オーナー専用）</p>
                    <p className="text-sm text-muted-foreground">/dashboard/point</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">予約作成画面（スタッフ用）</p>
                    <p className="text-sm text-muted-foreground">支払い方法選択でポイント使用</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Ticket className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">顧客マイページ（顧客用）</p>
                    <p className="text-sm text-muted-foreground">/customer/[org_id]/[uid]/point</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-accent rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">各画面へのアクセス方法</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>オーナー:</strong> ダッシュボード → サイドバー「ポイント設定」</p>
              <p><strong>スタッフ:</strong> ダッシュボード → 「予約作成」→「支払い方法選択」</p>
              <p><strong>顧客:</strong> 顧客専用URL → ログイン → 「ポイント」</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 初期設定手順 */}
      <Card>
        <CardHeader>
          <CardTitle>ポイント機能の初期設定</CardTitle>
          <CardDescription>オーナー向け：ポイントシステムの基本設定手順</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">ポイント設定画面へアクセス</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  ダッシュボード → 左側のサイドバー「ポイント設定」をクリック
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">ポイント機能の有効化</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">機能の有効化</p>
                    <p className="text-sm text-muted-foreground">
                      「ポイント機能は無効」の表示がある場合、スイッチをONにする
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">確認</p>
                    <p className="text-sm text-muted-foreground">
                      「ポイント機能は有効」と緑色で表示されることを確認
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">ポイント付与タイプの選択</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <Percent className="h-4 w-4 text-primary" />
                      <span>率指定タイプ（推奨）</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      利用金額の○％をポイント付与（例：5%設定で10,000円の施術→500ポイント）
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span>固定ポイントタイプ</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      金額に関わらず一律のポイント付与（例：100ポイント固定）
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">付与率・有効期限の設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">付与率/固定ポイントの設定</p>
                    <p className="text-sm text-muted-foreground">
                      率指定：0〜100%（推奨：3〜10%）/ 固定：1〜99,999ポイント
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>ポイント有効期限</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      1年、2年、3年から選択可能（デフォルト：1年）
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">5</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">設定内容の確認と保存</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">設定概要の確認</p>
                    <p className="text-sm text-muted-foreground">
                      右側の「ポイント設定概要」で設定内容を確認
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">サンプル計算</p>
                    <p className="text-sm text-muted-foreground">
                      1,000円、5,000円の決済時のポイント付与例が表示される
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">6</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">「設定を保存」ボタンをクリックして完了</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  設定が保存され、ポイント機能が有効になります
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ポイント使用手順 */}
      <Card>
        <CardHeader>
          <CardTitle>予約時のポイント使用手順</CardTitle>
          <CardDescription>スタッフ向け：予約作成時のポイント利用処理</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">通常通り予約作成を進める</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  顧客選択 → メニュー選択 → スタッフ選択 → 日時選択
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">支払い方法選択画面でポイント使用</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">保有ポイント確認</p>
                    <p className="text-sm text-muted-foreground">顧客の保有ポイントが自動表示される</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">使用ポイント設定</p>
                    <p className="text-sm text-muted-foreground">
                      スライダーを動かすか、直接数値を入力
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">最大使用可能ポイント</p>
                    <p className="text-sm text-muted-foreground">
                      「合計金額」または「保有ポイント」の小さい方まで
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">予約確定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">支払い金額確認</p>
                    <p className="text-sm text-muted-foreground">ポイント使用後の支払い金額を確認</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">即座にポイント減算</p>
                    <p className="text-sm text-muted-foreground">
                      予約確定と同時にポイントが顧客の残高から引かれる
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ポイント付与の流れ */}
      <Card>
        <CardHeader>
          <CardTitle>ポイント付与の流れ（自動処理）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">付与タイミング</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>予約日時（施術完了）から30日後に自動付与</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>バッチ処理により毎時間チェック</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">付与条件</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>予約ステータスが「完了」であること</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>ポイント機能が有効であること</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>付与予定日時を過ぎていること</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-warning/10 rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">ポイントの二重付与防止</h4>
            <p className="text-sm text-muted-foreground">
              ポイントを使用した金額部分には新たなポイントは付与されません。
              例：10,000円の施術で2,000ポイント使用 → 8,000円分のみポイント付与対象
            </p>
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
              <h4 className="font-semibold text-foreground mb-2">シナリオA: 新規顧客の初回来店からポイント付与まで</h4>
              <p className="text-sm text-muted-foreground mb-3">
                4月15日初回来店（カット+カラー 10,000円）→ 5%付与で500ポイント付与予定 → 5月15日自動付与 → 2回目来店時に500ポイント使用
              </p>
              <div className="text-xs text-muted-foreground/80">
                施術完了から30日後の自動バッチ処理で500ポイント付与。顧客にLINE/メール通知。次回来店時に保有ポイント500ポイントを確認し、施術料金から差し引き。
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">シナリオB: 常連顧客のポイント活用パターン</h4>
              <p className="text-sm text-muted-foreground mb-3">
                毎月5,000円の施術 → 5%付与で月250ポイント獲得 → 年間3,000ポイント蓄積 → 特別な施術時（15,000円）で3,000ポイント使用
              </p>
              <div className="text-xs text-muted-foreground/80">
                定期来店による安定したポイント蓄積。パーマ+トリートメント15,000円の施術で蓄積した3,000ポイントを使用し、実質12,000円で施術。
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
                  <p className="font-medium text-destructive text-sm">「ポイント設定が見つかりません」</p>
                  <p className="text-destructive/90 text-xs mt-1">オーナー権限でポイント設定画面から初期設定を行ってください</p>
                </div>
                <div className="p-3 bg-warning/10 rounded-lg">
                  <p className="font-medium text-warning text-sm">「ポイントが不足しています」</p>
                  <p className="text-warning/90 text-xs mt-1">使用ポイント数を保有ポイント以下に調整してください</p>
                </div>
                <div className="p-3 bg-info/10 rounded-lg">
                  <p className="font-medium text-info text-sm">「ポイント処理でエラーが発生しました」</p>
                  <p className="text-info/90 text-xs mt-1">予約は正常に作成されるため、後日手動でポイント調整を行ってください</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">操作時の注意点</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>ポイント付与率の変更は即座に反映されるが、既存の付与予定ポイントには影響しない</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>有効期限は最後の利用日から起算される</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>設定変更は必ず「設定を保存」ボタンをクリック</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>期限切れポイントは自動的に失効する</span>
                </div>
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
              <h4 className="font-semibold text-foreground">Q: ポイントはいつ付与されますか？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: 施術完了から30日後に自動的に付与されます。これは顧客の満足度確認期間として設定されています。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: ポイントの有効期限はどう計算されますか？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: 最後にサロンを利用した日から、設定した期間（1年/2年/3年）後に失効します。新たに来店すると、全ポイントの有効期限が延長されます。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: 他店舗でポイントは使えますか？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: いいえ、ポイントは付与された店舗でのみ使用可能です。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: 付与率を途中で変更したらどうなりますか？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: 新規予約から新しい付与率が適用されます。既存の付与予定ポイントは変更されません。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* キャンセル時の処理 */}
      <Card>
        <CardHeader>
          <CardTitle>予約キャンセル時の処理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">顧客都合のキャンセル</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-success" />
                  <span>使用済みポイントは自動的に返還</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-success" />
                  <span>付与予定のポイントはキャンセル</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-success" />
                  <span>履歴に「予約キャンセルによるポイント返還」として記録</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">店舗都合のキャンセル</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>顧客都合のキャンセルと同様の処理が行われます。</p>
                <p>顧客に不利益が生じないよう、システムが自動的に適切な処理を実行します。</p>
              </div>
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
                <TrendingUp className="h-5 w-5" />
                <span>マーケティング活用</span>
              </h4>
              <p className="text-sm text-accent-2">
                ポイント2倍キャンペーン、失効前通知（7-14日前）、
                誕生月ボーナスポイントなど、様々な施策に活用可能。
              </p>
            </div>
            <div className="p-4 bg-accent-2-foreground rounded-lg">
              <h4 className="font-semibold text-accent-2 mb-2">システム連携</h4>
              <p className="text-sm text-accent-2">
                LINE通知、顧客マイページでのリアルタイム残高確認、
                レポート機能によるポイント利用状況の分析が可能。
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
              <h4 className="font-semibold text-link-foreground mb-2">トラブルシューティング</h4>
              <p className="text-sm text-link-foreground">
                問題発生時は、テナントID・エラーメッセージ・発生日時をご用意ください
              </p>
              <p className="text-xs text-link-foreground mt-1">詳細な情報により迅速な対応が可能です</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}