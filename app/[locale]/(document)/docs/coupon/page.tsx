import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Gift, Plus, Calendar, Users, Star, Info, Edit3, CreditCard } from 'lucide-react'
import {
  Support,
  FaqCard,
  ScenarioCard,
  ErrorWarningInfoCard,
} from '@/app/[locale]/(document)/_components'

const scenarioItems = [
  {
    title: '新規顧客向け初回割引クーポン',
    description:
      '「初回限定30%OFF」クーポンを作成 → コード「FIRST30」で設定 → 対象顧客を「初回利用のみ」に設定 → ホームページやSNSで告知',
    helpText:
      'パーセント割引30%、最大利用回数は無制限に設定。新規顧客獲得の施策として活用し、予約時にクーポンコードを入力してもらう。',
  },
  {
    title: '期間限定サマーキャンペーン',
    description:
      '「夏季限定¥1,000OFF」クーポンを作成 → コード「SUMMER1000」で設定 → 有効期限7月1日〜8月31日 → 最大利用回数200回',
    helpText:
      '固定額割引¥1,000で設定し、高額メニューや新メニューを除外リストに追加。利用回数を定期的にチェックし、上限に達したら自動的に使用不可に。',
  },
  {
    title: 'リピーター向け特別クーポン',
    description:
      '「いつもありがとう20%OFF」クーポンを作成 → コード「THANKS20」で設定 → 対象顧客を「リピーター限定」に設定 → 来店回数の多いお客様にLINEで個別配信',
    helpText:
      'パーセント割引20%で設定し、リピーター限定で配布。利用状況を確認してリピート率向上の効果を測定。',
  },
]

const errorItems = [
  {
    title: 'クーポンコードが既に存在します',
    description: '別のクーポンコードを使用してください',
  },
  {
    title: 'プランの上限に達しました',
    description: '不要なクーポンを削除するか、プランをアップグレードしてください',
  },
  {
    title: '終了日は開始日より後の日付を選択してください',
    description: '終了日を開始日より後の日付に設定してください',
  },
]

const warningItems = [
  {
    title: '一度お客様に配布したコードは変更しない',
    description: 'お客様への混乱を避けるため、配布済みのコードは変更しないでください',
  },
  {
    title: 'パーセント割引と固定額割引を間違えないよう注意',
    description: '割引タイプを正しく選択してください',
  },
  {
    title: '新メニューや高額メニューは除外設定を忘れずに',
    description: '適切な除外設定を行い、想定外の大幅割引を防いでください',
  },
]

const faqs = [
  {
    question: 'クーポンを一時的に使用停止したい',
    answer:
      '編集画面で「有効」のチェックを外して更新してください。削除せずにデータを保持できます。',
  },
  {
    question: '同じお客様が何度も使えるクーポンを作りたい',
    answer:
      '「対象顧客」を「全ての顧客」に設定し、「最大利用回数」を大きな数値または0（無制限）に設定してください。',
  },
  {
    question: 'クーポンの利用履歴を確認したい',
    answer:
      '現在のバージョンでは、各クーポンの総利用回数のみ確認可能です。詳細な利用履歴機能は今後のアップデートで追加予定です。',
  },
  {
    question: 'クーポンをLINEで配信したい',
    answer: 'クーポンコードをコピーして、LINE配信機能でメッセージに含めて送信してください。',
  },
]

