'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import {
  Users,
  Plus,
  UserCheck,
  Mail,
  Shield,
  Calendar,
  Info,
  AlertTriangle,
  Edit3,
  Crown,
  UserCog,
  Instagram,
  CheckCircle,
  Image as ImageIcon,
} from 'lucide-react'
import {
  Support,
  FaqCard,
  ErrorWarningInfoCard,
  ScenarioCard,
} from '@/app/[locale]/(document)/_components'

export default function StaffManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-neon-foreground rounded-lg">
            <Users className="h-6 w-6 text-neon" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">スタッフ管理機能</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              スタッフ情報・権限・勤務スケジュール管理の詳細操作方法
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>権限管理</Badge>
          <Badge>メール招待</Badge>
          <Badge>スケジュール管理</Badge>
          <Badge>指名料設定</Badge>
        </div>
      </div>

      {/* 機能概要 */}
      <div>
        <h2 className="text-xl md:text-3xl font-bold text-foreground mb-2">機能概要</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            スタッフ管理機能は、美容サロンで働くスタッフの情報管理、権限設定、勤務スケジュール管理を行うための総合的な機能です。
            スタッフの登録から招待、権限管理、予約との連携まで、サロン運営に必要なスタッフ管理を一元化します。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">対象ユーザー</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <Crown className="h-4 w-4 text-primary" />
                  <span>サロンオーナー：スタッフ登録・権限管理・全体統括</span>
                </li>
                <li className="flex items-center space-x-2">
                  <UserCog className="h-4 w-4 text-primary" />
                  <span>マネージャー：勤務管理・シフト調整</span>
                </li>
                <li className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span>スタッフ：自身の情報確認・スケジュール管理</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">主な機能</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>スタッフ情報の登録・編集</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>メール招待によるアカウント作成</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>権限レベル（オーナー・マネージャー・スタッフ）設定</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>指名料・優先度・対応可能メニューの設定</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4 text-link-foreground">
            <Info className="h-4 w-4 text-link-foreground" />
            <p className="text-link-foreground text-xs md:text-sm">
              <strong>プラン別上限:</strong> MICRO: 1名 / LITE: 5名 / PRO: 10名
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
          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground mb-3">スタッフ管理機能の画面一覧</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                    <Users className="h-5 w-5 text-link-foreground" />
                    <div>
                      <p className="font-semibold text-link-foreground">スタッフ一覧画面</p>
                      <Link
                        target="_blank"
                        href="/dashboard/staff"
                        className="text-xs text-link-foreground underline"
                      >
                        /dashboard/staff
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                    <Plus className="h-5 w-5 text-link-foreground" />
                    <div>
                      <p className="font-semibold text-link-foreground">スタッフ新規登録画面</p>
                      <Link
                        target="_blank"
                        href="/dashboard/staff/add"
                        className="text-xs text-link-foreground underline"
                      >
                        /dashboard/staff/add
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                    <Edit3 className="h-5 w-5 text-link-foreground" />
                    <div>
                      <p className="font-semibold text-link-foreground">スタッフ編集画面</p>
                      <p className="text-xs text-link-foreground">/dashboard/staff/[id]/edit</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                    <UserCheck className="h-5 w-5 text-link-foreground" />
                    <div>
                      <p className="font-semibold text-link-foreground">スタッフ詳細画面</p>
                      <p className="text-xs text-link-foreground">/dashboard/staff/[id]</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                    <Calendar className="h-5 w-5 text-link-foreground" />
                    <div>
                      <p className="font-semibold text-link-foreground">勤務スケジュール管理</p>
                      <Link
                        target="_blank"
                        href="/dashboard/staff-schedule"
                        className="text-xs text-link-foreground underline"
                      >
                        /dashboard/staff-schedule
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-link rounded-lg">
                    <Mail className="h-5 w-5 text-link-foreground" />
                    <div>
                      <p className="font-semibold text-link-foreground">招待受諾画面</p>
                      <p className="text-xs text-link-foreground">/staff/invite-accept</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-link rounded-lg p-4 text-link-foreground">
              <Info className="h-4 w-4 text-link-foreground" />
              <p className="text-link-foreground text-xs md:text-sm">
                導線: ダッシュボード → 「スタッフ管理」 / 一覧画面 → 「スタッフを追加」 /
                招待メール内リンク → 招待受諾画面
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 招待メール送信による登録 */}
      <Card>
        <CardHeader>
          <CardTitle>招待メール送信による登録（推奨）</CardTitle>
          <CardDescription>新規スタッフを招待メールでアカウント作成する手順</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground text-sm md:text-base">
                  スタッフ一覧画面を開く
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  ダッシュボード → 「スタッフ管理」をクリック
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground text-sm md:text-base">
                  新規登録画面へ移動
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  右上の「スタッフを追加」ボタンをクリック
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground text-sm md:text-base">
                  招待メール送信モードを有効化
                </h4>
                <div className="mt-2 space-y-2">
                  <div className="p-2 md:p-3 bg-link rounded-lg">
                    <p className="font-semibold text-xs md:text-sm flex items-center space-x-2 text-link-foreground">
                      <Mail className="h-4 w-4 text-link-foreground" />
                      <span>「招待メールを送信」スイッチをON</span>
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      このモードではメールアドレスが必須となります
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
                <h4 className="font-semibold text-foreground text-sm md:text-base">
                  必要情報を入力
                </h4>
                <div className="mt-2 space-y-2">
                  <div className="p-2 md:p-3 bg-link rounded-lg">
                    <p className="font-semibold text-xs md:text-sm flex items-center space-x-2 text-link-foreground">
                      <Mail className="h-4 w-4 text-link-foreground" />
                      <span>メールアドレス（必須）</span>
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      招待を送るスタッフのメールアドレス
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-link-foreground" />
                      <span>権限設定（必須）</span>
                    </p>
                    <div className="text-xs md:text-sm text-link-foreground mt-1">
                      <p>• スタッフ：予約管理・自分の情報のみ</p>
                      <p>• マネージャー：＋顧客管理・スタッフ管理</p>
                      <p>• オーナー：全機能にアクセス可能</p>
                    </div>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">その他の情報</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      名前やその他の情報は任意で入力
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
                <h4 className="font-semibold text-foreground">保存して招待送信</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  「保存」ボタンをクリックすると、招待メールが自動送信されます
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-link rounded-lg p-4">
            <Info className="h-6 w-6 text-link-foreground" />
            <p className="text-xs md:text-sm text-link-foreground">
              招待は30日で期限切れとなります。期限切れの場合は再送信が必要です。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 直接登録手順 */}
      <Card>
        <CardHeader>
          <CardTitle>招待なしでの直接登録</CardTitle>
          <CardDescription>招待メールを送信せずに直接スタッフ情報を登録する手順</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">招待メール送信モードをOFF</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  「招待メールを送信」スイッチをOFFにする（この場合、スタッフはログインできません）
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">基本情報タブで入力</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground flex items-center space-x-2">
                      <ImageIcon className="h-4 w-4 text-link-foreground" />
                      <span>スタッフ画像</span>
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      正方形の画像を推奨（JPG/PNG/WebP、5MB以下）
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">名前（必須）・性別・年齢</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      スタッフの基本情報を入力
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">タグ・有効/無効</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      カンマ区切りで最大5個、予約受付可否の設定
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground flex items-center space-x-2">
                      <Instagram className="h-4 w-4 text-link-foreground" />
                      <span>Instagram URL・自己紹介（必須）</span>
                    </p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      お客様向けの紹介文とSNSリンク
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
                <h4 className="font-semibold text-foreground">詳細設定の入力</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">指名料</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      円単位で入力（0円も可）
                    </p>
                  </div>
                  <div className="p-3 bg-link rounded-lg">
                    <p className="font-semibold text-link-foreground">優先度</p>
                    <p className="text-xs md:text-sm text-link-foreground">
                      0-999の数値（大きいほど上位表示）
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
                <h4 className="font-semibold text-foreground">対応外メニュータブで設定</h4>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  このスタッフが対応できないメニューを選択。選択したメニューは予約時に選択不可となります。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 編集・権限管理 */}
      <Card>
        <CardHeader>
          <CardTitle>編集・権限管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">基本情報の編集</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. スタッフ詳細画面 → 「編集」ボタン</p>
                <p>2. 必要な項目を変更</p>
                <p>3. 画像の変更・削除も可能</p>
                <p>4. 「スタッフを更新」ボタンで保存</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">権限の変更（管理者のみ）</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. 編集画面の「認証・権限設定」セクション</p>
                <p>2. スタッフ/マネージャー/オーナーから選択</p>
                <p>3. 「スタッフを更新」ボタンで確定</p>
                <div className="flex items-center space-x-2 bg-link rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 text-link-foreground" />
                  <p className="text-xs md:text-sm text-link-foreground">
                    権限変更は慎重に行ってください
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 利用シナリオ */}
      <ScenarioCard
        scenarioItems={[
          {
            title: '新規スタッフの入社',
            description:
              '基本情報と権限を設定して招待メール送信 → スタッフがメール内リンクからアカウント作成 → 管理者が詳細設定（指名料・対応外メニュー・タグ付け） → 勤務スケジュール設定',
            helpText:
              '新人スタッフに「スタッフ」権限を付与し、対応外メニューにパーマやカラーを設定。タグに「新人」「カット専門」を追加。',
          },
          {
            title: 'スタッフ情報の更新',
            description:
              '定期的なプロフィール写真・自己紹介文の更新 → スキル向上に伴う対応可能メニューの追加 → タグの更新（「新人」→「ベテラン」） → 権限昇格（スタッフ→マネージャー）',
            helpText:
              '3ヶ月ごとの写真更新、半年ごとのスキル見直し、年1回の権限・指名料見直しを推奨。',
          },
        ]}
      />

      {/* エラー・注意事項 */}
      <ErrorWarningInfoCard
        mainTitle="エラー・注意事項"
        errorItems={[
          {
            title: '「このメールアドレスは既に登録されています」',
            description: '招待管理セクションで既存の招待を確認するか、別のメールアドレスを使用',
          },
          {
            title: '「スタッフ作成上限に達しました」',
            description: '不要なスタッフを削除するか、プランのアップグレードを検討',
          },
          {
            title: '「画像アップロードに失敗しました」',
            description: '画像を圧縮（2MB以下推奨）し、JPG/PNG/WebP形式を使用',
          },
        ]}
        warningItems={[
          {
            title: '変更は保存するまで反映されません',
            description: 'ページ移動前に必ず保存してください',
          },
          {
            title: 'オーナー権限は慎重に付与',
            description: '全データへのアクセス権限があります',
          },
          {
            title: '招待は30日で期限切れ',
            description: 'スパムフォルダの確認を依頼してください',
          },
          {
            title: '削除したスタッフの予約履歴は保持される',
            description: 'データの整合性は保たれます',
          },
        ]}
      />

      {/* 削除・無効化 */}
      <Card>
        <CardHeader>
          <CardTitle>スタッフの削除・無効化方法</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">スタッフの削除</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. スタッフ詳細画面 → 「削除」ボタン</p>
                <p>2. 確認ダイアログで「削除」を選択</p>
                <div className="flex items-center space-x-2 bg-link rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 text-link-foreground" />
                  <p className="text-xs md:text-sm text-link-foreground">
                    警告: 削除は取り消せません。関連する予約データは保持されます。
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">一時的な無効化（推奨）</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. スタッフ編集画面 → 「有効/無効」スイッチをOFF</p>
                <p>2. 保存</p>
                <p>3. 予約画面でスタッフが選択できなくなります</p>
                <div className="flex items-center space-x-2 bg-link rounded-lg p-3">
                  <CheckCircle className="h-4 w-4 text-link-foreground" />
                  <p className="text-xs md:text-sm text-link-foreground">
                    データは保持され、再度有効化可能です
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <FaqCard
        title="よくある質問"
        faqs={[
          {
            question: 'スタッフが招待メールを受信できない',
            answer:
              'メールアドレスが正しいか確認し、迷惑メールフォルダをチェック。招待管理セクションから再送信も可能です。',
          },
          {
            question: '権限の違いがわからない',
            answer:
              'スタッフ（自分の予約・スケジュールのみ）、マネージャー（＋顧客管理・他スタッフ管理）、オーナー（＋設定・料金・全機能）',
          },
          {
            question: '退職したスタッフの扱い方',
            answer:
              '完全削除（データも含めて削除、復元不可）または無効化（データは残して予約受付を停止、推奨）を選択できます。',
          },
          {
            question: '優先度の使い方',
            answer:
              '数値が大きいほど予約画面で上位表示。同じ優先度の場合は指名料が安い順。ベテランスタッフを上位にする際に活用。',
          },
        ]}
      />

      {/* 推奨される運用方法 */}
      <Card>
        <CardHeader>
          <CardTitle>推奨される運用方法</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-accent-2-foreground rounded-lg">
              <h4 className="font-semibold text-accent-2 mb-2">定期的な情報更新</h4>
              <p className="text-sm text-accent-2">
                月1回はプロフィールを見直し、写真は3ヶ月ごとに更新推奨。
                自己紹介文やスキルタグも定期的に見直しましょう。
              </p>
            </div>
            <div className="p-4 bg-accent-2-foreground rounded-lg">
              <h4 className="font-semibold text-accent-2 mb-2">タグの活用例</h4>
              <p className="text-sm text-accent-2">
                スキル：「カラー専門」「パーマ得意」、 経験：「新人」「ベテラン」「店長」、
                特徴：「メンズ対応」「キッズカット可」
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* サポート情報 */}
      <Support />
    </div>
  )
}
