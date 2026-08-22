'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Users, Search, UserPlus, Edit3, Star, Info, Phone, Mail, Calendar } from 'lucide-react'
import {
  Support,
  FaqCard,
  ErrorWarningInfoCard,
  ScenarioCard,
} from '@/app/[locale]/(document)/_components'

const scenarioItems = [
  {
    title: '新規来店のお客様を登録',
    description:
      '来店時の受付で基本情報を入力 → カウンセリングでカルテ情報を登録 → 会計時にポイントカード案内',
    helpText:
      'お名前と電話番号を伺い、顧客登録画面で基本情報を入力。アレルギーや肌質を確認してカルテ情報として登録。',
  },
  {
    title: '常連客のポイント利用',
    description: '来店時に電話番号で顧客検索 → ポイント残高を確認 → 会計時にポイントを使用',
    helpText:
      '電話番号で顧客検索し、現在のポイント残高を確認。顧客編集画面でポイントを調整し、履歴を自動作成。',
  },
  {
    title: '誕生月のお客様へのアプローチ',
    description: '今月誕生日のお客様をリストアップ → 特別クーポンの案内 → 来店時に特別ポイント付与',
    helpText: '顧客一覧で誕生日順にソート、今月誕生日のお客様にメールやLINEで特別クーポンを案内。',
  },
]

const errorItems = [
  {
    title: '同じ電話番号で重複登録',
    description: '家族で同じ電話番号を使用している場合は問題ありません',
  },
  {
    title: '削除した顧客情報は復元不可',
    description: '誤削除にご注意ください。削除前に必ず確認してください',
  },
  {
    title: 'ポイント調整時の入力ミス',
    description: 'ポイント残高の変更は履歴に残ります。慎重に操作してください',
  },
]

const warningItems = [
  {
    title: '個人情報の取り扱いに注意',
    description: '顧客情報は適切に管理し、第三者への漏洩を防いでください',
  },
  {
    title: 'データバックアップの重要性',
    description: '定期的なバックアップを実施し、データ損失を防止してください',
  },
  {
    title: 'アクセス権限の管理',
    description: 'スタッフの権限に応じて、顧客情報へのアクセスを制限してください',
  },
]

const faqs = [
  {
    question: '同じ電話番号で複数の顧客を登録できますか？',
    answer: 'はい、可能です。家族で同じ電話番号を使用している場合などに対応しています。',
  },
  {
    question: '削除した顧客を復活させることはできますか？',
    answer: 'いいえ、一度削除した顧客情報は復元できません。誤削除にご注意ください。',
  },
  {
    question: 'ポイントの有効期限は設定できますか？',
    answer: '現在のシステムでは自動的な有効期限設定はありません。手動での管理が必要です。',
  },
  {
    question: '顧客情報をエクスポートできますか？',
    answer: '現在この機能は実装されていません。今後のアップデートで対応予定です。',
  },
]

export default function CustomerManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-neon-foreground rounded-lg">
            <Users className="h-6 w-6 text-neon" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">顧客管理機能</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              顧客情報の登録・編集・検索機能の詳細操作方法
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>基本機能</Badge>
          <Badge>検索機能</Badge>
          <Badge>ポイント管理</Badge>
          <Badge>マイページ</Badge>
        </div>
      </div>

      {/* 機能概要 */}
      <div>
        <h2 className="text-xl md:text-3xl font-bold text-foreground mb-2">機能概要</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground">
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
                  <span>顧客の情報確認、施術履歴の参照</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>新規顧客登録、既存顧客の情報更新</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">お客様向け(マイページ)</h4>
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

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4 text-link-foreground">
            <Star className="h-4 w-4 text-link-foreground" />
            <p className="text-link-foreground text-xs md:text-sm">
              主要機能:
              顧客情報の登録・編集・削除、顧客検索、ポイント管理、カルテ管理、タグ付け、予約履歴確認、LINE連携
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
                  <Users className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">顧客一覧画面</p>
                    <Link
                      target="_blank"
                      href="/dashboard/customer"
                      className="text-xs text-link-foreground underline"
                    >
                      /dashboard/customer
                    </Link>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <UserPlus className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">新規顧客登録画面</p>
                    <Link
                      target="_blank"
                      href="/dashboard/customer/add"
                      className="text-xs text-link-foreground underline"
                    >
                      /dashboard/customer/add
                    </Link>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                  <Edit3 className="h-5 w-5 text-link-foreground" />
                  <div>
                    <p className="font-semibold text-link-foreground">顧客編集画面</p>
                    <p className="text-xs text-link-foreground">
                      /dashboard/customer/[顧客ID]/edit
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">お客様向け画面</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-neon-foreground rounded-lg">
                  <Users className="h-5 w-5 text-neon" />
                  <div>
                    <p className="font-semibold text-neon">プロフィール画面</p>
                    <p className="text-xs md:text-sm text-neon">個人情報の確認・編集</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-neon-foreground rounded-lg">
                  <Star className="h-5 w-5 text-neon" />
                  <div>
                    <p className="font-semibold text-neon">ポイント画面</p>
                    <p className="text-xs md:text-sm text-neon">ポイント残高・履歴確認</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-neon-foreground rounded-lg">
                  <Calendar className="h-5 w-5 text-neon" />
                  <div>
                    <p className="font-semibold text-neon">予約履歴画面</p>
                    <p className="text-xs md:text-sm text-neon">過去の予約・施術履歴</p>
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
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">顧客一覧画面を開く</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  サイドメニューの「顧客」をクリック
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">新規登録画面へ移動</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  画面右上の「顧客を追加」ボタンをクリック
                </p>
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
                    <p className="font-semibold text-link-foreground">必須項目</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      姓（例：山田）、名（例：太郎）
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">任意項目</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      電話番号、メールアドレス、LINE ID、LINEユーザー名
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
                <h4 className="font-semibold text-foreground">マーケティング情報の入力</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  メールアドレス（メルマガ配信用）、性別、誕生日をカレンダーから選択
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                5
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">その他の情報</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  タグ（例：「常連」「カラー希望」「敏感肌」）、備考・メモ、初期ポイント
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                6
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">登録完了</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  「顧客を追加」ボタンをクリック、正常に登録されると顧客一覧画面に戻る
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4">
            <Info className="h-6 w-6 text-link-foreground" />
            <p className="text-xs md:text-sm text-link-foreground">
              LINE連携のお客様は、初回予約時に自動的に顧客登録されます。
            </p>
          </div>
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
                <div className="p-3 bg-link rounded-lg">
                  <p className="font-semibold text-link-foreground">幅広く検索したい場合</p>
                  <p className="text-xs md:text-sm text-link-foreground">
                    名前の一部を入力（例：「田」で「山田」「田中」を検索）
                  </p>
                </div>
                <div className="p-3 bg-link rounded-lg">
                  <p className="font-semibold text-link-foreground">特定の顧客を探す場合</p>
                  <p className="text-xs md:text-sm text-link-foreground">
                    電話番号の下4桁、メールアドレスの@前の部分を入力
                  </p>
                </div>
                <div className="p-3 bg-link rounded-lg">
                  <p className="font-semibold text-link-foreground">検索結果が多い場合</p>
                  <p className="text-xs md:text-sm text-link-foreground">
                    より具体的な情報を入力、タグで絞り込み
                  </p>
                </div>
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
