'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { useZodForm } from '@/hooks/useZodForm'
import { Loading } from '@/components/common'
import { CustomerRepository, CarteRepository } from '@/services/supabase/repositories'
import type { RowType } from '@/services/supabase/SupabaseService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  User,
  Save,
  ArrowLeft,
  Heart,
  Sparkles,
  AlertTriangle,
  FileText,
  Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// バリデーションスキーマ
const carteEditSchema = z.object({
  skin_type: z.string().nullable().optional(),
  hair_type: z.string().nullable().optional(),
  allergy_history: z.string().max(1000, '1000文字以内で入力してください').nullable().optional(),
  medical_history: z.string().max(1000, '1000文字以内で入力してください').nullable().optional(),
})

type CarteEditFormData = z.infer<typeof carteEditSchema>

type CustomerWithDetails = {
  customer: RowType<'customer'> | null
  customerDetail: RowType<'customer_detail'> | null
  customerPoints: RowType<'customer_points'> | null
}

// 肌質の選択肢
const SKIN_TYPE_OPTIONS = [
  { value: 'normal', label: '普通肌' },
  { value: 'dry', label: '乾燥肌' },
  { value: 'oily', label: '脂性肌' },
  { value: 'combination', label: '混合肌' },
  { value: 'sensitive', label: '敏感肌' },
]

// 髪質の選択肢
const HAIR_TYPE_OPTIONS = [
  { value: 'straight', label: 'ストレート' },
  { value: 'wavy', label: 'ウェーブ' },
  { value: 'curly', label: 'カーリー' },
  { value: 'coily', label: 'コイリー' },
  { value: 'fine', label: '細い' },
  { value: 'thick', label: '太い' },
]

export default function CustomerCarteEditForm() {
  const router = useRouter()
  const { customer_id } = useParams()
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()

  const [customerData, setCustomerData] = useState<CustomerWithDetails | null>(null)
  const [carteData, setCarteData] = useState<RowType<'carte'> | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const customerRepo = useMemo(() => new CustomerRepository(), [])
  const carteRepo = useMemo(() => new CarteRepository(), [])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
    watch,
  } = useZodForm(carteEditSchema)

  // 顧客データとカルテデータの取得
  const fetchData = useCallback(async () => {
    console.log('fetchData called:', { tenantId, orgId, customer_id })
    if (!tenantId || !orgId || !customer_id) {
      console.log('fetchData early return - missing required data')
      return
    }

    setIsLoadingData(true)
    try {
      // 顧客情報の取得
      const completeData = await customerRepo.getCompleteCustomerData(
        customer_id as string,
        tenantId,
        orgId
      )

      if (!completeData.customer) {
        toast.error('顧客情報が見つかりません')
        router.push('/dashboard/carte')
        return
      }

      setCustomerData(completeData)

      // カルテ情報の取得
      const carte = await carteRepo.findByCustomer(tenantId, orgId, customer_id as string)

      if (carte) {
        // 既存のカルテがある場合
        setCarteData(carte)
        reset({
          skin_type: carte.skin_type,
          hair_type: carte.hair_type,
          allergy_history: carte.allergy_history,
          medical_history: carte.medical_history,
        })
      } else {
        // カルテが存在しない場合は初期値を設定
        setCarteData(null)
        reset({
          skin_type: null,
          hair_type: null,
          allergy_history: null,
          medical_history: null,
        })
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('データの取得に失敗しました')
    } finally {
      setIsLoadingData(false)
    }
  }, [tenantId, orgId, customer_id, customerRepo, carteRepo, reset, router])

  // 初回データ取得
  useEffect(() => {
    console.log('useEffect conditions:', { isLoaded, customer_id, tenantId, orgId })
    if (isLoaded && customer_id && tenantId && orgId) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, customer_id, tenantId, orgId])

  // フォーム送信処理
  const onSubmit = async (data: CarteEditFormData) => {
    if (!tenantId || !orgId || !customer_id) return

    setIsSubmitting(true)
    try {
      if (carteData) {
        // 既存のカルテを更新
        await carteRepo.updateCarte(carteData.id, {
          skin_type: data.skin_type || null,
          hair_type: data.hair_type || null,
          allergy_history: data.allergy_history || null,
          medical_history: data.medical_history || null,
        })
        toast.success('カルテ情報を更新しました')
      } else {
        // 新規カルテを作成
        await carteRepo.createCarte({
          tenant_id: tenantId,
          org_id: orgId,
          customer_id: customer_id as string,
          skin_type: data.skin_type || null,
          hair_type: data.hair_type || null,
          allergy_history: data.allergy_history || null,
          medical_history: data.medical_history || null,
        })
        toast.success('カルテを作成しました')
      }

      router.push(`/dashboard/carte/${customer_id}`)
    } catch (error) {
      console.error('Failed to save carte:', error)
      toast.error('カルテの保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  console.log('Loading check:', { isLoaded, isLoadingData })

  if (!isLoaded || isLoadingData) {
    return <Loading />
  }

  if (!customerData) {
    return <div className="text-center py-8 text-muted-foreground">顧客データが見つかりません</div>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">基本情報</TabsTrigger>
          <TabsTrigger value="medical">医療情報</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card className="shadow-md border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                顧客基本情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 顧客名表示（編集不可） */}
              <div className="bg-muted p-4 rounded-lg">
                <Label className="text-sm text-muted-foreground mb-1">顧客名</Label>
                <p className="font-medium text-lg">
                  {customerData.customer?.last_name} {customerData.customer?.first_name}
                </p>
                {customerData.customer?.email && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {customerData.customer.email}
                  </p>
                )}
              </div>

              <Separator />

              {/* 肌質・髪質 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    肌質
                  </Label>
                  <Select
                    value={watch('skin_type') || 'none'}
                    onValueChange={(value) =>
                      setValue('skin_type', value === 'none' ? null : value, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="肌質を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">未設定</SelectItem>
                      {SKIN_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                    髪質
                  </Label>
                  <Select
                    value={watch('hair_type') || 'none'}
                    onValueChange={(value) =>
                      setValue('hair_type', value === 'none' ? null : value, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="髪質を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">未設定</SelectItem>
                      {HAIR_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical">
          <Card className="shadow-md border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                医療情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* アレルギー履歴 */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  アレルギー履歴
                </Label>
                <Textarea
                  {...register('allergy_history')}
                  placeholder="例: 金属アレルギー、化粧品アレルギーなど"
                  rows={4}
                  className="transition-all duration-200"
                />
                {errors.allergy_history && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive mt-1"
                  >
                    {errors.allergy_history.message}
                  </motion.p>
                )}
              </div>

              {/* 病歴 */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  病歴・既往症
                </Label>
                <Textarea
                  {...register('medical_history')}
                  placeholder="例: アトピー性皮膚炎、高血圧など"
                  rows={4}
                  className="transition-all duration-200"
                />
                {errors.medical_history && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive mt-1"
                  >
                    {errors.medical_history.message}
                  </motion.p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* フォームボタン */}
      <div className="flex justify-between py-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/dashboard/carte/${customer_id}`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          戻る
        </Button>

        <Button
          type="submit"
          disabled={isSubmitting || (!carteData && !isDirty)}
          className="flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {carteData ? '更新中...' : '作成中...'}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {carteData ? '更新する' : '作成する'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
