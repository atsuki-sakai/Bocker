'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/convex/_generated/api'

import { fetchQuery } from 'convex/nextjs'
import { useMutation } from 'convex/react'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Loading } from '@/components/common'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import {
  MenuView,
  StaffView,
  OptionView,
  DateView,
  PaymentView,
  ConfirmView,
  CouponView,
  SalonInfoSheet,
  BottomBar,
} from './_components'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from './_components/DynamicMotion'
import { reservationFlexMessageTemplate } from '@/services/line/message_template/reservation_flex'

import { ReservationPaymentStatus, ActiveCustomerType } from '@/convex/types'
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository'
import { formatDateToYYYYMMDD } from '@/lib/formatDate'
import { BASE_URL } from '@/lib/constants'

import {
  Check,
  CheckCheck,
  LogOut,
  ShoppingCart,
  User2,
  Settings,
  Calendar,
  CreditCard,
  CheckCircle,

  Loader2,
  Ticket,
} from 'lucide-react'
import type { StaffDisplay, SessionPayload } from '@/lib/types'

// 自動割り当てされたスタッフ用の型
type AutoAssignedStaff = StaffDisplay & {
  isAutoAssigned: boolean
  extraCharge: number
}
import { Separator } from '@/components/ui/separator'
import { Questionnaire } from './_components/Questionnaire'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useLiff } from '@/hooks/useLiff'
import { ModeToggle } from '@/components/common'
import { PaymentMethod, ReservationStatus } from '@/convex/types'
import type { TimeRange } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { useQuery } from 'convex/react'
import { RowType } from '@/services/supabase/SupabaseService'
import { 
  isValidPhoneNumber, 
  countOptionOccurrences, 
  groupOptionsByName, 
  pageVariants 
} from './_components/utils'

// 予約ステップの定義
type ReservationStep = 'menu' | 'staff' | 'option' | 'date' | 'payment' | 'coupon' | 'confirm'

interface OrganizationCompleteData {
  organization: Doc<'organization'>
  config: Doc<'config'> | null
  reservationConfig: Doc<'reservation_config'> | null
  apiConfig: Doc<'api_config'> | null
}



