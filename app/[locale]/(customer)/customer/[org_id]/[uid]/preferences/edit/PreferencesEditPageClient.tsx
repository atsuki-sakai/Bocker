'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { ArrowLeft, Save, Settings } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CarteRepository } from '@/services/supabase/repositories'
import type { RowType } from '@/services/supabase/SupabaseService'

// フォームのバリデーションスキーマ
const preferencesFormSchema = z.object({
  // 🟢 顧客記入項目
  prefer_silence: z.boolean().nullable().optional(),
  avoid_chemicals: z.string().max(500).optional(),
  has_sensitive_skin: z.boolean().nullable().optional(),
  sensitive_skin_detail: z.string().max(500).optional(),
  fragrance_sensitivity: z.boolean().nullable().optional(),
  use_contact_lenses: z.boolean().nullable().optional(),
  avoid_sales_talk: z.boolean().nullable().optional(),
  avoid_private_topics: z.boolean().nullable().optional(),
  daily_styling_time: z.number().min(0).max(120).nullable().optional(),
  allow_photo_sns: z.boolean().nullable().optional(),
  prefer_hair_styling: z.boolean().nullable().optional(),
  use_styling_product: z.boolean().nullable().optional(),
})

type PreferencesFormData = z.infer<typeof preferencesFormSchema>

interface PreferencesEditPageClientProps {
  orgId: string
  customerUid: string
  tenantId: string
  sessionOrgId: string
  initialData: {
    carte: RowType<'carte'> | null
  }
}