export default function CouponManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-neon-foreground rounded-lg">
            <Gift className="h-6 w-6 text-neon" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">クーポン管理機能</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              割引クーポンの作成・管理・マーケティング活用の詳細操作方法
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>プロモーション</Badge>
          <Badge>割引管理</Badge>
          <Badge>マーケティング</Badge>
          <Badge>顧客獲得</Badge>
        </div>
      </div>

      {/* 機能概要 */}
      <div>
        <h2 className="text-xl md:text-3xl font-bold text-foreground mb-2">機能概要</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground">
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

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4 text-link-foreground">
            <Star className="h-4 w-4 text-link-foreground" />
            <p className="text-link-foreground text-xs md:text-sm">
              プラン別上限: LITEプラン: 最大5個 / PROプラン: 最大20個
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">クーポン機能の画面一覧</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Gift className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">クーポン一覧画面</p>
                    <p className="text-xs text-link-foreground">/dashboard/coupon</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Plus className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">クーポン作成画面</p>
                    <p className="text-xs text-link-foreground">/dashboard/coupon/add</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Edit3 className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">クーポン編集画面</p>
                    <p className="text-xs text-link-foreground">
                      /dashboard/coupon/[coupon_id]/edit
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">クーポン機能の特徴</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-neon-foreground rounded-lg">
                  <CreditCard className="h-5 w-5 text-neon" />
                  <div>
                    <p className="font-semibold text-neon">割引タイプ</p>
                    <p className="text-xs md:text-sm text-neon">パーセント割引・固定額割引に対応</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-neon-foreground rounded-lg">
                  <Users className="h-5 w-5 text-neon" />
                  <div>
                    <p className="font-semibold text-neon">対象顧客設定</p>
                    <p className="text-xs md:text-sm text-neon">新規・リピーター・全顧客対象</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-neon-foreground rounded-lg">
                  <Calendar className="h-5 w-5 text-neon" />
                  <div>
                    <p className="font-semibold text-neon">期間限定設定</p>
                    <p className="text-xs md:text-sm text-neon">有効期限・利用回数制限</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4 text-link-foreground">
            <Star className="h-4 w-4 text-link-foreground" />
            <p className="text-link-foreground text-xs md:text-sm">
              アクセス方法: ダッシュボード → サイドメニュー「クーポン」→ クーポン一覧画面
            </p>
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
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">クーポン作成画面を開く</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  サイドメニューの「クーポン」→「クーポンを追加」ボタンをクリック
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">基本情報の入力</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground text-xs md:text-sm">
                      クーポン名（必須）
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      例：「新規顧客限定20%OFF」
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground text-xs md:text-sm">
                      クーポンコード（必須、最大12文字）
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      例：「NEWUSER20」「SUMMER2025」
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground text-xs md:text-sm">
                      割引タイプ
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      パーセント割引（1〜100%）/ 固定額割引（¥1〜¥99,999）
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
                <h4 className="font-semibold text-foreground">対象顧客の選択</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground text-xs md:text-sm flex items-center space-x-2">
                      <Users className="h-4 w-4 text-link-foreground" />
                      <span>全ての顧客</span>
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">誰でも使用可能</p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground text-xs md:text-sm">
                      初回利用のみ
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      初めて来店するお客様限定
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground text-xs md:text-sm">
                      リピーター限定
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">2回目以降の来店客限定</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">期間と利用条件の設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground text-xs md:text-sm flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-link-foreground" />
                      <span>有効期限</span>
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      開始日・終了日を設定（必ず未来の日付を選択）
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground text-xs md:text-sm">
                      最大利用回数（0〜99,999回）
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      0に設定すると無制限に使用可能
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
                <h4 className="font-semibold text-foreground">メニューとステータスの設定</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground text-xs md:text-sm">
                      有効/無効
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      「有効」にすると即座に使用可能
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground text-xs md:text-sm">
                      除外メニュー（任意）
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      クーポンを適用したくないメニューを選択
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
                <h4 className="font-semibold text-foreground">「作成」ボタンをクリックして完了</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  作成したクーポンが一覧画面に表示されます
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4 ">
            <Info className="h-6 w-6 text-link-foreground" />
            <p className="text-xs md:text-sm text-link-foreground">
              重要:
              一度作成したクーポンコードは変更しないことを推奨します。お客様への混乱を避けるためです。
            </p>
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
                <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                  <p className="text-destructive text-xs md:text-sm">
                    <strong>注意:</strong> 削除すると復元できません。利用履歴も失われます。
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">クーポンの無効化（推奨）</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. 編集画面で「有効」のチェックを外す</p>
                <p>2. 「更新」ボタンをクリック</p>
                <p>3. 無効化されたクーポンは使用できなくなります</p>
                <div className="mt-3 p-3 bg-success/10 rounded-lg">
                  <p className="text-success text-xs md:text-sm">
                    データは保持され、再度有効化可能です
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <FaqCard title="よくある質問" faqs={faqs} />

      {/* サポート情報 */}
      <Support />
    </div>
  )
}