export default function CalendarPage() {
  const router = useRouter()
  const params = useParams()
  const orgId = params.id as Id<'organization'>
  const { liff } = useLiff()
  const { showErrorToast } = useErrorHandler()

  // ユーティリティ関数: 自動割り当てスタッフかどうかをチェック
  const isAutoAssignedStaff = (staff: StaffDisplay | 'free' | null | undefined): boolean => {
    return (
      staff !== null &&
      staff !== undefined &&
      staff !== 'free' &&
      typeof staff === 'object' &&
      'isAutoAssigned' in staff &&
      staff.isAutoAssigned === true
    )
  }
  // STATES
  const customerRepository = useMemo(() => new CustomerRepository(), [])
  // const pointTaskQueueRepository = useMemo(() => new PointTaskQueueRepository(), [])
  // const carteRepository = useMemo(() => new CarteRepository(), [])
  // const carteDetailRepository = useMemo(() => new CarteDetailRepository(), [])
  const [sessionCustomer, setSessionCustomer] = useState<SessionPayload | null>(null)
  const [customerPhone, setCustomerPhone] = useState<string | null>(null)
  const [customerData, setCustomerData] = useState<{
    customer: RowType<'customer'> | null
    customerDetail: RowType<'customer_detail'> | null
    customerPoints: RowType<'customer_points'> | null
  } | null>(null)
  const [notes, setNotes] = useState<string>('')
  const [isPhoneValid, setIsPhoneValid] = useState(false) // 電話番号の有効性ステート
  const [organizationComplete, setOrganizationComplete] = useState<OrganizationCompleteData | null>(
    null
  )
  const [selectedMenus, setSelectedMenus] = useState<Doc<'menu'>[]>([])
  const [selectedStaffCompleted, setSelectedStaffCompleted] = useState<{
    staff: StaffDisplay | 'free' | null
  } | null>(null)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Doc<'option'>[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<TimeRange | null>(null)
  const [reservationStartDateTime, setReservationStartDateTime] = useState<Date | null>(null)
  const [reservationEndDateTime, setReservationEndDateTime] = useState<Date | null>(null)
  const [currentStep, setCurrentStep] = useState<ReservationStep>('menu')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [appliedDiscount, setAppliedDiscount] = useState<{
    discount: number
    couponId: Id<'coupon'> | null
    couponName?: string
  }>({ discount: 0, couponId: null })
  const [usePoints, setUsePoints] = useState<number>(0)
  const [availablePoints, setAvailablePoints] = useState<number>(0)
  const [direction, setDirection] = useState(0) // アニメーションの方向を制御
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false)
  const [questionnaireStep, setQuestionnaireStep] = useState(1)
  const [isLogout, setIsLogout] = useState(false)
  const totalSteps = 10 // Questionnaireと合わせる
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [isCreatingCheckoutSession, setIsCreatingCheckoutSession] = useState(false) // 追加
  const [isSalonInfoSheetOpen, setIsSalonInfoSheetOpen] = useState(false)

  // bottomBar高さ測定用のrefとstate
  const bottomBarRef = useRef<HTMLDivElement>(null)
  const [bottomBarHeight, setBottomBarHeight] = useState<number>(0)

  // Convex queries
  const orgWeekSchedule = useQuery(
    api.organization.week_schedule.query.getAllByTenantAndOrg,
    sessionCustomer?.tenantId && sessionCustomer.orgId
      ? {
          tenant_id: sessionCustomer.tenantId,
          org_id: sessionCustomer.orgId,
        }
      : 'skip'
  )

  const pointConfig = useQuery(
    api.point.query.findByTenantAndOrg,
    sessionCustomer?.tenantId && sessionCustomer.orgId
      ? {
          tenant_id: sessionCustomer.tenantId,
          org_id: sessionCustomer.orgId,
        }
      : 'skip'
  )
  // Convex mutations
  const handleReservationManage = useMutation(api.reservation.manage.handleReservationManage)

  // ステップ変更時に画面トップへ自動スクロール
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [currentStep])

  // bottomBarの高さを測定してpadding-bottomに予約
  useEffect(() => {
    if (bottomBarRef.current) {
      setBottomBarHeight(bottomBarRef.current.offsetHeight)
    }
  }, [selectedMenus, selectedStaffCompleted, selectedOptions])

  // 次のステップに進む
  const goToNextStep = async () => {
    setDirection(1) // 前進方向を設定
    switch (currentStep) {
      case 'menu':
        setCurrentStep('staff')
        break
      case 'staff':
        setCurrentStep('option')
        break
      case 'option':
        setCurrentStep('date')
        break
      case 'date':
        setCurrentStep('payment')
        if (selectedStaffCompleted?.staff === 'free' && organizationComplete && selectedDate) {
          try {
            if (!selectedTime) {
              toast.error('予約時間を選択してください。')
              return
            }
            const startDateTime = new Date(selectedDate)
            const [sh, sm] = selectedTime.startHour.split(':').map(Number)
            startDateTime.setHours(sh, sm, 0, 0)

            const assignedStaff = await fetchQuery(
              api.reservation.query.calculateIntegratedAvailableTimes,
              {
                tenant_id: organizationComplete.organization.tenant_id as Id<'tenant'>,
                org_id: organizationComplete.organization._id as Id<'organization'>,
                menu_ids: selectedMenus.map((menu) => menu._id),
                date: format(selectedDate, 'yyyy-MM-dd'),
                option_ids: selectedOptions.map((option) => option._id),
              }
            )

            console.log('assignedStaff', assignedStaff)

            if (assignedStaff) {
              // スタッフが自動割り当てされた場合も、顧客側表示は「指名フリー」として保持
              // 内部的にスタッフ情報を保存するため、selectedStaffCompletedには特別なフラグをつける
              setSelectedStaffCompleted({
                staff: {
                  _id: assignedStaff.timeSlots[0].availableStaffs[0].id,
                  name: assignedStaff.timeSlots[0].availableStaffs[0].name,
                  priority: assignedStaff.timeSlots[0].availableStaffs[0].priority,
                  extraCharge: assignedStaff.timeSlots[0].availableStaffs[0].extra_charge ?? 0,
                  isAutoAssigned: true, // 自動割り当てフラグ
                } as AutoAssignedStaff,
              })
              console.log('assignedStaff', assignedStaff)
            } else {
              toast.error(
                'この時間帯に対応可能なスタッフが見つかりませんでした。他の時間をお選びください。'
              )
              // 時間選択をリセット
              setSelectedTime(null)
              setReservationStartDateTime(null)
              setReservationEndDateTime(null)
            }
          } catch (error) {
            console.error('スタッフ自動割り当てエラー:', error)
            toast.error('スタッフの割り当てに失敗しました。他の時間をお選びください。')
            // 時間選択をリセット
            setSelectedTime(null)
            setReservationStartDateTime(null)
            setReservationEndDateTime(null)
          }
        }
        break
      case 'payment':
        setCurrentStep('coupon')
        break
      case 'coupon':
        setCurrentStep('confirm')
        break
      case 'confirm':
        // 予約完了処理
        console.log('予約完了')
        break
    }
  }

  // 前のステップに戻る
  const goToPreviousStep = () => {
    setDirection(-1) // 後退方向を設定
    switch (currentStep) {
      case 'staff':
        setCurrentStep('menu')
        // スタッフの選択をクリア
        setSelectedStaffCompleted(null)
        break
      case 'option':
        setCurrentStep('staff')
        // オプションの選択をクリア
        setSelectedOptions([])
        break
      case 'date':
        setCurrentStep('option')
        // 日付の選択をクリア
        setSelectedDate(null)
        setSelectedTime(null)
        setReservationStartDateTime(null)
        setReservationEndDateTime(null)
        // 指名フリーで自動割り当てされたスタッフをリセット
        if (selectedStaffCompleted?.staff && isAutoAssignedStaff(selectedStaffCompleted.staff)) {
          setSelectedStaffCompleted({ staff: 'free' })
        }
        break
      case 'payment':
        setCurrentStep('date')
        setSelectedPaymentMethod(null)
        break
      case 'coupon':
        setCurrentStep('payment')
        break
      case 'confirm':
        setCurrentStep('coupon')
        // ポイント使用をクリア
        setUsePoints(0)
        break
    }
  }

  const handleShowLogoutDialog = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setShowLogoutDialog(true)
  }

  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsLogout(true)
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    if (liff?.isLoggedIn()) {
      liff.logout()
    }
    toast.success('ログアウトしました。')
    router.push(`/reservation/${orgId}`)
    setIsLogout(false)
  }

  // クレジットカード決済処理を共通化
  const processCreditCardPayment = async (): Promise<string | null> => {
    if (
      !sessionCustomer ||
      !organizationComplete?.organization?._id ||
      !selectedStaffCompleted?.staff ||
      !reservationStartDateTime ||
      !reservationEndDateTime
    ) {
      console.error('予約に必要な情報が不足しています。')
      toast.error('予約に必要な情報が不足しています。選択内容をご確認ください。')
      return null
    }

    // 指名フリーの場合のスタッフ情報設定
    const isAutoAssigned =
      selectedStaffCompleted.staff !== 'free' &&
      'isAutoAssigned' in selectedStaffCompleted.staff &&
      selectedStaffCompleted.staff.isAutoAssigned

    const staffData =
      selectedStaffCompleted.staff === 'free'
        ? {
            staff_id: undefined as Id<'staff'> | undefined,
            staff_name: undefined as string | undefined,
            is_free_nomination: true,
          }
        : isAutoAssigned
          ? {
              // 自動割り当てされたスタッフ（元はフリー指名）
              staff_id: selectedStaffCompleted.staff._id as Id<'staff'>,
              staff_name: selectedStaffCompleted.staff.name ?? '不明',
              is_free_nomination: true, // フリー指名として扱う
            }
          : {
              // 通常の指名予約
              staff_id: selectedStaffCompleted.staff._id as Id<'staff'>,
              staff_name: selectedStaffCompleted.staff.name ?? '不明',
              is_free_nomination: false,
            }

    try {
      // 予約データを準備 (status: 'pending' で作成)
      const reservationData = {
        tenant_id: sessionCustomer.tenantId,
        org_id: organizationComplete.organization._id as Id<'organization'>,
        customer_uid: sessionCustomer.customerUid,
        ...staffData,
        customer_name:
          sessionCustomer.customerName ??
          sessionCustomer.email ??
          sessionCustomer.lineUserName ??
          '不明',
        status: 'pending' as ReservationStatus,
        date: selectedDate ? formatDateToYYYYMMDD(selectedDate) : '',
        start_time_unix: reservationStartDateTime.getTime(),
        end_time_unix: reservationEndDateTime.getTime(),
        total_price: calculateTotal(), // 表示・保存用の最終合計金額
        coupon_id: appliedDiscount.couponId ?? undefined,
        payment_method: 'credit_card' as PaymentMethod,
        stripe_checkout_session_id: undefined,
        payment_status: 'pending' as ReservationPaymentStatus,
        menus: selectedMenus.map((menu) => ({
          id: menu._id,
          name: menu.name,
          price: menu.sale_price || menu.unit_price || 0,
          quantity: 1,
        })),
        options: countOptionOccurrences(selectedOptions),
        extra_charge:
          selectedStaffCompleted.staff === 'free' ||
          isAutoAssignedStaff(selectedStaffCompleted.staff)
            ? 0
            : 'extraCharge' in selectedStaffCompleted.staff
              ? (selectedStaffCompleted.staff as AutoAssignedStaff).extraCharge || 0
              : selectedStaffCompleted.staff.extra_charge || 0,
        use_points: usePoints,
        coupon_discount: appliedDiscount.discount || undefined,
        featured_hair_images: [],
        notes: notes,
        pending_duration_minutes: 30, // 30分の有効期限
      }

      // 1. Convexに予約データを'pending'ステータスで作成
      let result: {
        reservationId: Id<'reservation'>
        status?: ReservationStatus
        payment_method?: PaymentMethod
        checkout_url?: string
      } | null = null
      try {
        result = await handleReservationManage({
          mode: 'create',
          payload: reservationData,
        })
      } catch (error) {
        // 重複予約エラーの場合
        const errorData = error as {
          data?: {
            code?: string
            statusCode?: number
            severity?: string
            callFunc?: string
            message?: string
          }
        }
        if (errorData?.data?.code === 'CONFLICT' || errorData?.data?.statusCode === 409) {
          toast.error(
            '申し訳ございません。選択された時間帯は既に予約済みです。別の時間帯を選択してください。'
          )

          // 日時選択ステップに戻る（空き時間は自動的に再取得される）
          setCurrentStep('date')
          return null
        }

        // その他のエラー
        throw error
      }

      if (!result?.reservationId) {
        throw new Error('予約の作成に失敗しました。')
      }

      const reservationId = result.reservationId

      // 2. Stripe Checkoutセッションを作成するためのlineItemsを準備
      // 各アイテムの unit_amount には、独自システムで計算した割引適用後の価格を設定する

      const totalDiscountAmount = (appliedDiscount.discount || 0) + (usePoints || 0)

      const lineItemsRaw = [
        ...selectedMenus.map((menu) => ({
          name: menu.name,
          originalPrice: menu.sale_price || menu.unit_price || 0,
          type: 'menu' as const,
        })),
        ...countOptionOccurrences(selectedOptions).map(({ id, quantity }) => {
          const option = selectedOptions.find((opt) => opt._id === id)
          return {
            name: option?.name || 'オプション',
            originalPrice:
              (option?.sale_price ? option.sale_price : (option?.unit_price ?? 0)) * quantity,
            type: 'option' as const,
            quantity, // オプションの場合、quantityはここで考慮済みなので按分後の価格計算では使わない
          }
        }),
        ...(selectedStaffCompleted?.staff !== 'free' &&
        selectedStaffCompleted?.staff?.extra_charge &&
        selectedStaffCompleted.staff.extra_charge > 0
          ? [
              {
                name: '指名料',
                originalPrice: selectedStaffCompleted.staff.extra_charge,
                type: 'staff_charge' as const,
              },
            ]
          : []),
      ]

      const subtotalBeforeDiscount = lineItemsRaw.reduce((sum, item) => sum + item.originalPrice, 0)

      const stripeLineItems = lineItemsRaw
        .map((item) => {
          let discountedPrice = item.originalPrice
          if (totalDiscountAmount > 0 && subtotalBeforeDiscount > 0) {
            const itemDiscountShare =
              (item.originalPrice / subtotalBeforeDiscount) * totalDiscountAmount
            discountedPrice = Math.max(0, item.originalPrice - itemDiscountShare) // 価格がマイナスにならないように
          }
          // Stripeのunit_amountは整数である必要があるため、四捨五入または切り捨て/切り上げ
          // JPYの場合、Stripeは最小通貨単位（円）で扱うので、小数点以下は通常不要
          const finalAmount = Math.round(discountedPrice)

          return {
            price_data: {
              currency: 'jpy',
              product_data: { name: item.name },
              // オプションの場合、originalPriceが既にquantityを考慮しているので、
              // unit_amountには按分後の価格をそのまま設定（Stripe側でquantity=1で扱わせる）
              // ただし、元のcheckoutOptionsの構造と合わせるため、ここではitemがもつquantityで割るか、
              // lineItemsRaw作成時にオプションのoriginalPriceを単価にし、ここでquantityを渡すか検討が必要
              // 今回は、オプションも単一アイテムとして扱い、quantityは1でStripeに渡す想定で進める
              // そのため、countOptionOccurrencesで集約されたオプションは、Stripe上では1つのラインアイテムになる
              unit_amount: finalAmount,
            },
            quantity: item.type === 'option' && item.quantity ? item.quantity : 1, // オプションの場合のみ元の数量をStripeに渡す
          }
        })
        .filter(
          (item) =>
            item.price_data.unit_amount > 0 ||
            (item.price_data.unit_amount === 0 &&
              item.quantity > 0 &&
              subtotalBeforeDiscount === totalDiscountAmount)
        )
      // 全額割引の場合など、0円のアイテムも送信する必要がある場合がある。
      // Stripeは0円のラインアイテムを許可するが、最低支払額（JPYで50円）には注意。
      // ここでは、0円でも数量があれば送信し、そうでなければフィルタリング。
      // ただし、合計がStripeの最低金額を下回る場合はエラーになる。
      // もし合計が0円の場合は、Stripe Checkoutではなく別の処理（無料予約完了など）を検討する必要がある。

      // Stripeに渡す最終的なラインアイテムの合計金額を計算 (デバッグ用)
      const totalAmountForStripe = stripeLineItems.reduce(
        (sum, item) => sum + item.price_data.unit_amount * item.quantity,
        0
      )
      console.log('Total amount for Stripe:', totalAmountForStripe)
      if (totalAmountForStripe < 50 && totalAmountForStripe > 0) {
        console.warn('Stripeに渡す合計金額が50円未満です。Stripe側でエラーになる可能性があります。')
      }
      if (totalAmountForStripe === 0 && subtotalBeforeDiscount > 0) {
        // 全額割引で実質0円の場合の処理 (例: Stripe Checkoutをスキップして予約を予約受付(confirmed)ステータスに変更する)
        // このシナリオは別途設計が必要
        console.log('合計金額が0円のため、Stripe Checkoutはスキップします。')
        // ここで予約ステータスを 'confirmed' に更新し、完了ページへリダイレクトするなどの処理を行う。
        // handleConfirmReservation の現金払いと同様のロジックを参考に実装できる。
        // 今回は processCreditCardPayment のスコープ外として、エラーを投げるか、
        // 何もしないで return null するかなどを検討。
        // ここでは一旦、エラーとして処理を進めないようにする。
        toast.error(
          '合計金額が0円になるため、クレジットカード決済はご利用いただけません。別の決済方法を選択するか、お問い合わせください。'
        )
        return null // またはエラーをスロー
      }

      // 3. バックエンドAPIを呼び出してStripe Checkoutセッションを作成
      const requestBody = {
        stripeConnectId: organizationComplete.organization.stripe_account_id,
        reservationId,
        tenantId: sessionCustomer.tenantId,
        orgId,
        customerEmail: sessionCustomer.email,
        lineItems: stripeLineItems,
        couponId: appliedDiscount.couponId ?? undefined,
        pointsUsedAmount: usePoints,
      }
      console.log(
        'Request body for /api/stripe/connect/checkout:',
        JSON.stringify(requestBody, null, 2)
      )

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Stripe Checkoutセッションの作成に失敗しました。')
      }

      const responseData = await response.json()
      const checkoutUrl = responseData.checkoutUrl

      if (checkoutUrl) {
        return checkoutUrl
      } else {
        throw new Error('Checkout URLが取得できませんでした。')
      }
    } catch (error) {
      showErrorToast(error)
      return null
    }
  }

  console.log('#### selectedStaffCompleted: ', selectedStaffCompleted)

  const handleConfirmReservation = async () => {
    if (
      !sessionCustomer ||
      !organizationComplete?.organization?._id ||
      !selectedStaffCompleted?.staff ||
      !reservationStartDateTime ||
      !reservationEndDateTime ||
      !selectedPaymentMethod
    ) {
      console.error('予約に必要な情報が不足しています。')
      alert('予約に必要な情報が不足しています。選択内容をご確認ください。')
      return
    }

    // 指名フリーの場合のスタッフ情報設定
    const isAutoAssigned =
      selectedStaffCompleted.staff !== 'free' &&
      selectedStaffCompleted.staff !== null &&
      typeof selectedStaffCompleted.staff === 'object' &&
      'isAutoAssigned' in selectedStaffCompleted.staff &&
      selectedStaffCompleted.staff.isAutoAssigned

    const staffData =
      selectedStaffCompleted.staff === 'free'
        ? { staff_id: undefined, staff_name: undefined, is_free_nomination: true }
        : isAutoAssigned
          ? {
              // 自動割り当てされたスタッフ（元はフリー指名）
              staff_id: selectedStaffCompleted.staff._id as Id<'staff'>,
              staff_name: selectedStaffCompleted.staff.name ?? '不明',
              is_free_nomination: true, // フリー指名として扱う
            }
          : {
              // 通常の指名予約
              staff_id: selectedStaffCompleted.staff._id as Id<'staff'>,
              staff_name: selectedStaffCompleted.staff.name ?? '不明',
              is_free_nomination: false,
            }

    setIsProcessingPayment(true)

    try {
      // 顧客情報を更新（電話番号, email）
      if (customerData?.customer) {
        const updatedCustomerData = {
          phone: customerPhone || customerData.customer.phone,
          email: customerData.customer.email,
          line_id: customerData.customer.line_id,
          line_user_name: customerData.customer.line_user_name,
        }

        try {
          await customerRepository.updateCustomer(
            customerData.customer.uid,
            sessionCustomer.tenantId,
            organizationComplete.organization._id as Id<'organization'>,
            updatedCustomerData
          )
          console.log('顧客情報を更新しました')
        } catch (error) {
          console.error('顧客情報の更新に失敗しました:', error)
          // エラーでも予約処理は継続
        }
      }

      // ポイント減算は予約作成時のaction側で実行するため、フロントエンドでは事前チェックのみ
      if (usePoints > 0) {
        // 保有ポイント不足チェック（念のため）
        if (usePoints > availablePoints) {
          setIsProcessingPayment(false)
          throw new Error(`保有ポイント（${availablePoints}P）が不足しています。`)
        }
        console.log(`ポイント利用予定: ${usePoints}ポイント (action側で減算実行)`)
      }

      const customerName =
        sessionCustomer.customerName ??
        sessionCustomer.email ??
        sessionCustomer.lineUserName ??
        '不明'
      // 予約データを準備 (handleConfirmReservation内ではstatusをまだ設定しない)
      const reservationBaseData = {
        org_id: organizationComplete.organization._id as Id<'organization'>,
        tenant_id: sessionCustomer.tenantId,
        customer_uid: sessionCustomer.customerUid,
        ...staffData,
        customer_name: customerName,
        status: 'confirmed' as ReservationStatus,
        date: selectedDate ? formatDateToYYYYMMDD(selectedDate) : '',
        start_time_unix: reservationStartDateTime.getTime(),
        end_time_unix: reservationEndDateTime.getTime(),
        total_price: calculateTotal(), // 表示・保存用の最終合計金額
        coupon_id: appliedDiscount.couponId ?? undefined,
        payment_method: selectedPaymentMethod,
        stripe_checkout_session_id: undefined,
        payment_status: 'pending' as ReservationPaymentStatus,
        menus: selectedMenus.map((menu) => ({
          id: menu._id,
          name: menu.name,
          price: menu.sale_price || menu.unit_price || 0,
          quantity: 1,
        })),
        options: countOptionOccurrences(selectedOptions),
        extra_charge:
          selectedStaffCompleted.staff === 'free' ||
          isAutoAssignedStaff(selectedStaffCompleted.staff)
            ? 0
            : 'extraCharge' in selectedStaffCompleted.staff
              ? (selectedStaffCompleted.staff as AutoAssignedStaff).extraCharge || 0
              : selectedStaffCompleted.staff.extra_charge || 0,
        use_points: usePoints,
        coupon_discount: appliedDiscount.discount || undefined,
        featured_hair_images: [],
        notes: notes,
      }

      if (selectedPaymentMethod === 'credit_card') {
        const checkoutUrl = await processCreditCardPayment()
        if (checkoutUrl) {
          router.push(checkoutUrl)
          // リダイレクト後はこのページの操作は不要なため、isProcessingPaymentの解除はしない
        } else {
          // 決済処理失敗
          setIsProcessingPayment(false)
        }
      } else if (selectedPaymentMethod === 'cash') {
        // 1. Convexに予約データを'confirmed'ステータスで作成（現金決済は予約を確定する）
        const reservationDataForCash = {
          ...reservationBaseData,
          status: 'confirmed' as ReservationStatus,
        }

        const result = await handleReservationManage({
          mode: 'create',
          payload: reservationDataForCash,
        })

        if (!result?.reservationId) {
          throw new Error('予約の作成に失敗しました。')
        }

        const reservationId = result.reservationId

        if (sessionCustomer.lineUserId && organizationComplete.config) {
          // Lineにメッセージ予約の確認用Flexメッセージを作成
          const flexMessages = reservationFlexMessageTemplate(
            organizationComplete.organization, // 1. organization
            organizationComplete.config, // 2. orgConfig
            customerName, // 3. customerName
            organizationComplete.organization._id as Id<'organization'>, // 4. orgId
            sessionCustomer.customerUid, // 5. customerUid
            selectedStaffCompleted.staff === 'free' ||
              isAutoAssignedStaff(selectedStaffCompleted.staff)
              ? null
              : selectedStaffCompleted.staff, // 6. selectedStaff (null for free nomination)
            selectedDate!, // 7. selectedDate
            selectedTime!, // 8. selectedTimeSlot
            selectedMenus, // 9. selectedMenus
            selectedOptions, // 10. selectedOptions
            usePoints, // 11. usePoints
            appliedDiscount.discount || 0, // 12. couponDiscount
            calculateTotal(), // 13. calculateTotalPrice
            reservationId!, // 14. reservationId
            organizationComplete.reservationConfig?.available_cancel_days ?? 3 // 15. availableCancelDay
          )
          // Lineにメッセージ送信
          const response = await fetch('/api/line/flex-message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              lineId: sessionCustomer?.lineUserId,
              messages: flexMessages,
              accessToken: organizationComplete.apiConfig?.line_access_token,
            }),
          })

          if (!response.ok) {
            let errorData
            try {
              errorData = await response.json()
            } catch (e) {
              console.log(e)
              try {
                errorData = await response.text()
              } catch (textError) {
                console.log(textError)
                errorData = `Status: ${response.status}, StatusText: ${response.statusText}`
              }
            }
            console.error('LINEメッセージ送信APIエラー:', response.status, errorData)
            const errorMessage =
              typeof errorData === 'object' && errorData !== null && errorData.message
                ? errorData.message
                : typeof errorData === 'string' && errorData
                  ? errorData
                  : `サーバーエラー: ${response.status}`
            throw new Error(`LINEメッセージ送信に失敗しました: ${errorMessage}`)
          }

          console.log(selectedStaffCompleted)
          try {
            const result = await response.json()
            if (result.success) {
              // サロンへのLINE通知を送信（エラーは無視）
              try {
                if (organizationComplete.apiConfig?.org_line_id) {
                  await fetch('/api/line/salon-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      tenantId: sessionCustomer.tenantId,
                      organizationId: organizationComplete.organization._id,
                      reservationId: reservationId,
                      paymentMethod: 'cash',
                    }),
                  })
                }
              } catch (salonNotificationError) {
                console.warn('サロン通知の送信に失敗しました:', salonNotificationError)
                // サロン通知の失敗は顧客の予約処理をブロックしない
              }

              router.push(
                `/reservation/${organizationComplete.organization._id}/calendar/complete?reservationId=${reservationId}`
              )
            } else {
              throw new Error(result.error || result.message || 'メッセージ送信処理に失敗しました')
            }
          } catch (e) {
            console.error('LINEメッセージ送信APIからのレスポンス処理エラー:', e)
            throw new Error(
              'LINEメッセージ送信APIからの応答の処理中にエラーが発生しました。詳細はコンソールネットワークタブを確認してください。'
            )
          }
        } else if (sessionCustomer.email) {
          try {
            const mailSubject = `【${organizationComplete.organization.org_name}】ご予約内容の確認`

            const menuTotal = selectedMenus.reduce(
              (sum, menu) => sum + (menu.sale_price || menu.unit_price || 0),
              0
            )
            const optionTotal = selectedOptions.reduce(
              (sum, option) => sum + (option.sale_price || option.unit_price || 0),
              0
            )

            const extraCharge =
              selectedStaffCompleted.staff === 'free' ||
              isAutoAssignedStaff(selectedStaffCompleted.staff)
                ? 0
                : selectedStaffCompleted.staff.extra_charge || 0

            const emailTemplateProps = {
              customerName:
                sessionCustomer.customerName ??
                sessionCustomer.email ??
                sessionCustomer.lineUserName ??
                'お客様',
              customerEmail: sessionCustomer.email,
              orgName: organizationComplete.organization.org_name,
              orgPhone: organizationComplete.config?.phone,
              orgAddress: organizationComplete.config?.address,
              orgPostalCode: organizationComplete.config?.postal_code,
              reservationDate:
                selectedDate?.toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                }) || '日付未定',
              reservationTime: selectedTime
                ? `${selectedTime.startHour}～${selectedTime.endHour}`
                : '時間未定',
              staffName:
                selectedStaffCompleted.staff === 'free' ||
                isAutoAssignedStaff(selectedStaffCompleted.staff)
                  ? '指名フリー'
                  : selectedStaffCompleted.staff.name,
              extraCharge:
                selectedStaffCompleted.staff === 'free' ||
                isAutoAssignedStaff(selectedStaffCompleted.staff)
                  ? 0
                  : selectedStaffCompleted.staff.extra_charge || 0,
              menus: selectedMenus.map((menu) => ({
                name: menu.name,
                price: menu.sale_price || menu.unit_price || 0,
              })),
              options: groupOptionsByName(selectedOptions).map((option) => ({
                name: option.name,
                price: option.salePrice || option.unitPrice || 0,
                count: option.count,
              })),
              subtotal: (menuTotal + optionTotal + extraCharge).toLocaleString(),
              pointsUsed: usePoints > 0 ? usePoints : undefined,
              couponDiscount: appliedDiscount.discount > 0 ? appliedDiscount.discount : undefined,
              totalAmount: calculateTotal(),
              reservationRules: organizationComplete.config?.reservation_rules,
              reservationDetailUrl: `${BASE_URL}/reservation/${organizationComplete.organization._id}/calendar/complete?reservationId=${reservationId}`,
            }

            const emailResponse = await fetch('/api/resend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: sessionCustomer.email,
                subject: mailSubject,
                templateProps: emailTemplateProps, // HTMLの代わりにtemplatePropsを渡す
              }),
            })

            if (!emailResponse.ok) {
              const errorData = await emailResponse.json()
              console.error('メール送信APIエラー:', emailResponse.status, errorData)
              throw new Error(errorData.error || 'メール送信に失敗しました。')
            }
            const emailResult = await emailResponse.json()
            console.log('メール送信成功:', emailResult)

            // サロンへのLINE通知を送信（エラーは無視）
            try {
              if (organizationComplete.apiConfig?.org_line_id) {
                await fetch('/api/line/salon-notification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tenantId: sessionCustomer.tenantId,
                    organizationId: organizationComplete.organization._id,
                    reservationId: reservationId,
                    paymentMethod: 'cash',
                  }),
                })
              }
            } catch (salonNotificationError) {
              console.warn('サロン通知の送信に失敗しました:', salonNotificationError)
              // サロン通知の失敗は顧客の予約処理をブロックしない
            }

            router.push(
              `/reservation/${organizationComplete.organization._id}/calendar/complete?reservationId=${reservationId}`
            )
          } catch (e) {
            console.error('メール送信処理エラー:', e)
            toast.error('メールの送信に失敗しましたが、予約は受け付けました。')
            // メール送信失敗時も予約完了ページには遷移する
            router.push(
              `/reservation/${organizationComplete.organization._id}/calendar/complete?reservationId=${reservationId}`
            )
          }
        } else {
          toast.error('LINEにもメールにも通知できませんでしたが、予約は受け付けました。')
          router.push(
            `/reservation/${organizationComplete.organization._id}/calendar/complete?reservationId=${reservationId}`
          )
        }
        toast.success(
          '予約を受け付けしました。予約確認メールまたはLINEメッセージを送信しましたのでご確認ください。'
        )
        router.push(
          `/reservation/${organizationComplete.organization._id}/calendar/complete?reservationId=${reservationId}`
        )
      }
    } catch (error) {
      showErrorToast(error)
      setIsProcessingPayment(false)
    }
  }

  // USE EFFECT
  useEffect(() => {
    // JWT Cookieからセッション情報を取得
    const fetchSession = async () => {
      try {
        setIsLoading(true)

        // 組織情報を取得して、テナントIDを設定
        const orgData = await fetchQuery(api.organization.query.findByOrgId, {
          org_id: orgId,
        })

        if (!orgData) {
          console.error('組織情報が見つかりません')
          router.push('/reservation')
          return
        }

        // セッションチェック（tenant_idとorg_idを含める）
        const response = await fetch(
          `/api/auth/session?tenantId=${encodeURIComponent(orgData.tenant_id)}&orgId=${encodeURIComponent(orgId)}`,
          { credentials: 'include' }
        )

        if (!response.ok) {
          console.error('認証セッションが見つかりません。予約画面に戻ります。')
          router.push(`/reservation/${orgId}`)
          return
        }

        const data = await response.json()

        if (data.session) {
          // Handle backward compatibility: if 'name' exists but 'customerName' doesn't, use 'name'
          const session = data.session;
          const legacySession = session as SessionPayload & { name?: string };
          if (legacySession.name && !session.customerName) {
            session.customerName = legacySession.name;
            console.log('[Calendar] Migrated old session format: name -> customerName');
          }
          setSessionCustomer(session)
          try {
            const organizationComplete = await fetchQuery(api.organization.query.getRelations, {
              tenant_id: data.session.tenantId,
              org_id: data.session.orgId,
            })

            setOrganizationComplete(organizationComplete)

            const { customer, customerDetail, customerPoints } =
              await customerRepository.getCompleteCustomerData(
                data.session.customerUid,
                data.session.tenantId,
                organizationComplete.organization._id
              )

            setCustomerData({
              customer,
              customerDetail,
              customerPoints,
            })

            setAvailablePoints(customerPoints?.total_points || 0)
            setCustomerPhone(customer?.phone || null)
            setIsPhoneValid(isValidPhoneNumber(customer?.phone || null))
          } catch (error) {
            console.error('サロン情報の取得に失敗しました:', error)
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            if (liff?.isLoggedIn()) {
              liff.logout()
            }
            toast.error('サロン情報の取得に失敗しました。サロンが削除されている可能性があります。')
            setOrganizationComplete(null)
          }
        } else {
          router.push('/reservation')
        }
      } catch (error) {
        console.error('セッション取得中にエラーが発生しました:', error)
        router.push(`/reservation/${orgId}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()
  }, [router, liff, orgId, customerRepository, sessionCustomer?.orgId])

  console.log('#### sessionCustomer: ', sessionCustomer)
  if (isLoading) return <Loading />

  if (!organizationComplete) {
    if (sessionCustomer?.orgId) {
      return router.push(`/reservation/${sessionCustomer.orgId}`)
    } else {
      return router.push('/reservation')
    }
  }

  // 合計金額の計算
  const calculateTotal = () => {
    // メニュー価格の合計
    const menuTotal = selectedMenus.reduce(
      (sum, menu) => sum + (menu.sale_price || menu.unit_price || 0),
      0
    )

    // オプション価格の合計（複数選択を考慮）
    const optionTotal = selectedOptions.reduce(
      (sum, option) => sum + (option.sale_price ? option.sale_price : (option.unit_price ?? 0)),
      0
    )

    // 指名料（指名フリーの場合は0、自動割り当ての場合も0として表示）
    const extraChargeTotal =
      selectedStaffCompleted?.staff === 'free' || isAutoAssignedStaff(selectedStaffCompleted?.staff)
        ? 0
        : selectedStaffCompleted?.staff?.extra_charge || 0

    // 割引額
    const discount = appliedDiscount.discount + usePoints

    return menuTotal + optionTotal + extraChargeTotal - discount
  }

  const calculateTotalMinutes = () => {
    // メニュー時間の合計
    const menuMinutes = selectedMenus.reduce((sum, menu) => {
      return sum + (menu.duration_min || 0)
    }, 0)

    // オプション時間の合計（複数選択を考慮）
    const optionMinutes = selectedOptions.reduce((sum, option) => {
      return sum + (option.duration_min || 0)
    }, 0)

    return menuMinutes + optionMinutes
  }

  // ステップインジケーターのレンダリング
  const renderStepIndicator = () => {
    const steps = [
      {
        key: 'menu',
        label: 'メニュー',
        icon: ShoppingCart,
        color: 'bg-chart-1 text-background',
      },
      {
        key: 'staff',
        label: 'スタッフ',
        icon: User2,
        color: 'bg-chart-2 text-background',
      },
      {
        key: 'option',
        label: 'オプション',
        icon: Settings,
        color: 'bg-chart-3 text-background',
      },
      {
        key: 'date',
        label: '日時',
        icon: Calendar,
        color: 'bg-chart-4 text-background',
      },
      {
        key: 'payment',
        label: '決済',
        icon: CreditCard,
        color: 'bg-chart-5 text-background',
      },
      {
        key: 'coupon',
        label: 'クーポン',
        icon: Ticket,
        color: 'bg-neon text-background',
      },
      {
        key: 'confirm',
        label: '確認',
        icon: CheckCircle,
        color: 'bg-accent-2 text-background',
      },
    ]

    return (
      <div className="relative mb-4 w-full max-w-3xl mx-auto">
        {/* ② ステップ丸要素群 */}
        <div className="relative grid grid-cols-7 gap-2">
          {steps.map((step, index) => {
            const isActive = currentStep === step.key
            const isCompleted = index < steps.findIndex((s) => s.key === currentStep)
            return (
              <div key={step.key} className="flex flex-col items-center">
                <motion.div
                  className={`
                    z-10 w-8 h-8 rounded-full flex items-center justify-center
                    ${
                      isActive
                        ? `${step.color}`
                        : isCompleted
                          ? `bg-background border border-accent-2 text-accent-2`
                          : 'bg-background border border-muted-foreground text-muted-foreground'
                    }
                  `}
                  /* アニメーションもここでお好みで */
                >
                  {isCompleted ? <Check size={18} /> : <step.icon size={18} />}
                </motion.div>
                <span
                  className={`tracking-wide text-xs text-nowrap scale-75 ${isActive ? 'font-bold' : 'text-muted-foreground'}`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // 現在のステップに応じたコンテンツのレンダリング
  const renderStepContent = () => {
    return (
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full max-w-3xl mx-auto"
        >
          {(() => {
            switch (currentStep) {
              case 'menu':
                return (
                  <div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <MenuView
                        tenantId={organizationComplete.organization.tenant_id as Id<'tenant'>}
                        orgId={organizationComplete.organization._id as Id<'organization'>}
                        selectedMenuIds={selectedMenus.map((menu) => menu._id)}
                        onChangeMenusAction={(menus) => setSelectedMenus(menus)}
                        targetType={sessionCustomer?.target_type as ActiveCustomerType}
                        isMultipleSelection={
                          organizationComplete.reservationConfig?.is_multiple_select_category
                        }
                      />
                    </motion.div>

                    <motion.div
                      className="mt-10 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Button
                        onClick={goToNextStep}
                        disabled={selectedMenus.length === 0}
                        className="relative overflow-hidden w-full transition-all duration-200 ease-in-out"
                      >
                        <motion.div
                          className="flex items-center justify-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          次へ進む
                        </motion.div>
                      </Button>
                    </motion.div>
                  </div>
                )
              case 'staff':
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <StaffView
                      tenantId={organizationComplete.organization.tenant_id as Id<'tenant'>}
                      orgId={organizationComplete.organization._id as Id<'organization'>}
                      selectedMenuIds={selectedMenus.map((menu) => menu._id)}
                      selectedStaff={selectedStaffCompleted?.staff as Doc<'staff'> | 'free' | null}
                      onChangeStaffAction={(staff) => {
                        if (staff) {
                          setSelectedStaffCompleted({ staff })
                          // 指名フリー選択時は今日の日付を自動選択
                          if (staff === 'free' && !selectedDate) {
                            const today = new Date()
                            setSelectedDate(today)
                          }
                        }
                      }}
                    />
                    <motion.div
                      className="mt-10 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        onClick={goToNextStep}
                        disabled={!selectedStaffCompleted}
                        className="relative overflow-hidden w-full transition-all duration-200 ease-in-out"
                      >
                        <motion.div
                          className="flex items-center justify-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          次へ進む
                        </motion.div>
                      </Button>
                    </motion.div>
                  </motion.div>
                )
              case 'option':
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <OptionView
                      tenantId={organizationComplete.organization.tenant_id as Id<'tenant'>}
                      orgId={organizationComplete.organization._id as Id<'organization'>}
                      selectedOptions={selectedOptions}
                      onChangeOptionsAction={(options) => setSelectedOptions(options)}
                    />
                    <motion.div
                      className="mt-10 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button onClick={goToNextStep} className="relative overflow-hidden w-full">
                        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          次へ進む
                        </motion.span>
                      </Button>
                    </motion.div>
                  </motion.div>
                )
              case 'date':
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <DateView
                      tenantId={organizationComplete.organization.tenant_id as Id<'tenant'>}
                      orgId={organizationComplete.organization._id as Id<'organization'>}
                      selectedDate={selectedDate}
                      selectedStaff={selectedStaffCompleted?.staff as Doc<'staff'> | 'free' | null}
                      selectedTime={selectedTime}
                      totalMinutes={calculateTotalMinutes()}
                      selectedMenuIds={selectedMenus.map((menu) => menu._id)}
                      selectedOptionIds={selectedOptions.map((option) => option._id)}
                      onChangeDateAction={(date) => {
                        setSelectedDate(date)
                        setSelectedTime(null)
                        setReservationStartDateTime(null)
                        setReservationEndDateTime(null)
                      }}
                      onChangeTimeAction={async (time) => {
                        setSelectedTime(time)
                        console.log('selectedDate', selectedDate)
                        console.log('time', time)
                        if (selectedDate) {
                          const startDateTime = new Date(selectedDate)
                          const [sh, sm] = time.startHour.split(':').map(Number)
                          startDateTime.setHours(sh, sm, 0, 0)
                          const endDateTime = new Date(selectedDate)
                          const [eh, em] = time.endHour.split(':').map(Number)
                          endDateTime.setHours(eh, em, 0, 0)
                          setReservationStartDateTime(startDateTime)
                          setReservationEndDateTime(endDateTime)
                        }
                      }}
                    />
                    <motion.div
                      className="mt-10 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        onClick={goToNextStep}
                        disabled={!reservationStartDateTime || !reservationEndDateTime}
                        className="relative overflow-hidden w-full"
                      >
                        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          次へ進む
                        </motion.span>
                      </Button>
                    </motion.div>
                  </motion.div>
                )
              case 'payment':
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <PaymentView
                      selectedMenus={selectedMenus}
                      selectedPaymentMethod={selectedPaymentMethod as PaymentMethod}
                      onChangePaymentMethodAction={(method) => setSelectedPaymentMethod(method)}
                    />
                    <motion.div
                      className="mt-10 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        onClick={goToNextStep}
                        disabled={!selectedPaymentMethod}
                        className="relative overflow-hidden w-full"
                      >
                        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          次へ進む
                        </motion.span>
                      </Button>
                    </motion.div>
                  </motion.div>
                )
              case 'coupon':
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <CouponView
                      tenantId={organizationComplete.organization.tenant_id as Id<'tenant'>}
                      orgId={organizationComplete.organization._id as Id<'organization'>}
                      selectedMenus={selectedMenus}
                      sessionCustomerType={sessionCustomer?.target_type as ActiveCustomerType}
                      onSelectCoupon={(coupon, discountAmount) => {
                        if (coupon) {
                          setAppliedDiscount({
                            discount: discountAmount,
                            couponId: coupon._id,
                            couponName: coupon.name,
                          })
                        } else {
                          setAppliedDiscount({ discount: 0, couponId: null })
                        }
                      }}
                      selectedCoupon={appliedDiscount?.couponId as Id<'coupon'> | null}
                    />
                    <motion.div
                      className="mt-10 flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button onClick={goToNextStep} className="relative overflow-hidden w-full">
                        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          次へ進む
                        </motion.span>
                      </Button>
                    </motion.div>
                  </motion.div>
                )
              case 'confirm':
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <ConfirmView
                      tenantId={organizationComplete.organization.tenant_id as Id<'tenant'>}
                      orgId={organizationComplete.organization._id as Id<'organization'>}
                      selectedMenus={selectedMenus}
                      selectedOptions={selectedOptions}
                      selectedStaff={
                        // 自動割り当てされたスタッフ（フリー指名）は顧客には「free」として表示
                        selectedStaffCompleted?.staff === 'free' ||
                        isAutoAssignedStaff(selectedStaffCompleted?.staff)
                          ? 'free'
                          : (selectedStaffCompleted?.staff as StaffDisplay | null)
                      }
                      availablePoints={availablePoints ?? 0}
                      usePoints={usePoints}
                      minimumChargePoint={pointConfig?.minimum_charge_point ?? 0}
                      selectedPaymentMethod={selectedPaymentMethod as PaymentMethod}
                      onChangePointsAction={(points: number) => setUsePoints(points)}
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      onApplyCoupon={(discount: number, couponId: Id<'coupon'>) =>
                        setAppliedDiscount({ discount, couponId })
                      }
                      appliedCouponInfo={appliedDiscount.couponId ? appliedDiscount : null}
                    />
                    <Separator className="my-6" />
                    <div className="flex flex-col gap-2 my-4">
                      <Label className="text-primary">ご予約者様のお電話番号</Label>
                      <Input
                        type="tel"
                        placeholder="電話番号を入力してください (例: 090-1234-5678)"
                        value={customerPhone || ''}
                        className="w-full"
                        onChange={(e) => {
                          const phone = e.target.value
                          setCustomerPhone(phone)
                          setIsPhoneValid(isValidPhoneNumber(phone))
                        }}
                      />
                      {!isPhoneValid && customerPhone !== null && customerPhone !== '' && (
                        <p className="text-xs text-destructive">
                          有効な電話番号の形式で入力してください。
                        </p>
                      )}
                      {(!customerPhone || customerPhone === '') && (
                        <p className="text-xs text-destructive">
                          ご予約をされるお客様のお電話番号を入力してください
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 my-4">
                      <Label className="text-primary">備考</Label>
                      <Textarea
                        rows={8}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full"
                        placeholder="ご要望などあればご記入ください。"
                      />
                    </div>

                    <motion.div
                      className="mt-8 flex flex-col gap-4 justify-center items-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="flex w-full gap-4">
                        {selectedPaymentMethod === 'credit_card' && (
                          <Button
                            onClick={async () => {
                              setIsCreatingCheckoutSession(true)
                              try {
                                const checkoutUrl = await processCreditCardPayment()
                                if (checkoutUrl) {
                                  router.push(checkoutUrl)
                                } else {
                                  setIsCreatingCheckoutSession(false)
                                }
                              } catch (error) {
                                console.error('Error during credit card payment process:', error)
                                showErrorToast(error)
                                setIsCreatingCheckoutSession(false)
                              }
                            }}
                            disabled={
                              isCreatingCheckoutSession || isProcessingPayment || !isPhoneValid
                            }
                            className="relative overflow-hidden w-full"
                          >
                            <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              {isCreatingCheckoutSession ? (
                                <div className="flex items-center justify-center gap-2">
                                  処理中...
                                  <Loader2 className="animate-spin ml-2" />
                                </div>
                              ) : (
                                'クレジットカードで支払う'
                              )}
                            </motion.span>
                          </Button>
                        )}
                        <Button
                          onClick={handleConfirmReservation}
                          disabled={
                            isProcessingPayment ||
                            !isPhoneValid ||
                            selectedPaymentMethod === 'credit_card'
                          }
                          className="relative overflow-hidden w-full"
                        >
                          <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            {isProcessingPayment ? (
                              <div className="flex items-center justify-center gap-2">
                                処理中...
                                <Loader2 className="animate-spin ml-2" />
                              </div>
                            ) : selectedPaymentMethod === 'credit_card' ? (
                              '予約内容を確認 (現金払い)'
                            ) : (
                              '予約を確定する'
                            )}
                          </motion.span>
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )
            }
          })()}
        </motion.div>
      </AnimatePresence>
    )
  }

  if (isLogout) {
    return <Loading />
  }

  return (
    <div className="container max-w-3xl mx-auto p-4" style={{ paddingBottom: bottomBarHeight }}>
      <div className="overflow-hidden flex items-center justify-between mb-2">
        <div>
          <SalonInfoSheet
            organizationComplete={organizationComplete}
            orgWeekSchedule={orgWeekSchedule}
            isOpen={isSalonInfoSheetOpen}
            onOpenChange={setIsSalonInfoSheetOpen}
          />

          {sessionCustomer?.customerName ? (
            <p className="text-sm flex items-center gap-2 mt-1">
              <CheckCheck className="w-5 h-5 text-accent-2 rounded-full p-1" />
              <span className="font-light">{sessionCustomer?.customerName} 様</span>
            </p>
          ) : sessionCustomer?.email ? (
            <p className="text-sm flex items-center gap-2 mt-1">
              <CheckCheck className="w-5 h-5 text-accent-2" />
              <span className="font-light">{sessionCustomer?.email}</span>
            </p>
          ) : sessionCustomer?.lineUserName ? (
            <p className="text-sm flex items-center gap-2 mt-1">
              <CheckCheck className="w-5 h-5 text-accent-2" />
              <span className="font-light">{sessionCustomer?.lineUserName}</span>
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <div className="flex flex-col items-center gap-2">
            <Button size="icon" variant="outline" onClick={(e) => handleShowLogoutDialog(e)}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      <Separator className="my-2 mb-3" />

      {renderStepIndicator()}

      <div className="mb-6">{renderStepContent()}</div>

      {(selectedMenus.length > 0 || selectedStaffCompleted || selectedOptions.length > 0) && (
        <div ref={bottomBarRef}>
          <BottomBar
            currentStep={currentStep}
            selectedMenus={selectedMenus}
            selectedStaffCompleted={selectedStaffCompleted}
            selectedOptions={selectedOptions}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            reservationStartDateTime={reservationStartDateTime}
            reservationEndDateTime={reservationEndDateTime}
            selectedPaymentMethod={selectedPaymentMethod}
            calculateTotal={calculateTotal}
            calculateTotalMinutes={calculateTotalMinutes}
            pointConfig={pointConfig}
            groupOptionsByName={groupOptionsByName}
            isAutoAssignedStaff={isAutoAssignedStaff}
            goToPreviousStep={goToPreviousStep}
            goToNextStep={goToNextStep}
            bottomBarHeight={bottomBarHeight}
          />
        </div>
      )}
      <Dialog open={isQuestionnaireOpen} onOpenChange={setIsQuestionnaireOpen}>
        <DialogContent className="overflow-y-auto h-[90vh] flex flex-col justify-start items-start">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">問診票</DialogTitle>
          </DialogHeader>
          <Questionnaire
            onComplete={(data) => {
              console.log('data', data)
            }}
            onStepChange={setQuestionnaireStep}
          />
          {questionnaireStep === totalSteps && (
            <Button
              className="w-full"
              onClick={() => {
                setIsQuestionnaireOpen(false)
                console.log('予約完了')
              }}
            >
              予約を確定する
            </Button>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ログアウト</DialogTitle>
          </DialogHeader>
          <DialogDescription>ログアウトしますか？</DialogDescription>
          <DialogFooter className="flex flex-col md:flex-row gap-4">
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={(e) => {
                setShowLogoutDialog(false)
                handleLogout(e)
              }}
            >
              ログアウト
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
