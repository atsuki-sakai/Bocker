import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Search, 
  UserPlus, 
  Edit3,
  Star,
  Info,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react';

export default function CustomerManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-accent rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">顧客管理機能</h1>
            <p className="text-muted-foreground text-sm md:text-base">顧客情報の登録・編集・検索機能の詳細操作方法</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">基本機能</Badge>
          <Badge variant="secondary">検索機能</Badge>
          <Badge variant="secondary">ポイント管理</Badge>
          <Badge variant="secondary">マイページ</Badge>
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
            顧客管理機能は、美容サロンにおけるお客様の情報を一元的に管理するための機能です。
            予約履歴、ポイント、カルテ情報など、お客様に関するあらゆる情報を効率的に管理できます。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">サロンスタッフ向け</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>全顧客の情報確認、分析、マーケティング施策</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>担当顧客の情報確認、施術履歴の参照</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>新規顧客登録、既存顧客の情報更新</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">お客様向け</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>登録情報、予約履歴、ポイント残高の確認</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>連絡先や誕生日などの個人情報の更新</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>獲得・使用したポイントの詳細確認</span>
                </li>
              </ul>
            </div>
          </div>

          <Alert>
            <Star className="h-4 w-4" />
            <AlertDescription>
              <strong>主要機能:</strong> 顧客情報の登録・編集・削除、顧客検索、ポイント管理、カルテ管理、タグ付け、予約履歴確認、LINE連携
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
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Users className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">顧客一覧画面</p>
                    <p className="text-xs text-muted-foreground">/dashboard/customer</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <UserPlus className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">新規顧客登録画面</p>
                    <p className="text-xs text-muted-foreground">/dashboard/customer/add</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Edit3 className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">顧客編集画面</p>
                    <p className="text-xs text-muted-foreground">/dashboard/customer/[顧客ID]/edit</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">お客様向けマイページ</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Users className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">プロフィール画面</p>
                    <p className="text-sm text-muted-foreground">個人情報の確認・編集</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Star className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">ポイント画面</p>
                    <p className="text-sm text-muted-foreground">ポイント残高・履歴確認</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">予約履歴画面</p>
                    <p className="text-sm text-muted-foreground">過去の予約・施術履歴</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 新規顧客登録手順 */}
      <Card>
        <CardHeader>
          <CardTitle>新規顧客登録手順</CardTitle>
          <CardDescription>管理画面から新規顧客を登録する詳細手順</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-5 h-5 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground text-sm md:text-base">顧客一覧画面を開く</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  サイドメニューの「顧客」をクリック
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">新規登録画面へ移動</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  画面右上の「顧客を追加」ボタンをクリック
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">基本情報の入力</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">必須項目</p>
                    <p className="text-sm text-muted-foreground">姓（例：山田）、名（例：太郎）</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">任意項目</p>
                    <p className="text-sm text-muted-foreground">電話番号、メールアドレス、LINE ID、LINEユーザー名</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">マーケティング情報の入力</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  メールアドレス（メルマガ配信用）、性別、誕生日をカレンダーから選択
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">5</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">その他の情報</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  タグ（例：「常連」「カラー希望」「敏感肌」）、備考・メモ、初期ポイント
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">6</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">登録完了</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  「顧客を追加」ボタンをクリック、正常に登録されると顧客一覧画面に戻る
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>ヒント:</strong> LINE連携のお客様は、初回予約時に自動的に顧客登録されます。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 顧客検索機能 */}
      <Card>
        <CardHeader>
          <CardTitle>顧客検索の使い方</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">検索可能な項目</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">姓・名（部分一致）</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">電話番号（部分一致）</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">メールアドレス（部分一致）</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">LINE ID・LINEユーザー名</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">検索のコツ</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">幅広く検索したい場合</p>
                  <p>名前の一部を入力（例：「田」で「山田」「田中」を検索）</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">特定の顧客を探す場合</p>
                  <p>電話番号の下4桁、メールアドレスの@前の部分を入力</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">検索結果が多い場合</p>
                  <p>より具体的な情報を入力、タグで絞り込み</p>
                </div>
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
              <h4 className="font-semibold text-foreground mb-2">シナリオA: 新規来店のお客様を登録</h4>
              <p className="text-sm text-muted-foreground mb-3">
                来店時の受付で基本情報を入力 → カウンセリングでカルテ情報を登録 → 会計時にポイントカード案内
              </p>
              <div className="text-xs text-muted-foreground/80">
                お名前と電話番号を伺い、顧客登録画面で基本情報を入力。アレルギーや肌質を確認してカルテ情報として登録。
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">シナリオB: 常連客のポイント利用</h4>
              <p className="text-sm text-muted-foreground mb-3">
                来店時に電話番号で顧客検索 → ポイント残高を確認 → 会計時にポイントを使用
              </p>
              <div className="text-xs text-muted-foreground/80">
                電話番号で顧客検索し、現在のポイント残高を確認。顧客編集画面でポイントを調整し、履歴を自動作成。
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">シナリオC: 誕生月のお客様へのアプローチ</h4>
              <p className="text-sm text-muted-foreground mb-3">
                今月誕生日のお客様をリストアップ → 特別クーポンの案内 → 来店時に特別ポイント付与
              </p>
              <div className="text-xs text-muted-foreground/80">
                顧客一覧で誕生日順にソート、今月誕生日のお客様にメールやLINEで特別クーポンを案内。
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
              <h4 className="font-semibold text-foreground">Q: 同じ電話番号で複数の顧客を登録できますか？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: はい、可能です。家族で同じ電話番号を使用している場合などに対応しています。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: 削除した顧客を復活させることはできますか？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: いいえ、一度削除した顧客情報は復元できません。誤削除にご注意ください。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: ポイントの有効期限は設定できますか？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: 現在のシステムでは自動的な有効期限設定はありません。手動での管理が必要です。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: 顧客情報をエクスポートできますか？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: 現在この機能は実装されていません。今後のアップデートで対応予定です。
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
              <h4 className="font-semibold text-link-foreground mb-2">よくある質問</h4>
              <p className="text-sm text-link-foreground">
                https://bocker.jp/faq
              </p>
              <p className="text-xs text-link-foreground mt-1">最新版は管理画面のヘルプメニューから確認</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}