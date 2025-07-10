import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Camera, 
  Mic, 
  Search, 
  Edit3,
  Star,
  Info,
  Eye,
} from 'lucide-react';
import { Support, FaqCard, ScenarioCard } from '@/app/[locale]/(document)/_components'

export default function CarteManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-muted rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">カルテ管理機能</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              顧客の施術履歴・体質情報管理の詳細操作方法
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>写真機能</Badge>
          <Badge>音声入力</Badge>
          <Badge>履歴管理</Badge>
          <Badge>体質情報</Badge>
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
            カルテ機能は、美容サロンで顧客の施術履歴や体質情報を一元管理するための機能です。
            顧客一人ひとりの肌質・髪質・アレルギー情報などの基本情報と、各施術時の詳細記録（写真・メモ・要望）を管理できます。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">対象ユーザー</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>サロンスタッフ、オーナー</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">主な用途</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>顧客の体質情報（肌質・髪質・アレルギー・病歴）の記録</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>施術前後の写真記録（PROプラン以上）</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>施術内容・顧客要望・スタッフメモの管理</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>音声入力による効率的なメモ作成（PROプラン以上）</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4">
            <Star className="h-4 w-4 text-link-foreground" />
            <div className="text-xs md:text-sm text-link-foreground">
              <strong>LITEプラン:</strong>{' '}
              基本的なカルテ機能（肌質・髪質・アレルギー・病歴・テキストメモ）
              <br />
              <strong>PROプラン:</strong> 写真アップロード・音声入力機能も利用可能
            </div>
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
            <h4 className="font-semibold text-foreground mb-3">カルテ機能の画面一覧</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Search className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">顧客検索画面</p>
                    <p className="text-xs text-link-foreground">/dashboard/carte</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Eye className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">顧客カルテ一覧画面</p>
                    <p className="text-xs text-link-foreground">/dashboard/carte/[customer_id]</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Edit3 className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">カルテ基本情報編集画面</p>
                    <p className="text-xs text-link-foreground">
                      /dashboard/carte/[customer_id]/edit
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg w-full overflow-hidden">
                  <FileText className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">施術カルテ詳細画面</p>
                    <p className="w-full block text-xs text-link-foreground truncate">
                      /dashboard/carte/[customer_id]/reservation/[reservation_id]
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4 text-white">
            <Star className="h-4 w-4 text-link-foreground" />
            <p className="text-link-foreground text-xs md:text-sm">
              アクセス方法: ダッシュボード →
              サイドメニュー「カルテ」をクリック、または予約詳細画面から「カルテを見る」ボタンをクリック
            </p>
          </div>
        </CardContent>
      </Card>

      {/* カルテ基本情報の作成 */}
      <Card>
        <CardHeader>
          <CardTitle>カルテの新規作成</CardTitle>
          <CardDescription>顧客の体質情報を初回登録する手順</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">カルテ画面から対象顧客を検索</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  顧客名、電話番号、メールアドレス、LINE表示名、タグで検索可能
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">
                  顧客カルテ詳細へをクリックして顧客カルテ一覧画面へ
                </h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  選択した顧客の基本情報と施術履歴が表示されます
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">右上の「編集」ボタンをクリック</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  カルテ基本情報編集画面に移動します
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">体質情報を入力</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground text-xs md:text-sm">肌質</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      普通肌/乾燥肌/脂性肌/混合肌/敏感肌から選択
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground text-xs md:text-sm">髪質</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      ストレート/ウェーブ/カーリー/コイリー/細い/太いから選択
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground text-xs md:text-sm">
                      アレルギー歴・病歴
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      テキストで詳細を記入（最大1000文字）
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
                <h4 className="font-semibold text-foreground">「作成」ボタンをクリックして保存</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  入力した体質情報が保存され、一覧画面に戻ります
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 施術カルテの作成 */}
      <Card>
        <CardHeader>
          <CardTitle>施術カルテの新規作成</CardTitle>
          <CardDescription>予約に対する施術記録を作成する手順</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>自動作成:</strong> カルテは予約の受付時に自動で作成されます。
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">施術履歴から該当予約をクリック</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  顧客カルテ一覧画面の「施術履歴」セクションから編集したい予約を選択
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">施術カルテ詳細画面で情報を入力</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-xs md:text-sm flex items-center space-x-2">
                      <Camera className="h-4 w-4 text-link-foreground" />
                      <span className="text-link-foreground">施術後の写真（PROプラン以上）</span>
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      最大4枚まで、ドラッグ&ドロップまたはクリックで選択
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-xs md:text-sm text-link-foreground">
                      お客様のご要望
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      顧客から伺った要望を記録
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-xs md:text-sm flex items-center space-x-2">
                      <Mic className="h-4 w-4 text-link-foreground" />
                      <span className="text-link-foreground">スタッフメモ</span>
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      施術時の気づきや注意点を記録（音声入力対応）
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
                <h4 className="font-semibold text-foreground">「保存する」ボタンをクリック</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  施術記録が保存され、履歴として蓄積されます
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 利用シナリオ */}
      <ScenarioCard
        scenarioItems={[
          {
            title: 'シナリオA: 新規顧客の初回施術',
            description:
              '予約受付時に顧客情報を登録 → 来店時にカルテ基本情報を作成 → 施術後、カルテ詳細を記録',
            helpText:
              'カウンセリングで肌質・髪質を確認し、アレルギーの有無を聞き取り。施術後、ビフォーアフター写真を撮影（お客様の許可を得て）し、使用した薬剤や施術内容をメモに記録。',
          },
          {
            title: 'シナリオB: リピーター顧客の施術',
            description:
              '来店前に過去のカルテを確認 → 施術中に気づいた点をメモ → 施術後の状態を写真で記録',
            helpText:
              '前回の施術内容・要望を把握し、アレルギー情報を再確認。音声入力で手が塞がっていても記録可能。前回との比較が可能な写真記録。',
          },
          {
            title: 'シナリオC: スタッフ間の情報共有',
            description:
              '担当変更時に過去のカルテを確認 → 重要な注意事項を把握 → 顧客の好みや要望を引き継ぎ',
            helpText:
              'アレルギー等の重要な注意事項を把握し、顧客の好みや要望を新しい担当者に引き継ぎ。',
          },
        ]}
      />

      {/* よくある質問 */}
      <FaqCard
        title="よくある質問"
        faqs={[
          {
            question: 'Q: LITEプランでもカルテ機能は使えますか？',
            answer:
              'A: 基本的なカルテ機能（肌質・髪質・アレルギー・病歴・テキストメモ）は全プランで利用可能です。写真アップロードと音声入力はPROプラン以上で利用できます。',
          },
          {
            question: 'Q: 過去のカルテを一括でダウンロードできますか？',
            answer:
              'A: 現在、一括ダウンロード機能は提供していません。個別の施術記録は画面から確認・印刷可能です。',
          },
          {
            question: 'Q: 複数スタッフで同時編集できますか？',
            answer:
              'A: 同じカルテを複数人で同時編集すると、最後に保存した内容で上書きされます。編集時は他スタッフと調整してください。',
          },
          {
            question: 'Q: 写真の画質が悪くなることがあります',
            answer:
              'A: アップロード時に自動的に圧縮処理が行われます。元画像は高画質で撮影し、重要な部分が見えるようにしてください。',
          },
        ]}
      />

      {/* サポート情報 */}
      <Support />
    </div>
  )
}