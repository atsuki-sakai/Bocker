// 予約作成画面
// /app/(salon)/dashboard/reservation/add/ReservationForm.tsx

'use client'

import { convertHourToTimestamp } from '@/lib/schedules'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useDebounce } from 'use-debounce'
import Image from 'next/image'
import { ja } from 'date-fns/locale'
import { TagInput } from '@/components/common'
import { Textarea } from '@/components/ui/textarea'
import { getDayOfWeek, formatTimestamp } from '@/lib/schedules'
import { convertGender, ReservationMenu, ReservationOption } from '@/convex/types'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository'
import type { RowType } from '@/services/supabase/SupabaseService'
import { useMutation } from 'convex/react'

// 入力値を数値または undefined に変換するプリプロセス関数
const preprocessNumber = (val: unknown) => {
  if (typeof val === 'string' && val.trim() === '') return undefined
  if (typeof val === 'string') return Number(val)
  return val
}
// 空文字を undefined に変換するプリプロセス関数（enum 用）
const preprocessEmptyString = (val: unknown) => {
  if (typeof val === 'string' && val.trim() === '') return undefined
  return val
}
// カンマ区切り文字列を文字列配列に変換するプリプロセス関数（optionIds 用）
const preprocessStringArray = (val: unknown) => {
  if (typeof val === 'string' && val.trim() === '') return undefined
  if (typeof val === 'string')
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  return val
}

import type { TimeRange } from '@/lib/types'

import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandList, CommandItem } from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Loader2, X, Plus, Minus } from 'lucide-react'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useZodForm } from '@/hooks/useZodForm'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { ZodTextField } from '@/components/common'
import { Loading } from '@/components/common'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { usePriceCalculation } from '@/hooks/usePriceCalculation'

import { RESERVATION_STATUS_VALUES, PAYMENT_METHOD_VALUES, GENDER_VALUES } from '@/convex/types'
const schemaReservation = z
  .object({
    customer_id: z.string().optional(), // 顧客ID
    staff_id: z.string().optional(), // スタッフID
    staff_name: z.string().optional(), // スタッフ名
    customer_last_name: z.string().optional(), // 顧客名（姓）
    customer_first_name: z.string().optional(), // 顧客名（名）
    customer_phone: z.string().optional(), // 顧客電話番号
    customer_gender: z.preprocess(preprocessEmptyString, z.enum(GENDER_VALUES)).optional(), // 顧客性別
    customer_birthday: z.string().optional(), // 顧客生年月日
    customer_tags: z.array(z.string()).optional(), // タグ
    customer_notes: z.string().optional(), // 備考
    menus: z
      .preprocess(
        preprocessStringArray,
        z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            price: z.number(),
            quantity: z.number(),
          })
        )
      )
      .optional(), // メニューID（複数選択可能に変更）
    tenant_id: z.string().optional(), // サロンID
    org_id: z.string().optional(), // サロンID
    options: z
      .preprocess(
        preprocessStringArray,
        z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            price: z.number(),
            quantity: z.number(),
          })
        )
      )
      .optional(), // オプションID（カンマ区切り → 配列）
    unit_price: z.preprocess(preprocessNumber, z.number()).optional(), // 単価
    total_price: z.preprocess(preprocessNumber, z.number()).optional(), // 合計金額
    status: z.preprocess(preprocessEmptyString, z.enum(RESERVATION_STATUS_VALUES)).optional(), // 予約ステータス
    start_time_unix: z.preprocess(preprocessNumber, z.number()).optional(), // 開始時間 UNIXタイム
    end_time_unix: z.preprocess(preprocessNumber, z.number()).optional(), // 終了時間 UNIXタイム
    use_points: z.preprocess(preprocessNumber, z.number()).optional(), // 使用ポイント数
    coupon_id: z.string().optional(), // クーポンID
    featured_hairimg_path: z.string().optional(), // 顧客が希望する髪型の画像ファイルパス
    notes: z.string().optional(), // 備考
    payment_method: z.preprocess(preprocessEmptyString, z.enum(PAYMENT_METHOD_VALUES)).optional(), // 支払い方法
    is_first_customer: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.is_first_customer) {
        return !!data.customer_first_name && !!data.customer_last_name && !!data.customer_phone
      }
      return true
    },
    {
      message: '新規顧客の場合、姓・名・電話番号は必須です',
      path: ['customerFirstName'], // エラー表示位置（必要に応じて他も追加可）
    }
  )

import { Input } from '@/components/ui/input'
import { useQuery, usePaginatedQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fetchQuery } from 'convex/nextjs'
import { Id } from '@/convex/_generated/dataModel'
import { Gender } from '@/convex/types'
import { useErrorHandler } from '@/hooks/useErrorHandler'