export function PreferencesEditPageClient({
  orgId,
  customerUid,
  tenantId,
  sessionOrgId,
  initialData,
}: PreferencesEditPageClientProps) {
  const router = useRouter()
  const { showErrorToast } = useErrorHandler()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesFormSchema),
  })

  // 初期データの設定
  useEffect(() => {
    const { carte } = initialData

    // カルテデータの設定（デフォルト値を適用）
    setValue('prefer_silence', carte?.prefer_silence ?? false)
    setValue('avoid_chemicals', carte?.avoid_chemicals || '')
    setValue('has_sensitive_skin', carte?.has_sensitive_skin ?? false)
    setValue('sensitive_skin_detail', carte?.sensitive_skin_detail || '')
    setValue('fragrance_sensitivity', carte?.fragrance_sensitivity ?? false)
    setValue('use_contact_lenses', carte?.use_contact_lenses ?? false)
    setValue('avoid_sales_talk', carte?.avoid_sales_talk ?? false)
    setValue('avoid_private_topics', carte?.avoid_private_topics ?? false)
    setValue('daily_styling_time', carte?.daily_styling_time)
    setValue('allow_photo_sns', carte?.allow_photo_sns ?? false)
    setValue('prefer_hair_styling', carte?.prefer_hair_styling ?? false)
    setValue('use_styling_product', carte?.use_styling_product ?? false)
  }, [initialData, setValue])

  const onSubmit = async (data: PreferencesFormData) => {
    setIsSubmitting(true)

    try {
      const carteRepo = new CarteRepository()

      // カルテ情報の更新または作成
      const { carte } = initialData
      if (carte) {
        // 既存のカルテを更新
        await carteRepo.updateCarte(carte.id, {
          prefer_silence: data.prefer_silence || null,
          avoid_chemicals: data.avoid_chemicals || null,
          has_sensitive_skin: data.has_sensitive_skin || null,
          sensitive_skin_detail: data.sensitive_skin_detail || null,
          fragrance_sensitivity: data.fragrance_sensitivity || null,
          use_contact_lenses: data.use_contact_lenses || null,
          avoid_sales_talk: data.avoid_sales_talk || null,
          avoid_private_topics: data.avoid_private_topics || null,
          daily_styling_time: data.daily_styling_time || null,
          allow_photo_sns: data.allow_photo_sns || null,
          prefer_hair_styling: data.prefer_hair_styling || null,
          use_styling_product: data.use_styling_product || null,
        })
      } else {
        // 新規カルテを作成
        await carteRepo.createCarte({
          tenant_id: tenantId,
          org_id: sessionOrgId,
          customer_uid: customerUid,
          ltv_price: 0, // デフォルト値
          skin_type: null,
          hair_type: null,
          allergy_history: null,
          medical_history: null,
          prefer_silence: data.prefer_silence || null,
          avoid_chemicals: data.avoid_chemicals || null,
          has_sensitive_skin: data.has_sensitive_skin || null,
          sensitive_skin_detail: data.sensitive_skin_detail || null,
          fragrance_sensitivity: data.fragrance_sensitivity || null,
          use_contact_lenses: data.use_contact_lenses || null,
          avoid_sales_talk: data.avoid_sales_talk || null,
          avoid_private_topics: data.avoid_private_topics || null,
          daily_styling_time: data.daily_styling_time || null,
          allow_photo_sns: data.allow_photo_sns || null,
          prefer_hair_styling: data.prefer_hair_styling || null,
          use_styling_product: data.use_styling_product || null,
          // 店舗記入項目はnullで初期化
          hair_thickness: null,
          hair_volume: null,
          hair_wave_level: null,
          hair_damage_tendency: null,
          poor_dye_perm_retention: null,
          quick_color_fade: null,
          hair_dryness: null,
          scalp_condition: null,
          scalp_trouble_detail: null,
        })
      }

      toast.success('施術の設定を更新しました')
      router.push(`/customer/${orgId}/${customerUid}/preferences`)
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4">
        <Link href={`/customer/${orgId}/${customerUid}/preferences`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold text-primary">施術設定の編集</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              施術に関するご希望
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 基本的な顧客設定を2列レイアウトでコンパクトに */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="prefer_silence"
                  checked={watch('prefer_silence') || false}
                  onCheckedChange={(checked) =>
                    setValue('prefer_silence', checked === true ? true : null)
                  }
                />
                <Label htmlFor="prefer_silence">静かな施術を希望</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="avoid_sales_talk"
                  checked={watch('avoid_sales_talk') || false}
                  onCheckedChange={(checked) =>
                    setValue('avoid_sales_talk', checked === true ? true : null)
                  }
                />
                <Label htmlFor="avoid_sales_talk">セールストークは控えめに</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="avoid_private_topics"
                  checked={watch('avoid_private_topics') || false}
                  onCheckedChange={(checked) =>
                    setValue('avoid_private_topics', checked === true ? true : null)
                  }
                />
                <Label htmlFor="avoid_private_topics">プライベートな話題を避ける</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allow_photo_sns"
                  checked={watch('allow_photo_sns') || false}
                  onCheckedChange={(checked) =>
                    setValue('allow_photo_sns', checked === true ? true : null)
                  }
                />
                <Label htmlFor="allow_photo_sns">写真撮影・SNS掲載を許可</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="prefer_hair_styling"
                  checked={watch('prefer_hair_styling') || false}
                  onCheckedChange={(checked) =>
                    setValue('prefer_hair_styling', checked === true ? true : null)
                  }
                />
                <Label htmlFor="prefer_hair_styling">ヘアスタイリングを希望</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use_styling_product"
                  checked={watch('use_styling_product') || false}
                  onCheckedChange={(checked) =>
                    setValue('use_styling_product', checked === true ? true : null)
                  }
                />
                <Label htmlFor="use_styling_product">スタイリング製品を使用</Label>
              </div>
            </div>

            {/* スタイリング時間 */}
            <div>
              <Label className="mb-2 block">毎日のスタイリング時間</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="0"
                  max="120"
                  {...register('daily_styling_time', {
                    setValueAs: (value) => (value === '' ? null : parseInt(value, 10)),
                  })}
                  placeholder="30"
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">分</span>
              </div>
            </div>

            {/* 避けたい薬剤・成分 */}
            <div>
              <Label className="mb-2 block">避けたい薬剤・成分</Label>
              <Textarea
                {...register('avoid_chemicals')}
                placeholder="アレルギーのある薬剤や避けたい成分があればご記入ください"
                rows={3}
              />
            </div>

            <Separator />

            {/* 敏感肌・アレルギー関連 */}
            <div>
              <h3 className="text-lg font-medium mb-3">敏感肌・アレルギー関連</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_sensitive_skin"
                    checked={watch('has_sensitive_skin') || false}
                    onCheckedChange={(checked) =>
                      setValue('has_sensitive_skin', checked === true ? true : null)
                    }
                  />
                  <Label htmlFor="has_sensitive_skin">敏感肌</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fragrance_sensitivity"
                    checked={watch('fragrance_sensitivity') || false}
                    onCheckedChange={(checked) =>
                      setValue('fragrance_sensitivity', checked === true ? true : null)
                    }
                  />
                  <Label htmlFor="fragrance_sensitivity">香りに敏感</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use_contact_lenses"
                    checked={watch('use_contact_lenses') || false}
                    onCheckedChange={(checked) =>
                      setValue('use_contact_lenses', checked === true ? true : null)
                    }
                  />
                  <Label htmlFor="use_contact_lenses">コンタクトレンズ使用</Label>
                </div>
              </div>

              {/* 敏感肌詳細 */}
              {watch('has_sensitive_skin') && (
                <div className="mt-4">
                  <Label className="mb-2 block">敏感肌の詳細</Label>
                  <Textarea
                    {...register('sensitive_skin_detail')}
                    placeholder="敏感肌の症状や注意点があればご記入ください"
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* ボタン */}
            <div className="flex justify-end space-x-2 pt-4">
              <Link href={`/customer/${orgId}/${customerUid}/preferences`}>
                <Button type="button" variant="outline">
                  キャンセル
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">●</span>
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}