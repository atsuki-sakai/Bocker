'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Settings, Edit } from 'lucide-react'
import Link from 'next/link'
import type { RowType } from '@/services/supabase/SupabaseService'

interface PreferencesPageClientProps {
  orgId: string
  customerUid: string
  carte: RowType<'carte'> | null
}

export function PreferencesPageClient({
  orgId,
  customerUid,
  carte,
}: PreferencesPageClientProps) {
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">施術設定</h2>
        <Button asChild>
          <Link href={`/customer/${orgId}/${customerUid}/preferences/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            編集
          </Link>
        </Button>
      </div>

      {/* 設定内容 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            施術に関するご希望
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* デフォルト値を使用して常に設定内容を表示 */}
          <>
            {/* 基本的な顧客設定を2列レイアウトでコンパクトに */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  静かな施術を希望
                </span>
                <p className="text-sm mt-1">
                  {(carte?.prefer_silence ?? false) === true ? 'はい' : 'いいえ'}
                </p>
              </div>
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  セールストークは控えめに
                </span>
                <p className="text-sm mt-1">
                  {(carte?.avoid_sales_talk ?? false) === true ? 'はい' : 'いいえ'}
                </p>
              </div>
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  プライベートな話題を避ける
                </span>
                <p className="text-sm mt-1">
                  {(carte?.avoid_private_topics ?? false) === true ? 'はい' : 'いいえ'}
                </p>
              </div>
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  写真撮影・SNS掲載を許可
                </span>
                <p className="text-sm mt-1">
                  {(carte?.allow_photo_sns ?? false) === true ? 'はい' : 'いいえ'}
                </p>
              </div>
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  ヘアスタイリングを希望
                </span>
                <p className="text-sm mt-1">
                  {(carte?.prefer_hair_styling ?? false) === true ? 'はい' : 'いいえ'}
                </p>
              </div>
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  スタイリング製品を使用
                </span>
                <p className="text-sm mt-1">
                  {(carte?.use_styling_product ?? false) === true ? 'はい' : 'いいえ'}
                </p>
              </div>
            </div>

            {carte?.daily_styling_time && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  毎日のスタイリング時間
                </span>
                <p className="text-sm mt-1">{carte.daily_styling_time}分</p>
              </div>
            )}

            {carte?.avoid_chemicals && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  避けたい薬剤・成分
                </span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{carte.avoid_chemicals}</p>
              </div>
            )}

            <Separator />

            {/* 敏感肌・アレルギー関連 */}
            <div>
              <h3 className="text-lg font-medium mb-3">敏感肌・アレルギー関連</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <span className="text-sm font-semibold text-muted-foreground">
                    敏感肌
                  </span>
                  <p className="text-sm mt-1">
                    {(carte?.has_sensitive_skin ?? false) === true ? 'はい' : 'いいえ'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-semibold text-muted-foreground">
                    香りに敏感
                  </span>
                  <p className="text-sm mt-1">
                    {(carte?.fragrance_sensitivity ?? false) === true ? 'はい' : 'いいえ'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-semibold text-muted-foreground">
                    コンタクトレンズ使用
                  </span>
                  <p className="text-sm mt-1">
                    {(carte?.use_contact_lenses ?? false) === true ? 'はい' : 'いいえ'}
                  </p>
                </div>
              </div>
              {carte?.sensitive_skin_detail && (
                <div className="mt-3">
                  <span className="text-sm font-semibold text-muted-foreground">
                    敏感肌の詳細
                  </span>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{carte.sensitive_skin_detail}</p>
                </div>
              )}

              {/* カルテが存在しない場合のメッセージ */}
              {!carte && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground text-center">
                    現在はすべて「いいえ」に設定されています。
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    「編集」ボタンから設定を変更できます。
                  </p>
                </div>
              )}
            </div>
          </>
        </CardContent>
      </Card>
    </div>
  )
}