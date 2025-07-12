'use client'
import { Link } from '@/i18n/navigation'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { DashboardSection, Loading } from '@/components/common'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { useIntegratedReservations } from '@/hooks/useIntegratedReservations'
import { CustomerRepository } from '@/services/supabase/repositories/customer'
import { CarteRepository } from '@/services/supabase/repositories'
import type { RowType } from '@/services/supabase/SupabaseService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  HairWaveLevel,
  HairVolume,
  ScalpCondition,
  HairThickness,
  HairDamageTendency,
  HairDryness,
} from '@/services/supabase/repositories/carte/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import type { ReservationMenu, ReservationOption } from '@/convex/types'
import {
  CalendarDays,
  Pencil,
  User,
  Mail,
  Phone,
  CreditCard,
  ChevronDown,
  RefreshCw,
  CheckCircle,
  FileText,
  XCircle,
  AlertCircle,
  Zap,
  UserCheck,
  Scissors,
} from 'lucide-react'
import { format } from 'date-fns'
import { ja, enUS } from 'date-fns/locale'
import { toast } from 'sonner'
import type { SupportedLocale } from '@/lib/dateLocale'

type CartePageProps = {
  params: Promise<{
    customer_uid: string
  }>
}

type CustomerWithDetails = {
  customer: RowType<'customer'> | null
  customerDetail: RowType<'customer_detail'> | null
  customerPoints: RowType<'customer_points'> | null
}

export type CustomerCarteData = {
  skin_type: string | null
  hair_type: string | null
  allergy_history: string | null
  medical_history: string | null
  ltv_price: number | null
  // 🟢 顧客記入項目
  prefer_silence: boolean | null
  avoid_chemicals: string | null
  has_sensitive_skin: boolean | null
  sensitive_skin_detail: string | null
  fragrance_sensitivity: boolean | null
  use_contact_lenses: boolean | null
  avoid_sales_talk: boolean | null
  avoid_private_topics: boolean | null
  daily_styling_time: number | null
  allow_photo_sns: boolean | null
  // 🔵 店舗記入項目
  hair_thickness: HairThickness | null
  hair_volume: HairVolume | null
  hair_wave_level: HairWaveLevel | null
  hair_damage_tendency: HairDamageTendency | null
  poor_dye_perm_retention: boolean | null
  quick_color_fade: boolean | null
  hair_dryness: HairDryness | null
  scalp_condition: ScalpCondition | null
  scalp_trouble_detail: string | null
  // 🟡 共通記入項目
  prefer_hair_styling: boolean | null
  use_styling_product: boolean | null
}

