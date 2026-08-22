'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  Users,
  CreditCard,
  Info,
  Star,
  Phone,
  Mail,
  LineChart,
} from 'lucide-react'
import {
  Support,
  FaqCard,
  ErrorWarningInfoCard,
  ScenarioCard,
} from '@/app/[locale]/(document)/_components'

const scenarioItems = [
  {
    title: '電話予約の受付',
    description:
      'お客様から電話で予約依頼 → メニューを選択 → スタッフ選択(指名フリー可能) → 計算された空き枠を選択 → 予約作成 → 確認メール送信',
    helpText:
      'タイムライン画面で空き時間を確認したり、新規予約作成画面で顧客情報を入力したり、2通りの方法があります。',
  },
]
const errorItems = [
  {
    title: 'この時間帯の予約はすでにいっぱいです',
    description: '別の時間帯またはスタッフを選択してください',
  },
  {
    title: '在庫が不足しています',
    description: 'オプションの数量を減らすか、別のオプションを選択してください',
  },
  {
    title: '決済に失敗しました',
    description: 'カード情報を確認し、再度決済を試みてください',
  },
]

const warningItems = [
  {
    title: '営業時間外の予約は作成できません',
    description: '営業時間内の予約のみ作成できます',
  },
  {
    title: 'オプション在庫は即座に減算されるため慎重に選択',
    description: 'オプションの在庫は予約作成時点で即座に減算されます。',
  },
  {
    title: '保留中の予約は30分ごとに自動キャンセル',
    description: '保留中の予約は30分ごとに自動キャンセルされます。',
  },
]

const faqs = [
  {
    question: '予約の変更はできますか？',
    answer:
      '現在のシステムでは予約の直接変更はできません。一度キャンセルして新規作成してください。',
  },
  {
    question: '予約確認メールが届かない場合',
    answer: '顧客情報のメールアドレスが正しいか確認してください。迷惑メールフォルダも確認を。',
  },
  {
    question: 'ダブルブッキングを防ぐには？',
    answer: 'システムが自動的に重複チェックを行います。警告が出た場合は時間を調整してください。',
  },
  {
    question: 'キャンセル料は取れますか？',
    answer: '現在のシステムではキャンセル料の自動徴収機能はありません。別途対応が必要です。',
  },
]

