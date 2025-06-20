'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
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

// バリデーションスキーマを作成する関数
const createCarteEditSchema = (t: ReturnType<typeof useTranslations>) =>
  z.object({
    skin_type: z.string().nullable().optional(),
    hair_type: z.string().nullable().optional(),
    allergy_history: z.string().max(1000, t('edit.validation.maxLength')).nullable().optional(),
    medical_history: z.string().max(1000, t('edit.validation.maxLength')).nullable().optional(),
  })

type CarteEditFormData = {
  skin_type?: string | null
  hair_type?: string | null
  allergy_history?: string | null
  medical_history?: string | null
}

type CustomerWithDetails = {
  customer: RowType<'customer'> | null
  customerDetail: RowType<'customer_detail'> | null
  customerPoints: RowType<'customer_points'> | null
}

// 選択肢を作成する関数
const getSkinTypeOptions = (t: ReturnType<typeof useTranslations>) => [
  { value: 'normal', label: t('edit.skinTypes.normal') },
  { value: 'dry', label: t('edit.skinTypes.dry') },
  { value: 'oily', label: t('edit.skinTypes.oily') },
  { value: 'combination', label: t('edit.skinTypes.combination') },
  { value: 'sensitive', label: t('edit.skinTypes.sensitive') },
]

const getHairTypeOptions = (t: ReturnType<typeof useTranslations>) => [
  { value: 'straight', label: t('edit.hairTypes.straight') },
  { value: 'wavy', label: t('edit.hairTypes.wavy') },
  { value: 'curly', label: t('edit.hairTypes.curly') },
  { value: 'coily', label: t('edit.hairTypes.coily') },
  { value: 'fine', label: t('edit.hairTypes.fine') },
  { value: 'thick', label: t('edit.hairTypes.thick') },
]

export default function CustomerCarteEditForm() {
  const router = useRouter()
  const { customer_id } = useParams()
  const tCarte = useTranslations('dashboard.carte')
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()

  // 翻訳を使ったスキーマと選択肢を作成
  const carteEditSchema = useMemo(() => createCarteEditSchema(tCarte), [tCarte])
  const SKIN_TYPE_OPTIONS = useMemo(() => getSkinTypeOptions(tCarte), [tCarte])
  const HAIR_TYPE_OPTIONS = useMemo(() => getHairTypeOptions(tCarte), [tCarte])

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
        toast.error(tCarte('edit.customerNotFound'))
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
      toast.error(tCarte('edit.fetchError'))
    } finally {
      setIsLoadingData(false)
    }
  }, [tenantId, orgId, customer_id, customerRepo, carteRepo, reset, router, tCarte])

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
        toast.success(tCarte('edit.updateSuccess'))
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
        toast.success(tCarte('edit.createSuccess'))
      }

      router.push(`/dashboard/carte/${customer_id}`)
    } catch (error) {
      console.error('Failed to save carte:', error)
      toast.error(tCarte('edit.saveError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  console.log('Loading check:', { isLoaded, isLoadingData })

  if (!isLoaded || isLoadingData) {
    return <Loading />
  }

  if (!customerData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {tCarte('edit.customerNotFound')}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">{tCarte('edit.tabs.basic')}</TabsTrigger>
          <TabsTrigger value="medical">{tCarte('edit.tabs.medical')}</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card className="shadow-md border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {tCarte('edit.basicInfo.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 顧客名表示（編集不可） */}
              <div className="bg-muted p-4 rounded-lg">
                <Label className="text-sm text-muted-foreground mb-1">
                  {tCarte('edit.basicInfo.customerName')}
                </Label>
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
                    {tCarte('edit.basicInfo.skinType')}
                  </Label>
                  <Select
                    value={watch('skin_type') || 'none'}
                    onValueChange={(value) =>
                      setValue('skin_type', value === 'none' ? null : value, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tCarte('edit.basicInfo.skinTypePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tCarte('edit.basicInfo.notSet')}</SelectItem>
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
                    {tCarte('edit.basicInfo.hairType')}
                  </Label>
                  <Select
                    value={watch('hair_type') || 'none'}
                    onValueChange={(value) =>
                      setValue('hair_type', value === 'none' ? null : value, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tCarte('edit.basicInfo.hairTypePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tCarte('edit.basicInfo.notSet')}</SelectItem>
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
                {tCarte('edit.medicalInfo.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* アレルギー履歴 */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  {tCarte('edit.medicalInfo.allergyHistory')}
                </Label>
                <Textarea
                  {...register('allergy_history')}
                  placeholder={tCarte('edit.medicalInfo.allergyPlaceholder')}
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
                  {tCarte('edit.medicalInfo.medicalHistory')}
                </Label>
                <Textarea
                  {...register('medical_history')}
                  placeholder={tCarte('edit.medicalInfo.medicalPlaceholder')}
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
          {tCarte('edit.buttons.back')}
        </Button>

        <Button
          type="submit"
          disabled={isSubmitting || (!carteData && !isDirty)}
          className="flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {carteData ? tCarte('edit.buttons.updating') : tCarte('edit.buttons.creating')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {carteData ? tCarte('edit.buttons.update') : tCarte('edit.buttons.create')}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