// メモ化されたメニュー選択アイテムコンポーネント
const MenuSelectionItem = React.memo(
  ({
    menu,
    count,
    onAdd,
    onRemove,
    disabled,
  }: {
    menu: any
    count: number
    onAdd: () => void
    onRemove: () => void
    disabled: boolean
  }) => (
    <CommandItem className="flex items-center justify-between w-full">
      {menu.images && menu.images[0]?.original_url && (
        <Image
          src={menu.images[0].original_url}
          alt={menu.name ?? ''}
          className="w-10 h-10 rounded-full max-w-[40px] max-h-[40px] min-w-[40px] min-h-[40px]"
          width={40}
          height={40}
        />
      )}
      <div className="flex flex-col justify-start w-full items-start gap-1 text-xs">
        <p className="text-sm">{menu.name}</p>
        <div>
          {menu.sale_price && menu.sale_price > 0 ? (
            <>
              <span className="line-through text-muted-foreground">
                ￥{menu.unit_price?.toLocaleString()}
              </span>
              <span className="font-semibold text-active">
                ￥{menu.sale_price.toLocaleString()}
              </span>
            </>
          ) : (
            <span className="">￥{menu.unit_price?.toLocaleString()}</span>
          )}
          <div className="flex items-center gap-1">
            <p>{menu.duration_min}分</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="outline"
          onClick={onRemove}
          disabled={count === 0}
          className="p-1 disabled:opacity-30 border border-destructive hover:bg-destructive-foreground"
        >
          <Minus className="w-4 h-4 text-destructive" />
        </Button>
        <span className="w-5 text-center text-sm">{count}</span>
        <Button
          size="icon"
          variant="outline"
          onClick={onAdd}
          disabled={disabled}
          className="border border-active hover:bg-active-foreground"
        >
          <Plus className="w-4 h-4 text-active" />
        </Button>
      </div>
    </CommandItem>
  )
)
MenuSelectionItem.displayName = 'MenuSelectionItem'