export default function ReservationManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-neon-foreground rounded-lg">
            <Calendar className="h-6 w-6 text-neon" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">予約管理機能</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              予約の作成・管理・キャンセル機能の詳細操作方法
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>基本機能</Badge>
          <Badge>リアルタイム管理</Badge>
          <Badge>決済連携</Badge>
          <Badge>在庫管理</Badge>
        </div>
      </div>

      {/* 機能概要 */}
      <div>
        <h2 className="text-xl md:text-3xl font-bold text-foreground mb-2">機能概要</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground">
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
              <h4 className="font-semibold text-foreground">お客様向け(マイページ)</h4>
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

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4 text-link-foreground">
            <Star className="h-4 w-4 text-link-foreground" />
            <p className="text-link-foreground text-xs md:text-sm">
              主要機能:
              タイムライン表示、リスト表示、決済連携、クーポン・ポイント適用、メール・LINE通知、在庫管理
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
              <h4 className="font-semibold text-foreground mb-3">サロンスタッフ向け管理画面</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Calendar className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">予約タイムライン画面</p>
                    <Link
                      target="_blank"
                      href="/dashboard"
                      className="text-xs text-link-foreground underline"
                    >
                      /dashboard
                    </Link>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Calendar className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">予約一覧画面</p>
                    <Link
                      target="_blank"
                      href="/dashboard/reservation"
                      className="text-xs text-link-foreground underline"
                    >
                      /dashboard/reservation
                    </Link>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Clock className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">新規予約作成画面</p>
                    <Link
                      target="_blank"
                      href="/dashboard/reservation/add"
                      className="text-xs text-link-foreground underline"
                    >
                      /dashboard/reservation/add
                    </Link>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Users className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">予約詳細画面</p>
                    <p className="text-xs text-link-foreground">/dashboard/reservation/[予約ID]</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">お客様向け画面</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-neon-foreground rounded-lg">
                  <Mail className="h-5 w-5 text-neon" />
                  <div>
                    <p className="font-semibold text-neon">予約完了 LINE・メール通知</p>
                    <p className="text-xs md:text-sm text-neon">確認リンク付き</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-neon-foreground rounded-lg">
                  <Phone className="h-5 w-5 text-neon" />
                  <div>
                    <p className="font-semibold text-neon">自動予約確認</p>
                    <p className="text-xs md:text-sm text-neon">
                      当日の3時間前に予約確認LINE・メールを送信
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-neon-foreground rounded-lg">
                  <LineChart className="h-5 w-5 text-neon" />
                  <div>
                    <p className="font-semibold text-neon">マイページ予約管理</p>
                    <p className="text-xs md:text-sm text-neon">
                      予約履歴・ポイント確認、予約キャンセル
                    </p>
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
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">予約作成画面を開く</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  サイドメニューの「予約」→「予約を追加」をクリック、またはタイムライン画面右上の「新規予約」ボタンをクリック
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">顧客情報の入力</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">既存顧客の場合</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      「既存のお客様」を選択し、顧客検索ボックスで名前や電話番号を入力
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">新規顧客の場合</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      「新規のお客様」を選択し、姓・名（必須）、電話番号（必須）を入力
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
                <h4 className="font-semibold text-foreground">予約日時の選択</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  カレンダーから予約日を選択、開始時間をプルダウンから選択（終了時間は選択メニューから自動計算）
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">スタッフ・メニューの選択</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  担当スタッフをプルダウンから選択（指名料がある場合は自動加算）、メニュー一覧から施術内容を選択
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                5
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">料金計算と支払い方法</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  クーポン・ポイントの適用、支払い方法（現金・クレジットカード）を選択
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                6
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">予約の確定</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  「予約を作成」ボタンをクリック、確認画面で内容を最終確認後「確定」をクリック
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4 ">
            <Info className="h-6 w-6 text-link-foreground" />
            <p className="text-xs md:text-sm text-link-foreground">
              時間の重複チェックは自動で行われます。オプションの在庫は予約作成時点で即座に減算されます。
            </p>
          </div>
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
              <div className="bg-warning text-warning-foreground p-2 rounded-lg my-3">
                <p className="text-xs md:text-sm">予約受付が完了した予約のみが表示されます。</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs md:text-sm text-muted-foreground">
                  横軸: 5:00〜翌5:00の時間軸（30分刻み）
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  縦軸: スタッフ別の予約状況
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  予約ブロックをクリックで詳細表示
                </p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">予約一覧</h4>

              <div className="space-y-2">
                <p className="text-xs md:text-sm text-muted-foreground">
                  期間やステータス、スタッフによって予約を絞り込む事ができます。
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  予約の詳細をクリックで詳細表示できます。
                </p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">全予約ステータス表示</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="min-w-3 min-h-3 bg-link-foreground rounded-full" />
                  <span className="text-sm">予約受付済み</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="min-w-3 min-h-3 bg-warning-foreground rounded-full" />
                  <span className="text-sm">
                    保留中　※オンライン決済待ち30分以内に決済が完了しない場合は自動でキャンセル
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="min-w-3 min-h-3 bg-destructive rounded-full" />
                  <span className="text-sm">返金・キャンセル済み</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="min-w-3 min-h-3 bg-success rounded-full" />
                  <span className="text-sm">完了</span>
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
                <p className="text-xs md:text-sm text-muted-foreground">1. 予約詳細画面を開く</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  2. 予約ステータスをキャンセルに変更して、ステータスを変更ボタンをクリック
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  3. 在庫・ポイントが自動復元され、予約枠が再度予約受付可能となります。
                </p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">お客様によるキャンセル</h4>
              <div className="space-y-2">
                <p className="text-xs md:text-sm text-muted-foreground">
                  1. メール・LINEのリンク、マイページからアクセス
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  2.
                  キャンセル可能期限ないの場合はキャンセルボタンをクリック(期限を過ぎた場合は電話でのキャンセルとなります)
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  3. 在庫・ポイントが自動復元され、予約枠が再度予約受付可能となります。
                </p>
              </div>
            </div>
          </div>

          <div className="bg-warning text-warning-foreground p-2 rounded-lg my-3 flex items-center space-x-2">
            <Info className="min-h-6 min-w-6 text-warning-foreground" />
            <p className="text-xs md:text-sm">
              キャンセル期限を過ぎるとお客様自身ではキャンセルできません。スタッフは期限に関係なくキャンセル可能です。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 決済処理 */}
      <Card>
        <CardHeader>
          <CardTitle>決済処理の流れ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="">
              <h4 className="font-semibold text-success mb-3 flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-success" />
                <span>現金決済</span>
              </h4>
              <div className="space-y-2 text-xs md:text-sm text-muted-foreground">
                <p>1. 予約作成時に「現金」を選択</p>
                <p>2. 予約が即座に「予約受付済み」ステータスになります。</p>
                <p>3. 来店時に現金で支払います。</p>
                <p>4. 施術が完了したら、予約ステータスを「完了」に変更してください。</p>
                <p>
                  5. 30日後に自動的にポイント付与されます。(※ポイント付与は設定でON/OFF可能です)
                </p>
              </div>
            </div>
            <div className="">
              <h4 className="font-semibold text-info mb-3 flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-info" />
                <span>クレジットカード決済</span>
              </h4>
              <div className="space-y-2 text-xs md:text-sm text-muted-foreground">
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
