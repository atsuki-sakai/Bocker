import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function MenuManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-accent rounded-lg">
            <Menu className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">メニュー管理機能</h1>
            <p className="text-muted-foreground text-sm md:text-base">サービスメニューの作成・編集・公開管理の詳細操作方法</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">基本機能</Badge>
          <Badge variant="secondary">画像登録</Badge>
          <Badge variant="secondary">カテゴリ分類</Badge>
          <Badge variant="secondary">価格設定</Badge>
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

          <Alert>
            <Star className="h-4 w-4" />
            <AlertDescription>
              <strong>プラン別上限:</strong> スタータープラン: 20個まで / スタンダードプラン: 50個まで / プレミアムプラン: 無制限
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
            <h4 className="font-semibold text-foreground mb-3">メニュー機能の画面一覧</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Menu className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">メニュー一覧画面</p>
                    <p className="text-xs text-muted-foreground">/dashboard/menu</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Plus className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">メニュー新規作成画面</p>
                    <p className="text-xs text-muted-foreground">/dashboard/menu/add</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Eye className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">メニュー詳細画面</p>
                    <p className="text-xs text-muted-foreground">/dashboard/menu/[menu_id]</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Edit3 className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">メニュー編集画面</p>
                    <p className="text-xs text-muted-foreground">/dashboard/menu/[menu_id]/edit</p>
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
              <div className="flex-shrink-0 w-5 h-5 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground text-sm md:text-base">基本情報の入力</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">メニュー名（必須）</p>
                    <p className="text-sm text-muted-foreground">例：カット、カラー、パーマ</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">カテゴリ（必須）</p>
                    <p className="text-sm text-muted-foreground">1つ以上選択（最大5つまで）</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">価格・所要時間（必須）</p>
                    <p className="text-sm text-muted-foreground">通常価格（1円〜999,999円）、所要時間（5分〜360分）</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">説明文（必須）</p>
                    <p className="text-sm text-muted-foreground">メニューの詳細説明を入力</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">画像の登録（任意）</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <span>最大3枚まで登録可能</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      画像エリアをクリックまたはドラッグ&ドロップ（1枚あたり最大6MB）
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">対応形式</p>
                    <p className="text-sm text-muted-foreground">JPG、PNG、WebP、GIF</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">推奨サイズ</p>
                    <p className="text-sm text-muted-foreground">800×1200px（縦長）、最小サイズ：400×600px</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">詳細設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span>セール価格（任意）</span>
                    </p>
                    <p className="text-sm text-muted-foreground">キャンペーン価格を設定</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">ターゲット設定</p>
                    <p className="text-sm text-muted-foreground">対象顧客：全員/初回のみ/リピーターのみ、性別：全性別/男性のみ/女性のみ</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <span>タグ（任意）</span>
                    </p>
                    <p className="text-sm text-muted-foreground">検索用キーワードを最大5つまで設定</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">支払い方法と公開設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">支払い方法</p>
                    <p className="text-sm text-muted-foreground">店頭決済のみ/オンライン決済のみ/両方対応</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">公開設定</p>
                    <p className="text-sm text-muted-foreground">「メニューを公開する」スイッチで公開/非公開を設定</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">5</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">「メニューを追加」ボタンをクリックして保存</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  入力した情報が保存され、メニュー一覧画面に戻ります
                </p>
              </div>
            </div>
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
              <div className="flex-shrink-0 w-8 h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">メニュー一覧画面から編集したいメニューをクリック</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  メニュー詳細画面が表示されます
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">メニュー詳細画面で「編集」ボタンをクリック</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  編集画面に移動します
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">編集画面で情報を修正</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">画像の変更</p>
                    <p className="text-sm text-muted-foreground">既存画像の削除、新規画像の追加、順序変更が可能</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">価格変更</p>
                    <p className="text-sm text-muted-foreground">通常価格・セール価格の変更</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">その他の項目</p>
                    <p className="text-sm text-muted-foreground">全ての項目が編集可能</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">「更新」ボタンをクリックして保存</h4>
                <p className="text-sm text-muted-foreground mt-1">
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
                <p className="text-sm text-muted-foreground mt-2">リアルタイムで結果が絞り込まれます</p>
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
                  <AlertDescription>
                    データは保持され、再度有効化可能です
                  </AlertDescription>
                </Alert>
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
              <h4 className="font-semibold text-foreground mb-2">シナリオA: 新メニューの追加から予約受付まで</h4>
              <p className="text-sm text-muted-foreground mb-3">
                新しいトリートメントメニューを作成 → 画像3枚を登録 → カテゴリ「トリートメント」を選択 → 公開設定をON
              </p>
              <div className="text-xs text-muted-foreground/80">
                価格5,000円、所要時間60分を設定。「髪質改善」「ダメージケア」などのタグを追加。顧客が予約時にメニューを選択可能に。
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">シナリオB: セットメニューの作成</h4>
              <p className="text-sm text-muted-foreground mb-3">
                「カット＋カラー」などの複合メニューを作成 → 複数のカテゴリを選択 → セット価格を設定
              </p>
              <div className="text-xs text-muted-foreground/80">
                複数のカテゴリ（カット、カラー）を選択。セット価格を設定（個別より割引価格）。所要時間は合計時間を設定。
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">シナリオC: 期間限定キャンペーンの設定</h4>
              <p className="text-sm text-muted-foreground mb-3">
                既存メニューの編集画面を開く → セール価格を設定 → タグに「期間限定」を追加 → 更新
              </p>
              <div className="text-xs text-muted-foreground/80">
                通常5,000円→4,000円のセール価格を設定。予約画面では割引価格が強調表示される。
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
                  <p className="font-medium text-destructive text-sm">「画像のアップロードに失敗しました」</p>
                  <p className="text-destructive/90 text-xs mt-1">画像を圧縮して6MB以下にしてから再度アップロード</p>
                </div>
                <div className="p-3 bg-warning/10 rounded-lg">
                  <p className="font-medium text-warning text-sm">「メニュー名は必須です」</p>
                  <p className="text-warning/90 text-xs mt-1">メニュー名を入力してから保存</p>
                </div>
                <div className="p-3 bg-info/10 rounded-lg">
                  <p className="font-medium text-info text-sm">「セール価格は通常価格より低く設定してください」</p>
                  <p className="text-info/90 text-xs mt-1">セール価格を通常価格より低く設定</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">操作時の注意点</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>1枚目の画像がサムネイルとして使用される</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>複数カテゴリを選択するとセットメニューとして扱われる</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>オンライン決済を有効にするには決済設定が必要</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>編集中のデータは自動保存されない</span>
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
              <h4 className="font-semibold text-foreground">Q: メニューは何個まで作成できますか？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: プランによって上限が異なります。スタータープラン：20個まで / スタンダードプラン：50個まで / プレミアムプラン：無制限
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: 削除したメニューを復元できますか？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: 削除したメニューは復元できません。非表示機能の利用をお勧めします。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: 画像なしでメニューを作成できますか？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: はい、画像は任意項目です。後から追加することも可能です。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Q: セットメニューの価格は自動計算されますか？</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A: いいえ、セットメニューの価格は手動で設定する必要があります。
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
              <h4 className="font-semibold text-accent-2 mb-2">オンライン決済の設定方法</h4>
              <p className="text-sm text-accent-2">
                1. ダッシュボード → 設定 → 決済設定<br />
                2. Stripe Connectの設定を完了<br />
                3. メニューの支払い方法で「オンライン決済」を選択可能に
              </p>
            </div>
            <div className="p-4 bg-accent-2-foreground rounded-lg">
              <h4 className="font-semibold text-accent-2 mb-2">メニューカテゴリの追加依頼</h4>
              <p className="text-sm text-accent-2">
                新しいカテゴリが必要な場合は support@bocker.jp までご連絡ください。
                リクエストを検討し、全ユーザー向けに追加されます。
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
              <h4 className="font-semibold text-link-foreground mb-2">推奨画像形式</h4>
              <p className="text-sm text-link-foreground">
                WebP推奨（自動変換されます）
              </p>
              <p className="text-xs text-link-foreground mt-1">推奨サイズ：800×1200px（縦長）</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}