export default function CartePage({ params: paramsPromise }: CartePageProps) {
  const tCommon = useTranslations('common')
  const tCarte = useTranslations('dashboard.carte')
  const locale = useLocale() as SupportedLocale
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()

  const [customerUid, setCustomerUid] = useState<string | null>(null)
  const [customerData, setCustomerData] = useState<CustomerWithDetails | null>(null)
  const [customerCarteData, setCustomerCarteData] = useState<CustomerCarteData | null>(null)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(true)

  const customerRepo = useMemo(() => new CustomerRepository(), [])
  const carteRepo = useMemo(() => new CarteRepository(), [])

  // paramsの解決
  useEffect(() => {
    paramsPromise.then((params) => {
      setCustomerUid(params.customer_uid)
    })
  }, [paramsPromise])

  // 顧客情報の取得
  const fetchCustomerData = useCallback(async () => {
    if (!tenantId || !orgId || !customerUid || !isLoaded) return

    console.log('fetchCustomerData')
    setIsLoadingCustomer(true)
    try {
      const completeData = await customerRepo.getCompleteCustomerData(customerUid, tenantId, orgId)

      if (completeData.customer) {
        setCustomerData(completeData)

        // カルテ情報の取得
        const carte = await carteRepo.findByCustomer(tenantId, orgId, customerUid)
        
        // カルテが存在しない場合でもデフォルト値を設定して表示
        const defaultCarteData: CustomerCarteData = {
          skin_type: null,
          hair_type: null,
          allergy_history: null,
          medical_history: null,
          ltv_price: null,
          // 🟢 顧客記入項目 - デフォルトは false (「いいえ」として表示)
          prefer_silence: false,
          avoid_chemicals: null,
          has_sensitive_skin: false,
          sensitive_skin_detail: null,
          fragrance_sensitivity: false,
          use_contact_lenses: false,
          avoid_sales_talk: false,
          avoid_private_topics: false,
          daily_styling_time: null,
          allow_photo_sns: false,
          // 🔵 店舗記入項目 - デフォルトは null
          hair_thickness: null,
          hair_volume: null,
          hair_wave_level: null,
          hair_damage_tendency: null,
          poor_dye_perm_retention: false,
          quick_color_fade: false,
          hair_dryness: null,
          scalp_condition: null,
          scalp_trouble_detail: null,
          // 🟡 共通記入項目 - デフォルトは false
          prefer_hair_styling: false,
          use_styling_product: false,
        }

        if (carte) {
          setCustomerCarteData({
            skin_type: carte.skin_type,
            hair_type: carte.hair_type,
            allergy_history: carte.allergy_history,
            medical_history: carte.medical_history,
            ltv_price: carte.ltv_price,
            // 🟢 顧客記入項目
            prefer_silence: carte.prefer_silence ?? false,
            avoid_chemicals: carte.avoid_chemicals,
            has_sensitive_skin: carte.has_sensitive_skin ?? false,
            sensitive_skin_detail: carte.sensitive_skin_detail,
            fragrance_sensitivity: carte.fragrance_sensitivity ?? false,
            use_contact_lenses: carte.use_contact_lenses ?? false,
            avoid_sales_talk: carte.avoid_sales_talk ?? false,
            avoid_private_topics: carte.avoid_private_topics ?? false,
            daily_styling_time: carte.daily_styling_time,
            allow_photo_sns: carte.allow_photo_sns ?? false,
            // 🔵 店舗記入項目
            hair_thickness: carte.hair_thickness,
            hair_volume: carte.hair_volume,
            hair_wave_level: carte.hair_wave_level as HairWaveLevel,
            hair_damage_tendency: carte.hair_damage_tendency as HairDamageTendency,
            poor_dye_perm_retention: carte.poor_dye_perm_retention ?? false,
            quick_color_fade: carte.quick_color_fade ?? false,
            hair_dryness: carte.hair_dryness as HairDryness,
            scalp_condition: carte.scalp_condition,
            scalp_trouble_detail: carte.scalp_trouble_detail,
            // 🟡 共通記入項目
            prefer_hair_styling: carte.prefer_hair_styling ?? false,
            use_styling_product: carte.use_styling_product ?? false,
          })
        } else {
          // カルテが存在しない場合はデフォルト値を設定
          setCustomerCarteData(defaultCarteData)
        }
      } else {
        toast.error(tCarte('detail.customerNotFound'))
      }
    } catch (error) {
      console.error('Failed to fetch customer data:', error)
      toast.error(tCarte('fetchError'))
    } finally {
      setIsLoadingCustomer(false)
    }
  }, [tenantId, orgId, customerUid, isLoaded, customerRepo, carteRepo, tCarte])

  // 統合予約データの取得
  const { reservations, loadMore, hasMore } = useIntegratedReservations({
    tenantId: tenantId || '',
    orgId: orgId || '',
    customerUid: customerUid || '',
    status: 'all',
    pageSize: 10,
  })

  // 初回データ取得
  useEffect(() => {
    console.log('useEffect')
    console.log('customerUid', customerUid)
    console.log('tenantId', tenantId)
    console.log('orgId', orgId)
    console.log('isLoaded', isLoaded)
    if (customerUid && tenantId && orgId && isLoaded) {
      console.log('fetchCustomerData')
      fetchCustomerData()
    }
  }, [customerUid, tenantId, orgId, isLoaded, fetchCustomerData])

  // 日付フォーマット
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return '-'
    return format(new Date(timestamp), 'yyyy年MM月dd日 HH:mm', {
      locale: locale === 'ja' ? ja : enUS,
    })
  }

  // 年齢計算
  const calculateAge = (birthday: string) => {
    const birthDate = new Date(birthday)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age
  }

  // 金額フォーマット
  const formatPrice = (price: number | null) => {
    if (!price) return '¥0'
    return `¥${price.toLocaleString()}`
  }

  // ステータスバッジの取得
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-link text-link-foreground">
            <CheckCircle className="w-3 h-3 mr-1" />
            {tCarte('detail.status.confirmed')}
          </Badge>
        )
      case 'completed':
        return (
          <Badge className="bg-accent-2 text-accent-2-foreground">
            <CheckCircle className="w-3 h-3 mr-1" />
            {tCarte('detail.status.completed')}
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            {tCarte('detail.status.cancelled')}
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            {tCarte('detail.status.pending')}
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!isLoaded || isLoadingCustomer) {
    return <Loading />
  }

  if (!customerData) {
    return (
      <DashboardSection
        title={tCarte('detail.title')}
        backLink="/dashboard/carte"
        backLinkTitle={tCarte('detail.backToSearch')}
      >
        <div className="text-center py-8 text-muted-foreground">
          {tCarte('detail.customerNotFound')}
        </div>
      </DashboardSection>
    )
  }

  return (
    <DashboardSection
      title={tCarte('detail.title')}
      backLink="/dashboard/carte"
      backLinkTitle={tCarte('detail.backToSearch')}
    >
      <div className="space-y-6">
        {/* 顧客基本情報 */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {tCarte('detail.customerInfo')}
            </CardTitle>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <Button variant="default" size="sm" asChild>
                <Link href={`/dashboard/customer/${customerUid}/edit`}>
                  {tCarte('detail.customerEdit')}
                  <UserCheck className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link href={`/dashboard/carte/${customerUid}/edit`}>
                  {tCarte('detail.edit')}
                  <Pencil className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{tCarte('detail.name')}</span>
                    <span>
                      {customerData.customer?.last_name && customerData.customer?.first_name
                        ? `${customerData.customer?.last_name} ${customerData.customer?.first_name}`
                        : tCarte('detail.notSet')}
                    </span>
                  </div>
                  <p className="font-medium">
                    {customerData.customer?.line_user_name ? (
                      <span className="text-sm text-muted-foreground">
                        LINE: {customerData.customer?.line_user_name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        LINE: {tCarte('detail.notSet')}
                      </span>
                    )}
                  </p>
                </div>

                {customerData.customer?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{customerData.customer?.email}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{customerData.customer?.phone || tCarte('detail.notSet')}</span>
                </div>
              </div>
              <div className="space-y-3">
                {customerData.customerDetail?.birthday && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      {tCarte('detail.birthday')}
                    </span>
                    <p className="font-medium">
                      {format(new Date(customerData.customerDetail.birthday), 'yyyy年MM月dd日')}
                      <span className="text-sm text-muted-foreground ml-2">
                        {tCarte('detail.age', {
                          age: calculateAge(customerData.customerDetail.birthday),
                        })}
                      </span>
                    </p>
                  </div>
                )}

                {customerData.customerPoints && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      {tCarte('detail.totalPoints')}
                    </span>
                    <p className="font-medium text-lg">
                      {tCarte('detail.pointsUnit', {
                        points: customerData.customerPoints.total_points || 0,
                      })}
                    </p>
                  </div>
                )}
                {customerCarteData?.ltv_price ? (
                  <div>
                    <span className="text-sm text-muted-foreground">{tCarte('detail.ltv')}</span>
                    <p className="font-medium text-lg">
                      {formatPrice(customerCarteData.ltv_price)}
                    </p>
                  </div>
                ) : null}

                <div>
                  <span className="text-sm text-muted-foreground">
                    {tCarte('detail.totalReservationCount')}
                  </span>
                  <p className="font-medium text-lg">
                    {customerData?.customer?.total_reservation_count ?? 0} 回
                  </p>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">{tCarte('detail.ltv')}</span>
                  <p className="font-medium text-lg">
                    ¥ {customerCarteData?.ltv_price?.toLocaleString() ?? 0}
                  </p>
                </div>

                {customerData.customer?.tags && customerData.customer.tags.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">{tCarte('table.tags')}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {customerData.customer.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* カルテ情報 */}
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {tCarte('detail.carteInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customerCarteData ? (
              <Tabs defaultValue="customer" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="customer" className="text-xs">
                    <UserCheck className="w-3 h-3 mr-1" />
                    {tCarte('edit.tabs.customer')}
                  </TabsTrigger>
                  <TabsTrigger value="store" className="text-xs">
                    <Scissors className="w-3 h-3 mr-1" />
                    {tCarte('edit.tabs.store')}
                  </TabsTrigger>
                  <TabsTrigger value="medical" className="text-xs">
                    <FileText className="w-3 h-3 mr-1" />
                    {tCarte('edit.tabs.medical')}
                  </TabsTrigger>
                </TabsList>

                {/* 🟢 顧客記入項目タブ */}
                <TabsContent value="customer">
                  <Card className="shadow-md border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserCheck className="w-5 h-5" />
                        {tCarte('edit.customerPrefs.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* 基本的な顧客設定を2列レイアウトでコンパクトに */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.customerPrefs.preferSilence')}
                          </span>
                          <p className="text-sm mt-1">
                            {customerCarteData.prefer_silence === true ? 'はい' : 'いいえ'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.customerPrefs.avoidSalesTalk')}
                          </span>
                          <p className="text-sm mt-1">
                            {customerCarteData.avoid_sales_talk === true ? 'はい' : 'いいえ'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.customerPrefs.avoidPrivateTopics')}
                          </span>
                          <p className="text-sm mt-1">
                            {customerCarteData.avoid_private_topics === true ? 'はい' : 'いいえ'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.customerPrefs.allowPhotoSns')}
                          </span>
                          <p className="text-sm mt-1">
                            {customerCarteData.allow_photo_sns === true ? 'はい' : 'いいえ'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.sharedPrefs.preferHairStyling')}
                          </span>
                          <p className="text-sm mt-1">
                            {customerCarteData.prefer_hair_styling === true ? 'はい' : 'いいえ'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.sharedPrefs.useStylingProduct')}
                          </span>
                          <p className="text-sm mt-1">
                            {customerCarteData.use_styling_product === true ? 'はい' : 'いいえ'}
                          </p>
                        </div>
                      </div>

                      {customerCarteData.daily_styling_time && (
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.customerPrefs.dailyStylingTime')}
                          </span>
                          <p className="text-sm mt-1">{customerCarteData.daily_styling_time}分</p>
                        </div>
                      )}

                      {customerCarteData.avoid_chemicals && (
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.customerPrefs.avoidChemicals')}
                          </span>
                          <p className="text-sm mt-1 whitespace-pre-wrap">
                            {customerCarteData.avoid_chemicals}
                          </p>
                        </div>
                      )}

                      <Separator />

                      {/* 敏感肌・アレルギー関連 */}
                      <div>
                        <h3 className="text-lg font-medium mb-3">
                          {tCarte('edit.sharedPrefs.sensitivitySection')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <span className="text-sm font-semibold text-muted-foreground">
                              {tCarte('edit.sharedPrefs.hasSensitiveSkin')}
                            </span>
                            <p className="text-sm mt-1">
                              {customerCarteData.has_sensitive_skin === true ? 'はい' : 'いいえ'}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-muted-foreground">
                              {tCarte('edit.sharedPrefs.fragranceSensitivity')}
                            </span>
                            <p className="text-sm mt-1">
                              {customerCarteData.fragrance_sensitivity === true ? 'はい' : 'いいえ'}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-muted-foreground">
                              {tCarte('edit.sharedPrefs.useContactLenses')}
                            </span>
                            <p className="text-sm mt-1">
                              {customerCarteData.use_contact_lenses === true ? 'はい' : 'いいえ'}
                            </p>
                          </div>
                        </div>
                        {customerCarteData.sensitive_skin_detail && (
                          <div className="mt-3">
                            <span className="text-sm font-semibold text-muted-foreground">
                              {tCarte('edit.sharedPrefs.sensitiveSkinDetail')}
                            </span>
                            <p className="text-sm mt-1 whitespace-pre-wrap">
                              {customerCarteData.sensitive_skin_detail}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 🔵 店舗記入項目タブ */}
                <TabsContent value="store">
                  <Card className="shadow-md border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Scissors className="w-5 h-5" />
                        {tCarte('edit.storeAssessment.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.storeAssessment.hairThickness')}
                          </span>
                          <p className="mt-1">
                            {customerCarteData.hair_thickness === 'fine'
                              ? tCarte('edit.hairThickness.fine')
                              : customerCarteData.hair_thickness === 'medium'
                                ? tCarte('edit.hairThickness.medium')
                                : customerCarteData.hair_thickness === 'coarse'
                                  ? tCarte('edit.hairThickness.coarse')
                                  : tCarte('detail.notSet')}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.storeAssessment.hairVolume')}
                          </span>
                          <p className="mt-1">
                            {customerCarteData.hair_volume === 'low'
                              ? tCarte('edit.hairVolume.low')
                              : customerCarteData.hair_volume === 'medium'
                                ? tCarte('edit.hairVolume.medium')
                                : customerCarteData.hair_volume === 'high'
                                  ? tCarte('edit.hairVolume.high')
                                  : tCarte('detail.notSet')}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.storeAssessment.hairWaveLevel')}
                          </span>
                          <p className="mt-1">
                            {customerCarteData.hair_wave_level === 'straight'
                              ? tCarte('edit.hairWaveLevel.straight')
                              : customerCarteData.hair_wave_level === 'slight'
                                ? tCarte('edit.hairWaveLevel.slight')
                                : customerCarteData.hair_wave_level === 'moderate'
                                  ? tCarte('edit.hairWaveLevel.moderate')
                                  : customerCarteData.hair_wave_level === 'strong'
                                    ? tCarte('edit.hairWaveLevel.strong')
                                    : tCarte('detail.notSet')}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.storeAssessment.hairDamageTendency')}
                          </span>
                          <p className="mt-1">
                            {customerCarteData.hair_damage_tendency === 'strong'
                              ? '強い'
                              : customerCarteData.hair_damage_tendency === 'medium'
                                ? '中程度'
                                : customerCarteData.hair_damage_tendency === 'weak'
                                  ? '弱い'
                                  : tCarte('detail.notSet')}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.storeAssessment.poorDyePerm')}
                          </span>
                          <p className="mt-1">
                            {customerCarteData.poor_dye_perm_retention === true ? 'はい' : 'いいえ'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.storeAssessment.quickColorFade')}
                          </span>
                          <p className="mt-1">
                            {customerCarteData.quick_color_fade === true ? 'はい' : 'いいえ'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.storeAssessment.hairDryness')}
                          </span>
                          <p className="mt-1">
                            {customerCarteData.hair_dryness === 'high'
                              ? '高い'
                              : customerCarteData.hair_dryness === 'medium'
                                ? '中程度'
                                : customerCarteData.hair_dryness === 'low'
                                  ? '低い'
                                  : tCarte('detail.notSet')}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <span className="text-sm font-semibold text-muted-foreground">
                          {tCarte('edit.storeAssessment.scalpCondition')}
                        </span>
                        <p className="mt-1">
                          {customerCarteData.scalp_condition === 'normal'
                            ? tCarte('edit.scalpCondition.normal')
                            : customerCarteData.scalp_condition === 'dry'
                              ? tCarte('edit.scalpCondition.dry')
                              : customerCarteData.scalp_condition === 'oily'
                                ? tCarte('edit.scalpCondition.oily')
                                : customerCarteData.scalp_condition === 'sensitive'
                                  ? tCarte('edit.scalpCondition.sensitive')
                                  : tCarte('detail.notSet')}
                        </p>
                      </div>
                      {customerCarteData.scalp_trouble_detail && (
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {tCarte('edit.storeAssessment.scalpTroubleDetail')}
                          </span>
                          <p className="mt-1">{customerCarteData.scalp_trouble_detail}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 医療情報タブ */}
                <TabsContent value="medical">
                  <Card className="shadow-md border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        {tCarte('edit.medicalInfo.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <span className="text-sm font-semibold text-muted-foreground">
                          {tCarte('edit.medicalInfo.allergyHistory')}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">
                          {customerCarteData.allergy_history || tCarte('detail.notSet')}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-muted-foreground">
                          {tCarte('edit.medicalInfo.medicalHistory')}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">
                          {customerCarteData.medical_history || tCarte('detail.notSet')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {tCarte('detail.loadingCarteInfo')}
                </div>
              )}
            </CardContent>
          </Card>

        {/* 施術履歴 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              {tCarte('detail.reservationHistory')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {reservations.length > 0 ? (
                reservations
                  .filter(
                    (item) =>
                      item.status !== 'cancelled' &&
                      item.status !== 'pending' &&
                      item.status !== 'refunded'
                  )
                  .map((item) => (
                    <Link
                      href={`/dashboard/carte/${customerUid}/reservation/${item.id}`}
                      key={item.id}
                    >
                      <Card
                        key={item.id}
                        className="border-l-4 relative"
                        style={{
                          borderLeftColor:
                            item.status === 'completed'
                              ? 'accent-green-500'
                              : item.status === 'cancelled'
                                ? 'destructive'
                                : item.status === 'confirmed'
                                  ? 'neon'
                                  : 'secondary',
                        }}
                      >
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {formatDate(item.startTimeUnix)}
                                </span>
                                {/* リアルタイムインジケーター */}
                                {item.source === 'convex' && (
                                  <Badge variant="outline" className="gap-1 text-xs bg-warning">
                                    <Zap className="w-3 h-3 text-warning-foreground" />
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {tCarte('detail.assignedStaff', {
                                    staffName: item.staffName || tCarte('detail.staffFree'),
                                  })}
                                </span>
                              </div>
                            </div>
                            {getStatusBadge(item.status)}
                          </div>
                          {item.detail && (
                            <div className="mt-3 space-y-2">
                              {/* メニュー情報 */}
                              {item.detail.menus &&
                                Array.isArray(item.detail.menus) &&
                                item.detail.menus.length > 0 && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">
                                      {tCarte('detail.menu')}
                                    </span>
                                    <div className="mt-1">
                                      {(item.detail.menus as ReservationMenu[]).map(
                                        (menu: ReservationMenu, index: number) => (
                                          <Badge key={index} variant="outline" className="mr-1">
                                            {menu.name}
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* オプション情報 */}
                              {item.detail.options &&
                                Array.isArray(item.detail.options) &&
                                item.detail.options.length > 0 && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">
                                      {tCarte('detail.option')}
                                    </span>
                                    <div className="mt-1">
                                      {(item.detail.options as ReservationOption[]).map(
                                        (option: ReservationOption, index: number) => (
                                          <Badge
                                            key={index}
                                            variant="secondary"
                                            className="mr-1 text-xs"
                                          >
                                            {option.name}
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* 料金情報 */}
                              <div className="flex items-center justify-between pt-2 border-t">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {item.detail.paymentMethod === 'cash'
                                      ? tCarte('detail.paymentMethod.cash')
                                      : tCarte('detail.paymentMethod.card')}
                                  </span>
                                </div>
                                <span className="font-semibold">
                                  {formatPrice(item.detail.totalPrice || 0)}
                                </span>
                              </div>

                              {/* 備考 */}
                              {item.detail.notes && (
                                <div className="text-sm text-muted-foreground">
                                  {tCarte('detail.notes', { notes: item.detail.notes })}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {tCarte('detail.noReservationHistory')}
                </div>
              )}

              {hasMore && (
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={loadMore}
                    variant="outline"
                    className="gap-2"
                    disabled={!hasMore}
                  >
                    <span>{tCommon('loadMore')}</span>
                    {hasMore ? (
                      <ChevronDown size={16} />
                    ) : (
                      <RefreshCw size={16} className="animate-spin" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardSection>
  )
}