export default function ReservationForm() {
  const { tenantId, orgId } = useTenantAndOrganization()
  const { showErrorToast } = useErrorHandler()
  const router = useRouter()
  const [isFirstCustomer, setIsFirstCustomer] = useState<boolean>(true)
  // 複数選択に対応するためにstateを配列に変更
  const [selectedMenus, setSelectedMenus] = useState<ReservationMenu[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<Id<'staff'> | null>(null)
  const [selectdate, setSelectDate] = useState<Date | null>(null)
  const [selectTime, setSelectTime] = useState<{
    startTimeUnix: number | undefined
    endTimeUnix: number | undefined
  } | null>(null)
  const [searchName, setSearchName] = useState<string>('')
  const [debouncedSearchName] = useDebounce(searchName, 1000)
  const [selectedOptions, setSelectedOptions] = useState<ReservationOption[]>([])
  const [calendarOpen, setCalendarOpen] = useState(false)
  // メニュー & オプションのポップオーバー
  const [menuPopoverOpen, setMenuPopoverOpen] = useState(false)
  const [optionPopoverOpen, setOptionPopoverOpen] = useState(false)
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false)
  // メニュー選択の上限（数量合計）
  const MAX_MENU_ITEMS = 5
  // オプション選択の上限（ユニーク件数）
  const MAX_OPTION_ITEMS = 5

  // Supabase用の顧客データ管理
  const [customers, setCustomers] = useState<RowType<'customer'>[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(false)
  const [selectedCustomer, setSelectedCustomer] = useState<RowType<'customer'> | null>(null)
  const customerRepository = useMemo(() => new CustomerRepository(), [])

  // 統合データ取得関数を使用してクエリを1本化
  const formData = useQuery(
    api.reservation.query.getReservationFormData,
    tenantId && orgId && selectedMenus.length > 0
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          menu_ids: selectedMenus.map((m) => m.id),
        }
      : 'skip'
  )

  // 初期データ取得（メニュー選択前）
  const initialFormData = useQuery(
    api.reservation.query.getReservationFormData,
    tenantId && orgId && selectedMenus.length === 0
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          menu_ids: [],
        }
      : 'skip'
  )

  // データの統合
  const reservationConfig = formData?.reservationConfig || initialFormData?.reservationConfig
  const menus = formData?.menus || initialFormData?.menus || []
  const options = formData?.options || initialFormData?.options || []
  const orgWeekSchedules = formData?.weekSchedules || initialFormData?.weekSchedules || []
  const availableStaff = formData?.availableStaff || []

  // スタッフの週間スケジュール（個別取得が必要）
  const staffWeekSchedules = useQuery(
    api.staff.week_schedule.query.getByTenantOrgStaff,
    tenantId && orgId && selectedStaffId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          staff_id: selectedStaffId,
        }
      : 'skip'
  )

  // 休業日情報（TODO: 統合データ取得に含める）
  const orgExceptionSchedules = usePaginatedQuery(
    api.organization.exception_schedule.query.getByOrgAndDate,
    tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          type: 'holiday',
          date: new Date().toISOString().split('T')[0],
        }
      : 'skip',
    {
      initialNumItems: 100,
    }
  )

  // Mutation
  const createReservation = useMutation(api.reservation.mutation.create)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useZodForm(schemaReservation)

  // 時間スロットの状態を追加
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeRange[]>([])
  // 選択した日付を "yyyy-MM-dd" 形式で保持
  const formattedDate = selectdate ? format(selectdate, 'yyyy-MM-dd') : ''

  // 顧客検索の最適化されたコールバック
  const searchCustomers = useCallback(async () => {
    console.log(`[ReservationForm] searchCustomers called with:`, {
      tenantId,
      orgId,
      debouncedSearchName,
      searchNameLength: debouncedSearchName.length,
    })

    if (!tenantId || !orgId || debouncedSearchName === '') {
      console.log(`[ReservationForm] Early return: missing params or empty search`)
      setCustomers([])
      return
    }

    setIsLoadingCustomers(true)
    try {
      console.log(`[ReservationForm] Calling customerRepository.findBySearchableText...`)
      const result = await customerRepository.findBySearchableText(
        tenantId,
        orgId,
        debouncedSearchName,
        { page: 1, pageSize: 50 }
      )
      console.log(`[ReservationForm] Search result:`, {
        dataLength: result.data.length,
        count: result.count,
        hasMore: result.hasMore,
        firstCustomer: result.data[0]
          ? {
              uid: result.data[0].uid,
              firstName: result.data[0].first_name,
              lastName: result.data[0].last_name,
              searchableText: result.data[0].searchable_text,
            }
          : null,
      })
      setCustomers(result.data)
    } catch (error) {
      console.error('[ReservationForm] Error searching customers:', error)
      showErrorToast(error)
      setCustomers([])
    } finally {
      setIsLoadingCustomers(false)
    }
  }, [tenantId, orgId, debouncedSearchName])

  // 顧客検索の実行
  useEffect(() => {
    searchCustomers()
  }, [searchCustomers])

  useEffect(() => {
    if (!tenantId || !orgId) return
    reset({
      customer_id: undefined, // 顧客ID
      staff_id: undefined, // スタッフID
      staff_name: undefined, // スタッフ名
      menus: [], // メニューID（複数）
      tenant_id: tenantId, // サロンID
      org_id: orgId, // サロンID
      status: 'pending', // 予約ステータス
      options: [], // オプションID
      unit_price: undefined, // 単価
      total_price: undefined, // 合計金額
      start_time_unix: undefined, // 開始時間 UNIXタイム
      end_time_unix: undefined, // 終了時間 UNIXタイム
      use_points: undefined, // 使用ポイント数
      coupon_id: undefined, // クーポンID
      featured_hairimg_path: undefined, // 顧客が希望する髪型の画像ファイルパス
      notes: undefined, // 備考
      payment_method: 'cash', // 支払い方法
    })
  }, [tenantId, orgId, reset])

  // 価格計算の統合フック使用
  const {
    totalTimeMinutes,
    menuTotalPrice,
    optionTotalPrice,
    extraChargePrice,
    totalPrice: totalPriceCalculated,
  } = usePriceCalculation({
    selectedMenus,
    selectedOptions,
    menus,
    options,
    selectedStaffId,
    availableStaff,
  })

  useEffect(() => {
    setValue('total_price', totalPriceCalculated)
    setValue('unit_price', menuTotalPrice)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPriceCalculated, menuTotalPrice])

  // 時間スロット取得の最適化されたコールバック
  const getAvailableTimeSlots = useCallback(async () => {
    if (!selectedStaffId || !tenantId || !orgId || !selectdate || !totalTimeMinutes) {
      setAvailableTimeSlots([])
      return
    }

    try {
      // 日付をYYYY-MM-DD形式に変換
      const formattedDate = format(selectdate, 'yyyy-MM-dd')

      // 空き時間スロットを取得
      const result = await fetchQuery(api.reservation.query.calculateReservationTime, {
        tenant_id: tenantId,
        org_id: orgId,
        staff_id: selectedStaffId,
        date: formattedDate,
        duration_min: totalTimeMinutes,
      })

      // 結果が配列で返され、選択したスタッフのスロットを含む場合
      if (Array.isArray(result) && result.length > 0) {
        setAvailableTimeSlots(result)
      } else {
        setAvailableTimeSlots([])
      }
    } catch (error) {
      showErrorToast(error)
      setAvailableTimeSlots([])
    }
  }, [selectedStaffId, tenantId, orgId, selectdate, totalTimeMinutes])

  // 時間スロット取得の実行
  useEffect(() => {
    getAvailableTimeSlots()
  }, [getAvailableTimeSlots])

  // ─────────────────────────
  // メニュー数量操作用ヘルパー
  // ─────────────────────────
  const getMenuCount = React.useCallback(
    (id: Id<'menu'>) => selectedMenus.filter((m) => m.id === id).length,
    [selectedMenus]
  )

  // 選択中メニュー ID を一意にした配列
  const uniqMenuIds = React.useMemo(
    () => Array.from(new Set(selectedMenus.map((m) => m.id))),
    [selectedMenus]
  )

  const calcMenuSubTotal = React.useCallback(
    (ids: Id<'menu'>[]) =>
      ids.reduce((sum, id) => {
        const menu = menus?.find((m) => m._id === id)
        if (!menu) return sum
        const price =
          menu.sale_price && menu.sale_price > 0 ? menu.sale_price : (menu.unit_price ?? 0)
        return sum + price
      }, 0),
    [menus]
  )

  const addMenu = useCallback((menu: ReservationMenu) => {
    if (selectedMenus.length >= MAX_MENU_ITEMS) {
      toast.error(`メニューは最大 ${MAX_MENU_ITEMS} 件まで選択できます。`)
      return
    }
    const newMenus = [...selectedMenus, menu]
    setSelectedMenus(newMenus)
    setValue('menus', newMenus)
    setValue('unit_price', calcMenuSubTotal(newMenus.map((m) => m.id)))
    // メニュー変更時はスタッフをリセット
    setSelectedStaffId(null)
    setValue('staff_id', '')
  }, [selectedMenus, setValue, calcMenuSubTotal])

  const removeMenu = useCallback((menuId: Id<'menu'>) => {
    const idx = selectedMenus.findIndex((m) => m.id === menuId)
    if (idx === -1) return
    const newMenus = [...selectedMenus]
    newMenus.splice(idx, 1)
    setSelectedMenus(newMenus)
    setValue('menus', newMenus)
    setValue('unit_price', calcMenuSubTotal(newMenus.map((m) => m.id)))
    if (newMenus.length === 0) {
      setSelectedStaffId(null)
      setValue('staff_id', '')
    }
  }, [selectedMenus, setValue, calcMenuSubTotal])

  // 指定メニュー ID をすべて取り除く
  const removeMenuAll = (menuId: Id<'menu'>) => {
    const newMenus = selectedMenus.filter((m) => m.id !== menuId)
    setSelectedMenus(newMenus)
    setValue('menus', newMenus)
    setValue('unit_price', calcMenuSubTotal(newMenus.map((m) => m.id)))
    if (newMenus.length === 0) {
      setSelectedStaffId(null)
      setValue('staff_id', '')
    }
  }

  const getOptionCount = React.useCallback(
    (id: Id<'option'>) => selectedOptions.find((o) => o.id === id)?.quantity ?? 0,
    [selectedOptions]
  )

  const addOption = (option: ReservationOption) => {
    const existing = selectedOptions.find((o) => o.id === option.id)

    // まだ存在しないオプションを追加する際、上限チェック
    if (!existing && selectedOptions.length >= MAX_OPTION_ITEMS) {
      toast.error(`オプションは最大 ${MAX_OPTION_ITEMS} 件まで選択できます。`)
      return
    }

    const newOpts = existing
      ? selectedOptions.map((o) => (o.id === option.id ? { ...o, quantity: o.quantity + 1 } : o))
      : [...selectedOptions, { ...option, quantity: 1 }]

    setSelectedOptions(newOpts)
    setValue('options', newOpts)
  }

  const removeOption = (optionId: Id<'option'>) => {
    const existing = selectedOptions.find((o) => o.id === optionId)
    if (!existing) return
    const newOpts =
      existing.quantity > 1
        ? selectedOptions.map((o) => (o.id === optionId ? { ...o, quantity: o.quantity - 1 } : o))
        : selectedOptions.filter((o) => o.id !== optionId)
    setSelectedOptions(newOpts)
    setValue('options', newOpts)
  }
  const onSubmit = async (data: z.infer<typeof schemaReservation>) => {
    if (!tenantId || !orgId) return
    try {
      let customerUid
      if (!isFirstCustomer) {
        // 新規顧客の場合、CustomerRepositoryで顧客を作成
        try {
          customerUid = crypto.randomUUID()
          await customerRepository.createCustomerWithDetailsAndPoints(
            {
              uid: customerUid,
              email: '', // 新規顧客の場合、emailは必須ではない
              first_name: data.customer_first_name || '',
              last_name: data.customer_last_name || '',
              phone: data.customer_phone || '',
              tenant_id: tenantId,
              org_id: orgId,
              line_id: '',
              line_user_name: '',
            },
            {
              email: '', // 詳細情報のemail
              gender: data.customer_gender || 'unselected',
              birthday: data.customer_birthday || '',
              age: 0, // 年齢は後で計算
              notes: data.customer_notes || '',
            },
            0 // 初期ポイント
          )
        } catch (error) {
          console.error('Error creating customer:', error)
          showErrorToast(error)
          return
        }
      }

      await createReservation({
        tenant_id: tenantId, // テナントID
        org_id: orgId, // 組織ID
        customer_id: isFirstCustomer ? (customerUid ?? '') : (selectedCustomer?.uid ?? ''), // Supabase 側の customer.id
        staff_id: selectedStaffId as Id<'staff'>, // スタッフID
        customer_name: selectedCustomer?.last_name + ' ' + selectedCustomer?.first_name, // 顧客名
        staff_name: selectStaff?.name ?? '', // スタッフ名
        status: 'confirmed', // 予約ステータス
        date: format(selectdate as Date, 'yyyy-MM-dd'), // 予約日 YYYY-MM-DD
        start_time_unix: data.start_time_unix as number, // 予約開始時間
        end_time_unix: data.end_time_unix as number, // 予約終了時間
        total_price: totalPriceCalculated, // 合計金額
        coupon_id: undefined, // クーポンID
        payment_method: 'cash', // 支払方法
        stripe_checkout_session_id: undefined, // Stripe Checkout Session ID
        payment_status: 'pending', // 支払ステータス
        menus: selectedMenus, // メニュー
        options: selectedOptions, // オプション
        extra_charge: extraChargePrice, // 追加料金
        use_points: undefined, // 使用ポイント数
        coupon_discount: undefined, // クーポン割引額
        featured_hair_images: [], // フィーチャー画像
        notes: data.notes ?? '', // メモ
      })

      toast.success('予約が完了しました')
      router.push('/dashboard/reservation')
    } catch (error) {
      showErrorToast(error)
    }
  }

  const selectStaff = availableStaff.find((staff) => staff._id === selectedStaffId)

  const toDate = reservationConfig?.reservation_limit_days
    ? new Date(
        new Date().setDate(new Date().getDate() + (reservationConfig.reservation_limit_days ?? 30))
      )
    : undefined

  // デバッグ用：顧客データの存在確認
  useEffect(() => {
    const debugCustomerData = async () => {
      if (!tenantId || !orgId) return

      try {
        console.log(`[ReservationForm] Debug: Checking if customers exist for tenant/org`)
        const customers = await customerRepository.debugListAllCustomers(tenantId, orgId)
        console.log(`[ReservationForm] Debug: Found ${customers.length} customers in total`)
      } catch (error) {
        console.error('[ReservationForm] Debug: Error checking customer data:', error)
      }
    }

    debugCustomerData()
  }, [tenantId, orgId, customerRepository])

  if (!tenantId || !orgId) return <Loading />

  return (
    <div className="container mx-auto relative">
      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault()
          }
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-start gap-2 mt-4">
              <p className="text-muted-foreground text-sm font-bold">顧客属性の選択</p>
              <ToggleGroup
                type="single"
                className="w-fit"
                value={isFirstCustomer ? 'first' : 'new'}
                onValueChange={(value) => setIsFirstCustomer(value === 'first')}
              >
                <ToggleGroupItem className="border border-border" value="first">
                  既存顧客の予約
                </ToggleGroupItem>
                <ToggleGroupItem className="border border-border" value="new">
                  新規顧客の予約
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            {isFirstCustomer ? (
              <div className="flex flex-col gap-2 mb-4 bg-background p-3 rounded-md border border-border">
                <div className="flex flex-col items-start gap-2">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center text-xl gap-2">
                      <p className="text-primary font-bold">顧客検索</p>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      顧客無しでも予約は作成できます。
                    </p>
                  </div>
                  <Input
                    className="w-full my-3"
                    placeholder="顧客を検索"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                </div>
                {isLoadingCustomers ? (
                  <div className="flex items-center justify-center p-4 rounded-md">
                    <Loader2 className="h-5 w-5 animate-spin mr-2 text-active" />
                    <span className="text-active text-sm">顧客を検索中...</span>
                  </div>
                ) : customers && customers.length > 0 ? (
                  <div>
                    <p className="text-primary text-sm font-bold mb-1">検索結果</p>
                    <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <p className="text-primary text-sm mb-1 border border-border p-2 rounded-md bg-input">
                          一致した顧客を選択する
                        </p>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-full p-2 overflow-y-auto h-fit"
                        onOpenAutoFocus={(event) => event.preventDefault()}
                      >
                        <Command>
                          <div className="flex items-center justify-between border-b">
                            <p className="text-muted-foreground text-sm">検索結果</p>
                            <button
                              type="button"
                              onClick={() => setCustomerPopoverOpen(false)}
                              className="p-2 text-muted-foreground "
                            >
                              <X className="w-4 h-4" aria-hidden="true" />
                              <span className="sr-only">閉じる</span>
                            </button>
                          </div>
                          <CommandList className="max-h-[300px] py-2 overflow-y-auto">
                            {customers.map((customer) => {
                              return (
                                <CommandItem
                                  key={customer.uid}
                                  className="flex items-center justify-between cursor-pointer"
                                  onSelect={() => {
                                    setSelectedCustomer(customer)
                                    setCustomerPopoverOpen(false)
                                  }}
                                >
                                  <div className="flex items-start gap-1 text-xs">
                                    {customer.last_name && customer.last_name !== '未登録'
                                      ? customer.last_name + ' '
                                      : ''}
                                    {customer.first_name && customer.first_name !== '未登録'
                                      ? customer.first_name + ' '
                                      : ''}
                                    {customer.line_user_name && customer.line_user_name !== '未登録'
                                      ? customer.line_user_name + '　'
                                      : ''}
                                    {customer.phone ? 'tel:' + customer.phone : ''}
                                  </div>
                                </CommandItem>
                              )
                            })}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : searchName.length > 0 ? (
                  <p className="text-warning-foreground text-sm text-center bg-warning border border-warning-foreground p-4 rounded-md">
                    顧客が見つかりません
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm text-center bg-muted border border-border p-4 rounded-md">
                    顧客を検索してください。
                  </p>
                )}
                {selectedCustomer && (
                  <div className="flex flex-col gap-2 mt-2 bg-active-foreground border border-active p-3 rounded-md">
                    <p className="text-active text-sm font-bold">予約する顧客</p>
                    <p className="text-active text-sm">
                      {selectedCustomer.last_name ? selectedCustomer.last_name + ' ' : null}
                      {selectedCustomer.first_name ? selectedCustomer.first_name + ' ' : null}
                      {selectedCustomer.line_user_name
                        ? selectedCustomer.line_user_name + '　'
                        : null}
                      {selectedCustomer.phone ? 'tel:' + selectedCustomer.phone : null}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-4 bg-background p-3 rounded-md border border-border">
                <h4 className="text-primary text-xl font-bold">顧客情報</h4>
                <div className="grid grid-cols-2 gap-2">
                  <ZodTextField
                    register={register}
                    name="customer_last_name"
                    placeholder="姓"
                    className="w-full"
                    errors={errors}
                    label="姓"
                  />
                  <ZodTextField
                    register={register}
                    name="customer_first_name"
                    placeholder="名"
                    className="w-full"
                    errors={errors}
                    label="名"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ZodTextField
                    register={register}
                    type="tel"
                    name="customer_phone"
                    placeholder="電話番号"
                    className="w-full"
                    errors={errors}
                    label="電話番号"
                  />
                  <div className="flex flex-col">
                    <Label className="text-sm ml-2">性別</Label>
                    <Select
                      value={watch('customer_gender') ?? ''}
                      onValueChange={(value: string) => {
                        setValue('customer_gender', value as Gender)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="性別" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_VALUES.map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {convertGender(gender, true)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm ml-2">生年月日</Label>
                  <Input
                    type="date"
                    value={watch('customer_birthday') ?? ''}
                    onChange={(e) => setValue('customer_birthday', e.target.value)}
                  />
                </div>
                <TagInput
                  tags={watch('customer_tags') ?? []}
                  setTagsAction={(value: string[]) => setValue('customer_tags', value)}
                />
                <Textarea
                  placeholder="備考"
                  rows={8}
                  value={watch('customer_notes') ?? ''}
                  onChange={(e) => setValue('customer_notes', e.target.value)}
                />
              </div>
            )}
            <div className="flex flex-col gap-2 mb-4 bg-background p-3 rounded-md border border-border">
              <div className="flex items-center gap-2">
                <p className="text-primary font-bold text-xl">予約するメニュー</p>
              </div>
              <span className="text-muted-foreground text-xs">
                ※メニューは最大5件まで選択できます。
              </span>
              <Popover open={menuPopoverOpen} onOpenChange={setMenuPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="mt-2 w-full justify-start h-fit border border-border"
                  >
                    {selectedMenus.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {uniqMenuIds.map((id) => {
                          const m = menus?.find((m) => m._id === id)
                          return m ? (
                            <Badge key={id} className="py-1 px-2">
                              {m.name}
                            </Badge>
                          ) : null
                        })}
                      </span>
                    ) : (
                      'メニューを選択'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-full max-w-[calc(100vw-60px)] py-2 px-4 overflow-y-auto h-full "
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  <Command>
                    <div className="flex items-center justify-between border-b">
                      <button
                        type="button"
                        onClick={() => setMenuPopoverOpen(false)}
                        className="p-2"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                        <span className="sr-only">閉じる</span>
                      </button>
                    </div>
                    <CommandList className=" py-8 overflow-y-auto">
                      {menus?.map((menu) => {
                        const count = getMenuCount(menu._id)
                        return (
                          <MenuSelectionItem
                            key={menu._id}
                            menu={menu}
                            count={count}
                            onAdd={() =>
                              addMenu({
                                id: menu._id,
                                name: menu.name,
                                price: menu.sale_price ?? menu.unit_price,
                                quantity: 1,
                              })
                            }
                            onRemove={() => removeMenu(menu._id)}
                            disabled={selectedMenus.length >= MAX_MENU_ITEMS}
                          />
                        )
                      })}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.menus && <p className="text-destructive text-sm">{errors.menus.message}</p>}
              {selectedMenus.length > 0 && (
                <div className="mt-2 bg-active-foreground p-3 rounded-md border border-active">
                  <Label className=" block text-active font-bold mb-2">選択中のメニュー</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {uniqMenuIds.map((menuId) => {
                      const menu = menus?.find((m) => m._id === menuId)
                      return menu ? (
                        <div
                          key={menuId}
                          className="bg-background px-3 py-1 rounded-md flex items-center gap-2 border border-border"
                        >
                          <span className="text-xs">
                            {menu.name}
                            {(() => {
                              const c = getMenuCount(menuId)
                              return c > 1 ? ` ×${c}` : ''
                            })()}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeMenuAll(menuId)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </button>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          {selectedMenus.length > 0 && availableStaff.length > 0 && (
            <div className="flex flex-col gap-2 mb-4 p-3 rounded-md border border-border">
              {formData === undefined && selectedMenus.length > 0 ? (
                <div className="flex items-center justify-center p-4 rounded-md">
                  <Loader2 className="h-5 w-5 animate-spin mr-2 text-active" />
                  <span className="text-active text-sm">スタッフを検索中...</span>
                </div>
              ) : selectedMenus.length > 0 && availableStaff.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-primary text-xl font-bold">施術するスタッフ</Label>
                  </div>
                  <Select
                    value={watch('staff_id') ?? ''}
                    onValueChange={(value: string) => {
                      setValue('staff_id', value)
                      setSelectedStaffId(value as Id<'staff'>)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="スタッフを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStaff.map((staff) => (
                        <SelectItem key={staff._id} value={staff._id}>
                          <span>{staff.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.staff_id && (
                    <p className="text-destructive text-sm">{errors.staff_id.message}</p>
                  )}
                  {selectedStaffId && (
                    <div className="flex flex-col bg-active-foreground p-3 rounded-md border border-active mt-3">
                      <p className="text-active text-sm font-bold mb-2">選択中のスタッフ</p>
                      <div className="flex items-center gap-2">
                        {selectStaff?.images?.[0]?.original_url ? (
                          <Image
                            src={selectStaff.images[0].original_url}
                            alt={selectStaff?.name ?? ''}
                            className="w-10 h-10 rounded-full object-cover"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            {selectStaff?.name?.slice(0, 1) ?? '?'}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <p className="text-active font-bold text-sm">{selectStaff?.name}</p>
                          <p className="text-active text-sm">
                            指名料 / ¥
                            {selectStaff?.extra_charge
                              ? selectStaff?.extra_charge.toLocaleString()
                              : '0'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                selectedMenus.length > 0 && (
                  <div className="flex flex-col bg-destructive-foreground w-fit p-3 rounded-md border border-destructive">
                    <p className="text-destructive text-sm">
                      選択したすべてのメニューに対応できるスタッフが見つかりません。メニューの組み合わせを変更してください。
                    </p>
                  </div>
                )
              )}
            </div>
          )}
          {selectedMenus.length > 0 && (
            <div className="flex flex-col gap-2 mb-4 bg-background p-3 rounded-md border border-border">
              {selectedMenus.length > 0 && (
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-primary text-xl font-bold">オプション(任意)</Label>
                  </div>
                  <Popover open={optionPopoverOpen} onOpenChange={setOptionPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="mt-2 w-full justify-start h-fit border border-border"
                      >
                        {selectedOptions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {selectedOptions.map((selectedOption) => {
                              const option = options?.find((o) => o._id === selectedOption.id)
                              return option ? (
                                <Badge key={option._id} className="py-1 px-2">
                                  {option?.name}
                                </Badge>
                              ) : null
                            })}
                          </div>
                        ) : (
                          'オプションを選択'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-full max-w-[calc(100vw-60px)] p-2"
                      onOpenAutoFocus={(event) => event.preventDefault()}
                    >
                      <Command>
                        <div className="flex justify-between items-center w-full border-b">
                          <button
                            type="button"
                            onClick={() => setOptionPopoverOpen(false)}
                            className="p-2 text-muted-foreground hover:text-muted-foreground"
                          >
                            <X className="w-4 h-4" aria-hidden="true" />
                            <span className="sr-only">閉じる</span>
                          </button>
                        </div>
                        <CommandList className="overflow-y-auto py-8">
                          {options?.map((option) => {
                            const count = getOptionCount(option._id)
                            return (
                              <CommandItem
                                key={option._id}
                                className="flex items-center justify-between w-full"
                              >
                                <div className="flex flex-col items-start gap-1 text-xs w-3/5">
                                  <p className="text-sm text-wrap overflow-hidden whitespace-nowrap">
                                    {option.name}
                                  </p>
                                  {option.duration_min && option.duration_min > 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      {option.duration_min}分
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-1 w-2/5">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => removeOption(option._id)}
                                    disabled={count === 0}
                                    className="p-1  border border-destructive hover:bg-destructive-foreground"
                                  >
                                    <Minus className="w-4 h-4 text-destructive" />
                                  </Button>
                                  <span className="w-5 text-center text-sm">{count}</span>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() =>
                                      addOption({
                                        id: option._id,
                                        name: option.name,
                                        price:
                                          option.unit_price ??
                                          option.sale_price ??
                                          option.unit_price,
                                        quantity: 1,
                                      })
                                    }
                                    disabled={
                                      count === 0 && selectedOptions.length >= MAX_OPTION_ITEMS
                                    }
                                    className="border border-active hover:bg-active-foreground"
                                  >
                                    <Plus className="w-4 h-4 text-active" />
                                  </Button>
                                </div>
                              </CommandItem>
                            )
                          })}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.options && (
                    <p className="text-destructive text-sm">{errors.options.message}</p>
                  )}
                </div>
              )}
              {selectedOptions.length > 0 && (
                <div className="bg-active-foreground p-3 rounded-md border border-active mt-2">
                  <Label className="mb-2 block text-active font-bold">選択中のオプション</Label>
                  <div className="flex flex-wrap gap-2 pt-1 ">
                    {selectedOptions.map((selectedOption) => {
                      const option = options?.find((o) => o._id === selectedOption.id)
                      return option ? (
                        <div
                          key={selectedOption.id}
                          className="bg-background px-3 py-1 rounded-md flex items-center gap-2 border border-border"
                        >
                          <span className="text-xs">
                            {option.name}
                            {(() => {
                              const c = getOptionCount(option._id)
                              return c > 1 ? ` ×${c}` : ''
                            })()}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeOption(option._id)}
                            className="text-muted-foreground hover:text-muted-foreground"
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </button>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {selectedMenus.length > 0 && (
            <div className="flex flex-col gap-2 mb-4 bg-background p-3 rounded-md border border-border">
              {selectedMenus.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-primary text-xl font-bold">予約日</Label>
                  </div>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-[300px] justify-start text-left font-normal border border-border',
                          !selectdate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon />
                        {selectdate ? format(selectdate, 'yyyy/MM/dd') : <span>予約日を選択</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        fromDate={new Date()}
                        toDate={toDate}
                        disabled={[
                          ...(orgExceptionSchedules.results.map((day) => new Date(day.date)) ?? []),
                          // サロンの営業曜日外を除外
                          (date: Date) => {
                            const dayKey = getDayOfWeek(date)

                            const orgWeekSchedule = orgWeekSchedules?.find(
                              (s) => s.day_of_week === dayKey
                            )
                            const staffWeekSchedule = staffWeekSchedules?.find(
                              (s) => s.day_of_week === dayKey
                            )

                            // 営業スケジュールがあれば isOpen が false の日を無効化。見つからなければ無効化しない。
                            return (
                              (orgWeekSchedule ? !orgWeekSchedule.is_open : false) ||
                              (staffWeekSchedule ? !staffWeekSchedule.is_open : false)
                            )
                          },
                        ]}
                        className="rounded-md"
                        mode="single"
                        locale={ja}
                        selected={selectdate ?? undefined}
                        onSelect={(day) => {
                          setSelectDate(day as Date)
                          setCalendarOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              {selectdate && selectedStaffId && selectedMenus.length > 0 && (
                <div className="mt-4">
                  <Label className="mb-2 block text-primary font-bold">
                    予約可能時間
                    <span className="ml-3 text-muted-foreground text-sm font-bold">
                      {selectdate.toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </Label>

                  {availableTimeSlots.length > 0 ? (
                    <div className="grid grid-cols-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 mt-2">
                      {availableTimeSlots.map((slot, index) => (
                        <button
                          key={index}
                          type="button"
                          className={`flex items-center justify-center py-2 px-4 text-sm font-medium rounded-md border ${
                            watch('start_time_unix') ===
                            convertHourToTimestamp(slot.startHour, formattedDate)
                              ? 'bg-active-foreground text-active border-active'
                              : 'border-border bg-background hover:bg-muted hover:text-muted-foreground'
                          }`}
                          onClick={() => {
                            // 日付込みでタイムスタンプ生成
                            const timestampStart = convertHourToTimestamp(
                              slot.startHour,
                              formattedDate
                            )!
                            const timestampEnd = convertHourToTimestamp(
                              slot.endHour,
                              formattedDate
                            )!
                            setValue('start_time_unix', timestampStart)
                            setValue('end_time_unix', timestampEnd)
                            setSelectTime({
                              startTimeUnix: timestampStart,
                              endTimeUnix: timestampEnd,
                            })
                          }}
                        >
                          <p className="text-xs text-balance">
                            {slot.startHour && <span>{slot.startHour}</span>}
                            {slot.endHour && <span> 〜 {slot.endHour}</span>}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-background p-4 rounded-md mt-2 text-center">
                      <p className="text-muted-foreground">選択した日時に空き枠がありません</p>
                    </div>
                  )}
                </div>
              )}
              <ZodTextField
                ghost
                register={register}
                errors={errors}
                name="startTimeUnix"
                type="number"
                label="開始時間 UNIXタイム"
              />
              <ZodTextField
                ghost
                register={register}
                errors={errors}
                name="endTimeUnix"
                type="number"
                label="終了時間 UNIXタイム"
              />
            </div>
          )}
          <Textarea
            {...register('notes')}
            placeholder="例:くせ毛が強いので、扱いやすいスタイルにして欲しいとの事でした。"
            className="resize-none mt-4"
            rows={8}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mt-12">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">選択したメニュー</p>
            <div className="flex flex-col">
              {uniqMenuIds.length > 0 ? (
                uniqMenuIds.map((menuId) => {
                  const menu = menus?.find((m) => m._id === menuId)
                  const price =
                    menu?.sale_price && menu?.sale_price > 0
                      ? menu?.sale_price
                      : (menu?.unit_price ?? 0)
                  return (
                    menu && (
                      <div
                        key={menuId}
                        className="w-full flex items-center justify-between gap-2 p-2 text-xs bg-background  border-b border-border"
                      >
                        <p className="text-primary font-bold text-sm">{menu.name}</p>
                        <p className="text-primary font-bold text-sm"> ¥{price.toLocaleString()}</p>
                      </div>
                    )
                  )
                })
              ) : (
                <p className="text-muted-foreground text-sm">メニューを選択してください</p>
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">選択したオプション</p>
            <div className="flex flex-col">
              {selectedOptions.length > 0 ? (
                selectedOptions.map((selectedOption) => {
                  const option = options?.find((o) => o._id === selectedOption.id)
                  return (
                    option && (
                      <div
                        key={selectedOption.id}
                        className="w-full flex items-center justify-between gap-2 p-2 text-xs bg-background  border-b border-border"
                      >
                        <p className="text-primary font-bold text-sm">{option.name}</p>
                        <p className="text-primary font-bold text-sm">
                          {' '}
                          {option.sale_price
                            ? `¥${option.sale_price.toLocaleString()}`
                            : `¥${option.unit_price?.toLocaleString()}`}
                        </p>
                      </div>
                    )
                  )
                })
              ) : (
                <p className="text-muted-foreground text-sm">オプションは選択されていません</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <p className="text-muted-foreground text-xs text-nowrap">施術者</p>
            <div className="flex items-center gap-2 bg-background p-2 border-b border-border">
              {selectStaff?.images?.[0]?.thumbnail_url ? (
                <Avatar className="w-8 h-8">
                  <AvatarImage
                    className="object-cover"
                    src={selectStaff.images[0].thumbnail_url}
                    alt={selectStaff.name}
                  />
                </Avatar>
              ) : (
                <Avatar className="w-8 h-8">
                  <AvatarFallback>{selectStaff?.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
              )}
              <div className="flex items-center justify-between gap-2 w-full">
                <p className="text-sm font-bold text-primary">{selectStaff?.name ?? '—'}</p>
                <p className="text-sm text-primary font-bold">
                  <span className="text-primary font-light text-xs">指名料</span> ¥
                  {selectStaff?.extra_charge ? selectStaff?.extra_charge.toLocaleString() : '0'}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end w-full">
          <Button
            className="w-fit mb-8"
            type="submit"
            disabled={isSubmitting || selectedMenus.length === 0 || !selectedStaffId}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                予約中...
              </span>
            ) : (
              '予約を作成'
            )}
          </Button>
        </div>
      </form>
      <div className="sticky bottom-0 left-0 right-0 z-10 bg-background text-primary flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-6 py-4 backdrop-blur rounded-md border">
        <div className="relative flex flex-col md:flex-row w-full items-start md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row justify-between w-full">
            <div className="w-full md:w-1/3 flex flex-col items-start justify-between gap-2">
              <div>
                {selectdate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground md:ml-auto whitespace-nowrap">
                    <span className="font-semibold">{format(selectdate, 'yyyy年MM月dd日')}</span>
                    {selectTime && (
                      <span>
                        {formatTimestamp(watch('start_time_unix')!, {
                          useJST: true,
                        })}{' '}
                        ~{' '}
                        {formatTimestamp(watch('end_time_unix')!, {
                          useJST: true,
                        })}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2">
                <Label className="text-xs">合計金額</Label>
                <p className="text-lg font-bold ml-2 md:ml-0">
                  ¥{totalPriceCalculated.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-between md:justify-end gap-2 md:gap-4 text-xs mt-2 md:mt-0 w-full md:w-2/3">
              <div className="border bg-background border-active p-1.5 rounded-md text-active flex  md:flex-row items-center w-fit sm:w-auto">
                <Label className="text-xs text-active">トータル施術時間 / </Label>{' '}
                <p className=" font-bold">{totalTimeMinutes} 分</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}