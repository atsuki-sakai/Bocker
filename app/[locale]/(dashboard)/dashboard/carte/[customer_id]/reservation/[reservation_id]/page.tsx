'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocale } from 'next-intl'
import { DashboardSection, Loading, MultiImageDrop } from '@/components/common'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { OptimizedCustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository.optimized'
import {
  CarteRepository,
  CarteDetailRepository,
} from '@/services/supabase/repositories'
import type { RowType } from '@/services/supabase/SupabaseService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  CalendarDays,
  User,
  FileText,
  Camera,
  Save,
  ChevronLeft,
  ImageIcon,
  Loader2,
  X,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel'
import { format } from 'date-fns'
import { ja, enUS } from 'date-fns/locale'
import { toast } from 'sonner'
import type { SupportedLocale } from '@/lib/dateLocale'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { uploadImage } from '@/services/gcp/cloud_storage/helpers'
import { ImageType, ReservationMenu, ReservationOption } from '@/convex/types'
import Uploader from '@/components/common/Uploader'

type CarteDetailPageProps = {
  params: Promise<{
    customer_id: string
    reservation_id: string
  }>
}

type CustomerWithDetails = {
  customer: RowType<'customer'> | null
  customerDetail: RowType<'customer_detail'> | null
  customerPoints: RowType<'customer_points'> | null
}

type CarteData = {
  carte: RowType<'carte'> | null
  carteDetail: RowType<'carte_detail'> | null
}

// 肌質の選択肢マップ
const SKIN_TYPE_MAP: Record<string, string> = {
  normal: '普通肌',
  dry: '乾燥肌',
  oily: '脂性肌',
  combination: '混合肌',
  sensitive: '敏感肌',
}

// 髪質の選択肢マップ
const HAIR_TYPE_MAP: Record<string, string> = {
  straight: 'ストレート',
  wavy: 'ウェーブ',
  curly: 'カーリー',
  coily: 'コイリー',
  fine: '細い',
  thick: '太い',
}

export default function CarteDetailPage({ params: paramsPromise }: CarteDetailPageProps) {
  const locale = useLocale() as SupportedLocale
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()

  const [customerId, setCustomerId] = useState<string | null>(null)
  const [reservationId, setReservationId] = useState<string | null>(null)
  const [customerData, setCustomerData] = useState<CustomerWithDetails | null>(null)
  const [carteData, setCarteData] = useState<CarteData | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Carousel state
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // 編集可能フィールド
  const [notes, setNotes] = useState('')
  const [customerRequests, setCustomerRequests] = useState('')
  const [currentFiles, setCurrentFiles] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<ImageType[]>([])

  // 初期値を保存（変更検知用）
  const [initialNotes, setInitialNotes] = useState('')
  const [initialCustomerRequests, setInitialCustomerRequests] = useState('')
  const [initialImages, setInitialImages] = useState<ImageType[]>([])

  const customerRepo = useMemo(() => new OptimizedCustomerRepository(), [])
  const carteRepo = useMemo(() => new CarteRepository(), [])
  const carteDetailRepo = useMemo(() => new CarteDetailRepository(), [])

  // Carousel effect
  useEffect(() => {
    if (!carouselApi) {
      return
    }
    // Set initial snap as soon as API is ready
    setCurrentImageIndex(carouselApi.selectedScrollSnap())

    const onSelect = () => {
      if (carouselApi) {
        // Check if api is still valid
        setCurrentImageIndex(carouselApi.selectedScrollSnap())
      }
    }
    carouselApi.on('select', onSelect)

    // Clean up listener on component unmount or when api changes
    return () => {
      carouselApi.off('select', onSelect)
    }
  }, [carouselApi])

  const handleThumbnailClick = (index: number) => {
    carouselApi?.scrollTo(index)
  }

  // paramsの解決
  useEffect(() => {
    paramsPromise.then((params) => {
      setCustomerId(params.customer_id)
      setReservationId(params.reservation_id)
    })
  }, [paramsPromise])

  // データの取得
  const fetchData = useCallback(async () => {
    if (!tenantId || !orgId || !customerId || !reservationId || !isLoaded) return

    setIsLoadingData(true)
    try {
      // 顧客情報の取得
      const completeData = await customerRepo.getCompleteCustomerData(customerId, tenantId, orgId)

      if (!completeData.customer) {
        toast.error('顧客情報が見つかりません')
        return
      }

      setCustomerData(completeData)

      // カルテ情報の取得
      const carte = await carteRepo.findByCustomer(tenantId, orgId, customerId)

      // カルテ詳細の取得
      const carteDetail = await carteDetailRepo.findByReservation(tenantId, orgId, reservationId)

      setCarteData({
        carte,
        carteDetail,
      })

      // 編集フィールドの初期化
      if (carteDetail) {
        const notesValue = carteDetail.notes || ''
        const customerRequestsValue = carteDetail.customer_requests || ''
        const imagesValue =
          carteDetail.after_images && Array.isArray(carteDetail.after_images)
            ? (carteDetail.after_images as ImageType[])
            : []

        // 現在値を設定
        setNotes(notesValue)
        setCustomerRequests(customerRequestsValue)
        setExistingImages(imagesValue)

        // 初期値を保存
        setInitialNotes(notesValue)
        setInitialCustomerRequests(customerRequestsValue)
        setInitialImages(imagesValue)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('データの取得に失敗しました')
    } finally {
      setIsLoadingData(false)
    }
  }, [
    tenantId,
    orgId,
    customerId,
    reservationId,
    isLoaded,
    customerRepo,
    carteRepo,
    carteDetailRepo,
  ])

  // データ保存
  const handleSave = useCallback(async () => {
    if (!carteData?.carteDetail || !orgId) {
      toast.error('カルテ詳細が見つかりません')
      return
    }

    setIsSaving(true)
    let newUploadedImageUrls: ImageType[] = [...existingImages]

    try {
      // 新しい画像のアップロード処理
      if (currentFiles.length > 0) {
        setIsUploading(true)
        try {
          // Promise.allを使って複数の画像を並列アップロード
          const uploadPromises = currentFiles.map(async (file) => {
            return uploadImage(file, orgId, 'carte', 'mobile', 'medium')
          })

          const uploadResults = await Promise.all(uploadPromises)
          const newImages = uploadResults.map((result) => ({
            original_url: result.originalUrl,
            thumbnail_url: result.thumbnailUrl,
          }))

          // 既存の画像と新しい画像を結合（最大4枚）
          newUploadedImageUrls = [...existingImages, ...newImages].slice(0, 4)
          setIsUploading(false)
        } catch (err) {
          setIsUploading(false)
          setIsSaving(false)
          console.error('Image upload failed:', err)
          toast.error('画像のアップロードに失敗しました')
          return
        }
      }

      // 削除された画像の処理
      const originalImages = (carteData.carteDetail.after_images as ImageType[]) || []
      const imagesToDelete: ImageType[] = []

      originalImages.forEach((originalImage) => {
        if (
          originalImage.original_url &&
          !newUploadedImageUrls.some((img) => img.original_url === originalImage.original_url)
        ) {
          imagesToDelete.push({
            original_url: originalImage.original_url,
            thumbnail_url: originalImage.thumbnail_url || '',
          })
        }
      })

      // 削除対象がある場合は削除処理を実行
      if (imagesToDelete.length > 0) {
        try {
          console.log('削除対象の画像:', imagesToDelete)
          const deleteApiPayload = {
            originalUrls: imagesToDelete.map((img) => img.original_url),
            withThumbnail: true,
          }

          const deleteResponse = await fetch('/api/storage', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deleteApiPayload),
          })

          if (!deleteResponse.ok) {
            let errorMessage = `画像の削除に失敗しました: ${deleteResponse.status}`
            try {
              const errorData = await deleteResponse.json()
              console.error('画像削除APIエラー詳細:', {
                status: deleteResponse.status,
                statusText: deleteResponse.statusText,
                error: errorData.error,
                details: errorData.details,
                payload: deleteApiPayload,
              })
              if (errorData.error) {
                errorMessage = errorData.error
              }
            } catch (parseErr) {
              // JSONパースに失敗した場合はテキストを表示
              const errorText = await deleteResponse.text()
              console.error('画像削除APIエラー (テキスト):', errorText + ' ' + parseErr)
            }
            toast.error(errorMessage)
          } else {
            console.log(`${imagesToDelete.length}枚の画像を削除しました`)
          }
        } catch (err) {
          console.error('画像削除中にエラーが発生しました:', err)
          toast.error('画像の削除中にエラーが発生しました')
        }
      }

      // カルテ詳細の更新
      await carteDetailRepo.updateCarteDetail(carteData.carteDetail.id, {
        notes,
        customer_requests: customerRequests,
        after_images: newUploadedImageUrls.length > 0 ? newUploadedImageUrls : null,
      })

      // 成功後の処理
      setExistingImages(newUploadedImageUrls)
      setCurrentFiles([])

      // 初期値を更新（保存後の値を新しい初期値として設定）
      setInitialNotes(notes)
      setInitialCustomerRequests(customerRequests)
      setInitialImages(newUploadedImageUrls)

      toast.success('カルテを更新しました')
    } catch (error) {
      console.error('Failed to save carte detail:', error)
      toast.error('カルテの更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }, [
    carteData?.carteDetail,
    notes,
    customerRequests,
    carteDetailRepo,
    orgId,
    currentFiles,
    existingImages,
  ])

  // 初回データ取得
  useEffect(() => {
    if (customerId && reservationId && tenantId && orgId && isLoaded) {
      fetchData()
    }
  }, [customerId, reservationId, tenantId, orgId, isLoaded, fetchData])

  // 金額フォーマット
  const formatPrice = (price: number | null) => {
    if (!price) return '¥0'
    return `¥${price.toLocaleString()}`
  }

  // 日付フォーマット
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return format(new Date(dateString), 'yyyy年MM月dd日 HH:mm', {
      locale: locale === 'ja' ? ja : enUS,
    })
  }

  // 変更検知のためのヘルパー関数
  const hasChanges = useMemo(() => {
    // テキストフィールドの変更チェック
    if (notes !== initialNotes || customerRequests !== initialCustomerRequests) {
      return true
    }

    // 新しいファイルの追加チェック
    if (currentFiles.length > 0) {
      return true
    }

    // 画像の削除チェック（初期画像数と現在の画像数の比較）
    if (existingImages.length !== initialImages.length) {
      return true
    }

    // 画像の内容が変更されているかチェック（URLで比較）
    const existingUrls = existingImages.map((img) => img.original_url).sort()
    const initialUrls = initialImages.map((img) => img.original_url).sort()

    if (existingUrls.length !== initialUrls.length) {
      return true
    }

    for (let i = 0; i < existingUrls.length; i++) {
      if (existingUrls[i] !== initialUrls[i]) {
        return true
      }
    }

    return false
  }, [
    notes,
    initialNotes,
    customerRequests,
    initialCustomerRequests,
    currentFiles,
    existingImages,
    initialImages,
  ])

  if (!isLoaded || isLoadingData) {
    return <Loading />
  }

  if (isUploading) {
    return <Uploader />
  }

  if (!customerData || !carteData) {
    return (
      <DashboardSection
        title="カルテ詳細"
        backLink={`/dashboard/carte/${customerId}`}
        backLinkTitle="カルテに戻る"
      >
        <div className="text-center py-8 text-muted-foreground">データが見つかりません</div>
      </DashboardSection>
    )
  }

  const firstName = customerData.customer?.first_name ?? null
  const lastName = customerData.customer?.last_name ?? null
  const customerName = firstName && lastName ? `${lastName} ${firstName}` : null
  const finalCustomerName = customerName
    ? `${customerName}`
    : customerData.customer?.email
      ? `${customerData.customer.email}`
      : customerData.customer?.line_user_name
        ? `${customerData.customer.line_user_name}`
        : null

  return (
    <DashboardSection
      title="カルテ詳細"
      backLink={`/dashboard/carte/${customerId}`}
      backLinkTitle="カルテに戻る"
    >
      <div className="space-y-3 md:space-y-6">
        {/* ヘッダー情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {finalCustomerName} 様の施術カルテ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-4 h-4" />
                  <span className="text-sm">施術日時</span>
                </div>
                <p className="font-medium">
                  {formatDate(
                    carteData.carteDetail?.service_start_time ||
                      carteData.carteDetail?.created_at ||
                      null
                  )}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">担当スタッフ</span>
                </div>
                <p className="font-medium">{carteData.carteDetail?.staff_name || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* アコーディオンセクション */}
        <Accordion type="multiple" defaultValue={['photos', 'treatment']} className="space-y-4">
          {/* 施術後写真 */}
          <AccordionItem value="photos" className="border rounded-lg px-6">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                <span className="font-semibold">施術後の写真</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              {/* 既存の画像管理 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-4">
                <div className="w-full">
                  {existingImages.length > 0 ? (
                    <div className="w-full max-w-[400px] mx-auto">
                      <div className="grid grid-cols-4 gap-4 my-3">
                        {existingImages.map((image, index) => (
                          <div
                            key={index}
                            className="relative aspect-[2/3] bg-muted group rounded-lg overflow-hidden"
                          >
                            <Image
                              src={image.thumbnail_url}
                              alt="施術後写真"
                              width={150}
                              height={150}
                              className="w-full h-full object-contain"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const newImages = existingImages.filter((_, i) => i !== index)
                                setExistingImages(newImages)
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                          写真を拡大表示する
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex items-center gap-2">
                        <ImageIcon size={18} className="text-muted-foreground" />
                        <p className="text-sm text-muted-foreground font-bold">
                          施術後の写真が登録されていません。
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {/* 画像アップロード */}
                <div>
                  <div className="text-sm font-medium flex items-center gap-2 mb-2">
                    <ImageIcon size={18} className="text-muted-foreground" />
                    写真を追加（最大4枚）
                  </div>
                  <MultiImageDrop
                    currentFiles={currentFiles}
                    onFilesSelect={(newFiles) => {
                      setCurrentFiles(newFiles as File[])
                    }}
                    maxSizeMB={6}
                    limitFiles={4}
                    hasSelected={existingImages.length}
                  />
                  {existingImages.length + currentFiles.length > 4 && (
                    <p className="text-xs text-destructive mt-2">
                      写真は合計4枚までアップロード可能です
                    </p>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          {/* 施術内容 */}
          <AccordionItem value="treatment" className="border rounded-lg px-6">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span className="font-semibold">施術内容</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {/* メニュー詳細 */}
              {carteData.carteDetail?.menu_details && (
                <div>
                  <div className="mt-2 space-y-2">
                    {(carteData.carteDetail.menu_details as ReservationMenu[]).map(
                      (menu, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-background rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Badge>{menu.name}</Badge>
                            <span className="text-sm text-muted-foreground">x{menu.quantity}</span>
                          </div>
                          <span className="font-medium text-accent-2">
                            {formatPrice(menu.price * menu.quantity)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* オプション詳細 */}
              {carteData.carteDetail?.option_details &&
                Array.isArray(carteData.carteDetail.option_details) &&
                (carteData.carteDetail.option_details as ReservationOption[]).length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">オプション</Label>
                    <div className="mt-2 space-y-2">
                      {(carteData.carteDetail.option_details as ReservationOption[]).map(
                        (option, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <Badge>{option.name}</Badge>
                              <span className="text-sm text-muted-foreground">
                                x{option.quantity}
                              </span>
                            </div>
                            <span className="font-medium text-accent-2">
                              {formatPrice(option.price * option.quantity)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </AccordionContent>
          </AccordionItem>

          {/* 顧客要望・メモ */}
          <AccordionItem value="notes" className="border rounded-lg px-6">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span className="font-semibold">顧客要望・メモ</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div>
                <Label htmlFor="customer-requests">お客様のご要望</Label>
                <Textarea
                  id="customer-requests"
                  value={customerRequests}
                  onChange={(e) => setCustomerRequests(e.target.value)}
                  placeholder="お客様からのご要望を記録してください"
                  className="mt-2 text-primary"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="staff-notes">スタッフメモ</Label>
                <Textarea
                  id="staff-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="施術に関するメモを記録してください"
                  className="mt-2 text-primary"
                  rows={4}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* カルテ基本情報 */}
          {carteData.carte && (
            <AccordionItem value="basic-info" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <span className="font-semibold">カルテ基本情報</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-background p-2 rounded-lg">
                    <Label className="text-sm font-medium">肌質</Label>
                    <p className="mt-1 p-2 rounded text-sm">
                      {carteData.carte.skin_type
                        ? SKIN_TYPE_MAP[carteData.carte.skin_type] || carteData.carte.skin_type
                        : '未登録'}
                    </p>
                  </div>
                  <div className="bg-background p-2 rounded-lg">
                    <Label className="text-sm font-medium">髪質</Label>
                    <p className="mt-1 p-2 rounded text-sm">
                      {carteData.carte.hair_type
                        ? HAIR_TYPE_MAP[carteData.carte.hair_type] || carteData.carte.hair_type
                        : '未登録'}
                    </p>
                  </div>
                  <div className="md:col-span-2 bg-background p-2 rounded-lg">
                    <Label className="text-sm font-medium">アレルギー歴</Label>
                    <p className="mt-1 p-2 rounded text-sm whitespace-pre-wrap">
                      {carteData.carte.allergy_history || 'なし'}
                    </p>
                  </div>
                  <div className="md:col-span-2 bg-background p-2 rounded-lg">
                    <Label className="text-sm font-medium">病歴</Label>
                    <p className="mt-1 p-2 rounded text-sm whitespace-pre-wrap">
                      {carteData.carte.medical_history || 'なし'}
                    </p>
                  </div>
                  <div className="bg-background p-2 rounded-lg">
                    <Label className="text-sm font-medium">累計購入金額（LTV）</Label>
                    <p className="mt-1 p-2 rounded text-lg font-bold text-accent-2">
                      {formatPrice(carteData.carte.ltv_price)}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {/* 保存ボタン */}
        <div className="flex justify-end space-x-4">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/carte/${customerId}`}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              戻る
            </Link>
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isUploading || !hasChanges}>
            {isSaving || isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存する
              </>
            )}
          </Button>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>施術後の完成写真</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {existingImages.length > 0 && (
                <>
                  <Carousel
                    setApi={setCarouselApi}
                    className="w-full max-w-xl mx-auto"
                    opts={{
                      loop: existingImages.length > 1,
                      align: 'start',
                    }}
                  >
                    <CarouselContent>
                      {existingImages.map((image, index) => (
                        <CarouselItem key={`main-${index}`}>
                          <div className="relative  aspect-[2/3] max-h-[500px] bg-muted group rounded-lg overflow-hidden mx-auto">
                            <Image
                              src={image.original_url}
                              alt={`施術後写真 ${index + 1}`}
                              className="w-full h-full object-contain"
                              fill
                              sizes="(max-width: 640px) 100vw, 500px"
                              priority={index === currentImageIndex}
                              loading={index === currentImageIndex ? 'eager' : 'lazy'}
                            />
                            {existingImages.length > 1 && (
                              <>
                                <CarouselPrevious className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background hover:bg-muted p-1 rounded-full text-muted-foreground" />
                                <CarouselNext className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background hover:bg-muted p-1 rounded-full text-muted-foreground" />
                              </>
                            )}
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>

                  {existingImages.length > 1 && (
                    <div className="flex space-x-2 justify-center overflow-x-auto py-2">
                      {existingImages.map((image, index) => (
                        <button
                          key={`thumb-${index}`}
                          onClick={() => handleThumbnailClick(index)}
                          className={`flex-shrink-0 w-16 h-16 relative rounded-md border-2 overflow-hidden
                                      ${
                                        currentImageIndex === index
                                          ? 'border-transparent ring-accent ring-2 ring-offset-1'
                                          : 'border-foreground opacity-70 hover:opacity-100'
                                      } focus:outline-none transition-all duration-150 ease-in-out`}
                          aria-label={`写真 ${index + 1} を表示`}
                        >
                          <Image
                            src={image.thumbnail_url}
                            alt={`サムネイル ${index + 1}`}
                            className="w-full h-full object-cover"
                            fill
                            sizes="64px"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardSection>
  )
}
