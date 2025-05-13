// 予約作成画面
// /app/(salon)/dashboard/reservation/add/ReservationForm.tsx

'use client'
import Link from 'next/link'
import { convertHourToUnixTimestamp } from '@/lib/schedule'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useDebounce } from 'use-debounce'
import Image from 'next/image'
import { ja } from 'date-fns/locale'
import { TagInput } from '@/components/common'
import { Textarea } from '@/components/ui/textarea'
import { getDayOfWeek, formatJpTime } from '@/lib/schedule'
import { convertGender, PaymentMethod } from '@/services/convex/shared/types/common'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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

import type { TimeRange } from '@/lib/type'

import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandList, CommandInput, CommandItem } from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Loader2, X, Plus, Minus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useZodForm } from '@/hooks/useZodForm'
import { useSalon } from '@/hooks/useSalon'
import { ZodTextField } from '@/components/common'
import { Loading } from '@/components/common'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useMutation } from 'convex/react'

import {
  RESERVATION_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
  GENDER_VALUES,
} from '@/services/convex/shared/types/common'
const schemaReservation = z
  .object({
    customerId: z.string().optional(), // 顧客ID
    staffId: z.string().optional(), // スタッフID
    staffName: z.string().optional(), // スタッフ名
    customerLastName: z.string().optional(), // 顧客名（姓）
    customerFirstName: z.string().optional(), // 顧客名（名）
    customerPhone: z.string().optional(), // 顧客電話番号
    customerGender: z.preprocess(preprocessEmptyString, z.enum(GENDER_VALUES)).optional(), // 顧客性別
    customerBirthday: z.string().optional(), // 顧客生年月日
    customerTags: z.array(z.string()).optional(), // タグ
    customerNotes: z.string().optional(), // 備考
    menus: z
      .preprocess(
        preprocessStringArray,
        z.array(
          z.object({
            menuId: z.string(),
            quantity: z.number(),
          })
        )
      )
      .optional(), // メニューID（複数選択可能に変更）
    salonId: z.string().optional(), // サロンID
    options: z
      .preprocess(
        preprocessStringArray,
        z.array(
          z.object({
            optionId: z.string(),
            quantity: z.number(),
          })
        )
      )
      .optional(), // オプションID（カンマ区切り → 配列）
    unitPrice: z.preprocess(preprocessNumber, z.number()).optional(), // 単価
    totalPrice: z.preprocess(preprocessNumber, z.number()).optional(), // 合計金額
    status: z.preprocess(preprocessEmptyString, z.enum(RESERVATION_STATUS_VALUES)).optional(), // 予約ステータス
    startTime_unix: z.preprocess(preprocessNumber, z.number()).optional(), // 開始時間 UNIXタイム
    endTime_unix: z.preprocess(preprocessNumber, z.number()).optional(), // 終了時間 UNIXタイム
    usePoints: z.preprocess(preprocessNumber, z.number()).optional(), // 使用ポイント数
    couponId: z.string().optional(), // クーポンID
    featuredHairimgPath: z.string().optional(), // 顧客が希望する髪型の画像ファイルパス
    notes: z.string().optional(), // 備考
    paymentMethod: z.preprocess(preprocessEmptyString, z.enum(PAYMENT_METHOD_VALUES)).optional(), // 支払い方法
    isFirstCustomer: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.isFirstCustomer) {
        return !!data.customerFirstName && !!data.customerLastName && !!data.customerPhone
      }
      return true
    },
    {
      message: '新規顧客の場合、姓・名・電話番号は必須です',
      path: ['customerFirstName'], // エラー表示位置（必要に応じて他も追加可）
    }
  )

import { Input } from '@/components/ui/input'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fetchQuery } from 'convex/nextjs'
import { Id, Doc } from '@/convex/_generated/dataModel'
import { Gender } from '@/services/convex/shared/types/common'
import { handleErrorToMsg } from '@/lib/error'

type AvailableStaff = {
  _id: Id<'staff'>
  name: string
  staffName: string
  age: number
  email: string
  gender: Gender
  description: string
  imgPath: string
  thumbnailPath: string
  extraCharge: number
  priority: number
}

export default function ReservationForm() {
  const { salonId, salon } = useSalon()
  const router = useRouter()
  const [isFirstCustomer, setIsFirstCustomer] = useState<boolean>(true)
  // 複数選択に対応するためにstateを配列に変更
  const [selectedMenus, setSelectedMenus] = useState<{ menuId: Id<'menu'>; quantity: number }[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<Id<'staff'> | null>(null)
  const [selectdate, setSelectDate] = useState<Date | null>(null)
  const [selectTime, setSelectTime] = useState<{
    startTime_unix: number | undefined
    endTime_unix: number | undefined
  } | null>(null)
  const [searchName, setSearchName] = useState<string>('')
  const [reservationCustomer, setReservationCustomer] = useState<Doc<'customer'> | null>(null)
  const [debouncedSearchName] = useDebounce(searchName, 1000)
  const [selectedOptions, setSelectedOptions] = useState<
    { optionId: Id<'salon_option'>; quantity: number }[]
  >([])
  const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([])
  const [isLoadingStaff, setIsLoadingStaff] = useState<boolean>(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  // メニュー & オプションのポップオーバー
  const [menuPopoverOpen, setMenuPopoverOpen] = useState(false)
  const [optionPopoverOpen, setOptionPopoverOpen] = useState(false)
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false)
  // メニュー選択の上限（数量合計）
  const MAX_MENU_ITEMS = 5
  // オプション選択の上限（ユニーク件数）
  const MAX_OPTION_ITEMS = 5
  const scheduleConfig = useQuery(
    api.salon.schedule.query.findBySalonId,
    salonId
      ? {
          salonId: salonId,
        }
      : 'skip'
  )

  const { results: menus } = usePaginatedQuery(
    api.menu.core.query.listBySalonId,
    salonId
      ? {
          salonId: salonId,
        }
      : 'skip',
    {
      initialNumItems: 100,
    }
  )

  const { results: options } = usePaginatedQuery(
    api.option.query.list,
    salonId
      ? {
          salonId: salonId,
        }
      : 'skip',
    { initialNumItems: 100 }
  )

  const salonWeekSchedules = useQuery(
    api.schedule.salon_week_schedule.query.getAllBySalonId,
    salonId
      ? {
          salonId: salonId,
        }
      : 'skip'
  )

  const staffWeekSchedules = useQuery(
    api.schedule.staff_week_schedule.query.getBySalonAndStaffId,
    salonId && selectedStaffId
      ? {
          salonId: salonId,
          staffId: selectedStaffId,
        }
      : 'skip'
  )

  const salonExceptionSchedules = useQuery(
    api.schedule.salon_exception.query.displayExceptionSchedule,
    salonId
      ? {
          salonId: salonId,
          take: 20,
          dateString: new Date().toISOString().split('T')[0],
        }
      : 'skip'
  )
  const customers = usePaginatedQuery(
    api.customer.core.query.findByName,
    salonId
      ? {
          salonId: salonId,
          searchName: debouncedSearchName,
        }
      : 'skip',
    {
      initialNumItems: 100,
    }
  )
  const createReservation = useMutation(api.reservation.mutation.create)
  const createCustomerComplete = useMutation(api.customer.core.mutation.createCompleteFields)

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

  useEffect(() => {
    if (!salonId) return
    reset({
      customerId: undefined, // 顧客ID
      staffId: undefined, // スタッフID
      staffName: undefined, // スタッフ名
      menus: [], // メニューID（複数）
      salonId: salonId, // サロンID
      status: 'pending', // 予約ステータス
      options: [], // オプションID
      unitPrice: undefined, // 単価
      totalPrice: undefined, // 合計金額
      startTime_unix: undefined, // 開始時間 UNIXタイム
      endTime_unix: undefined, // 終了時間 UNIXタイム
      usePoints: undefined, // 使用ポイント数
      couponId: undefined, // クーポンID
      featuredHairimgPath: undefined, // 顧客が希望する髪型の画像ファイルパス
      notes: undefined, // 備考
      paymentMethod: 'cash', // 支払い方法
    })
  }, [salonId, reset])

  useEffect(() => {
    if (selectedMenus.length === 0 || !salonId) {
      setAvailableStaff([])
      return
    }

    const getAvailableStaffForAllMenus = async () => {
      setIsLoadingStaff(true)
      try {
        // 最初のメニューに対応するスタッフを取得
        const firstMenuStaffs = (await fetchQuery(api.staff.core.query.findAvailableStaffByMenu, {
          salonId: salonId,
          menuId: selectedMenus[0].menuId,
        })) as AvailableStaff[]

        if (selectedMenus.length === 1) {
          // 単一メニューの場合はそのまま設定
          setAvailableStaff(firstMenuStaffs)
        } else {
          // 複数メニューの場合は、各メニューに対応するスタッフを取得して共通するスタッフを抽出
          let eligibleStaff = [...firstMenuStaffs]

          // 2番目以降のメニューについてループ
          for (let i = 1; i < selectedMenus.length; i++) {
            const menuId = selectedMenus[i].menuId
            const menuStaffs = (await fetchQuery(api.staff.core.query.findAvailableStaffByMenu, {
              salonId: salonId,
              menuId: menuId,
            })) as AvailableStaff[]

            // 共通するスタッフのみをフィルタリング
            eligibleStaff = eligibleStaff.filter((staff) =>
              menuStaffs.some((menuStaff) => menuStaff._id === staff._id)
            )

            // 共通するスタッフがいない場合は早期リターン
            if (eligibleStaff.length === 0) break
          }

          setAvailableStaff(eligibleStaff)
        }
      } catch (error) {
        toast.error(handleErrorToMsg(error))
        setAvailableStaff([])
      } finally {
        setIsLoadingStaff(false)
      }
    }

    getAvailableStaffForAllMenus()
  }, [selectedMenus, salonId])

  // 合計所要時間 (メニューとオプションの timeToMin を合算)
  const totalTimeMinutes = React.useMemo(() => {
    const menuTime = selectedMenus.reduce((sum, item) => {
      const menu = menus.find((m) => m._id === item.menuId)
      return sum + (menu?.timeToMin ?? 0)
    }, 0)

    // ✅ 数量を掛ける
    const optionTime = selectedOptions.reduce((sum, item) => {
      const option = options.find((o) => o._id === item.optionId)
      return sum + (option?.timeToMin ?? 0) * item.quantity
    }, 0)

    return menuTime + optionTime
  }, [selectedMenus, menus, selectedOptions, options])

  // 選択されたメニューの合計金額 (salePrice が 0 か未定義の場合は unitPrice)
  const menuTotalPrice = React.useMemo(() => {
    return selectedMenus.reduce((sum, item) => {
      const menu = menus.find((m) => m._id === item.menuId)
      if (!menu) return sum
      const price = menu.salePrice && menu.salePrice > 0 ? menu.salePrice : (menu.unitPrice ?? 0)
      return sum + price
    }, 0)
  }, [selectedMenus, menus])

  // optionTotalPrice
  const optionTotalPrice = selectedOptions.reduce((sum, item) => {
    const option = options.find((o) => o._id === item.optionId)
    if (!option) return sum
    const price =
      option.salePrice && option.salePrice > 0 ? option.salePrice : (option.unitPrice ?? 0)
    return sum + price * item.quantity
  }, 0)

  // スタッフ指名料
  const extraChargePrice = React.useMemo(() => {
    return selectedStaffId
      ? (availableStaff.find((s) => s._id === selectedStaffId)?.extraCharge ?? 0)
      : 0
  }, [selectedStaffId, availableStaff])

  // 総合計金額をフォームの totalPrice にセット
  const totalPriceCalculated = menuTotalPrice + optionTotalPrice + extraChargePrice

  useEffect(() => {
    setValue('totalPrice', totalPriceCalculated)
    setValue('unitPrice', menuTotalPrice)
  }, [setValue, totalPriceCalculated, menuTotalPrice, optionTotalPrice, extraChargePrice])

  // 日付とスタッフの変更で空き時間を取得
  useEffect(() => {
    const getAvailableTimeSlots = async () => {
      if (selectedStaffId && salonId && selectdate && totalTimeMinutes) {
        // 日付をYYYY-MM-DD形式に変換
        const formattedDate = format(selectdate, 'yyyy-MM-dd')

        try {
          // newAvailableTimeSlotsはスタッフごとの配列を返す
          const result = await fetchQuery(api.reservation.query.calculateReservationTime, {
            salonId: salonId,
            staffId: selectedStaffId,
            date: formattedDate,
            durationMin: totalTimeMinutes,
          })

          // 結果が配列で返され、選択したスタッフのスロットを含む場合
          if (Array.isArray(result) && result.length > 0) {
            setAvailableTimeSlots(result)
          } else {
            setAvailableTimeSlots([])
          }
        } catch (error) {
          toast.error(handleErrorToMsg(error))
          setAvailableTimeSlots([])
        }
      } else {
        // 必要な情報が揃っていない場合は空にする
        setAvailableTimeSlots([])
      }
    }
    getAvailableTimeSlots()
  }, [selectedStaffId, salonId, selectdate, totalTimeMinutes])

  // ─────────────────────────
  // メニュー数量操作用ヘルパー
  // ─────────────────────────
  const getMenuCount = React.useCallback(
    (id: Id<'menu'>) => selectedMenus.filter((m) => m.menuId === id).length,
    [selectedMenus]
  )

  // 選択中メニュー ID を一意にした配列
  const uniqMenuIds = React.useMemo(
    () => Array.from(new Set(selectedMenus.map((m) => m.menuId))),
    [selectedMenus]
  )

  const calcMenuSubTotal = React.useCallback(
    (ids: Id<'menu'>[]) =>
      ids.reduce((sum, id) => {
        const menu = menus.find((m) => m._id === id)
        if (!menu) return sum
        const price = menu.salePrice && menu.salePrice > 0 ? menu.salePrice : (menu.unitPrice ?? 0)
        return sum + price
      }, 0),
    [menus]
  )

  const addMenu = (menuId: Id<'menu'>) => {
    if (selectedMenus.length >= MAX_MENU_ITEMS) {
      toast.error(`メニューは最大 ${MAX_MENU_ITEMS} 件まで選択できます。`)
      return
    }
    const newMenus = [...selectedMenus, { menuId: menuId, quantity: 1 }]
    setSelectedMenus(newMenus)
    setValue('menus', newMenus)
    setValue('unitPrice', calcMenuSubTotal(newMenus.map((m) => m.menuId)))
    // メニュー変更時はスタッフをリセット
    setSelectedStaffId(null)
    setValue('staffId', '')
  }

  const removeMenu = (menuId: Id<'menu'>) => {
    const idx = selectedMenus.findIndex((m) => m.menuId === menuId)
    if (idx === -1) return
    const newMenus = [...selectedMenus]
    newMenus.splice(idx, 1)
    setSelectedMenus(newMenus)
    setValue('menus', newMenus)
    setValue('unitPrice', calcMenuSubTotal(newMenus.map((m) => m.menuId)))
    if (newMenus.length === 0) {
      setSelectedStaffId(null)
      setValue('staffId', '')
    }
  }

  // 指定メニュー ID をすべて取り除く
  const removeMenuAll = (menuId: Id<'menu'>) => {
    const newMenus = selectedMenus.filter((m) => m.menuId !== menuId)
    setSelectedMenus(newMenus)
    setValue('menus', newMenus)
    setValue('unitPrice', calcMenuSubTotal(newMenus.map((m) => m.menuId)))
    if (newMenus.length === 0) {
      setSelectedStaffId(null)
      setValue('staffId', '')
    }
  }

  const getOptionCount = React.useCallback(
    (id: Id<'salon_option'>) => selectedOptions.find((o) => o.optionId === id)?.quantity ?? 0,
    [selectedOptions]
  )

  const addOption = (optionId: Id<'salon_option'>) => {
    const existing = selectedOptions.find((o) => o.optionId === optionId)

    // まだ存在しないオプションを追加する際、上限チェック
    if (!existing && selectedOptions.length >= MAX_OPTION_ITEMS) {
      toast.error(`オプションは最大 ${MAX_OPTION_ITEMS} 件まで選択できます。`)
      return
    }

    const newOpts = existing
      ? selectedOptions.map((o) =>
          o.optionId === optionId ? { ...o, quantity: o.quantity + 1 } : o
        )
      : [...selectedOptions, { optionId, quantity: 1 }]

    setSelectedOptions(newOpts)
    setValue('options', newOpts)
  }

  const removeOption = (optionId: Id<'salon_option'>) => {
    const existing = selectedOptions.find((o) => o.optionId === optionId)
    if (!existing) return
    const newOpts =
      existing.quantity > 1
        ? selectedOptions.map((o) =>
            o.optionId === optionId ? { ...o, quantity: o.quantity - 1 } : o
          )
        : selectedOptions.filter((o) => o.optionId !== optionId)
    setSelectedOptions(newOpts)
    setValue('options', newOpts)
  }
  const onSubmit = async (data: z.infer<typeof schemaReservation>) => {
    if (!salonId) return
    try {
      const { isAvailable } = await fetchQuery(
        api.reservation.query.countAvailableSheetInTimeRange,
        {
          salonId: salonId as Id<'salon'>,
          startTime: data.startTime_unix as number,
          endTime: data.endTime_unix as number,
        }
      )
      if (!isAvailable) {
        toast.error('同時に予約できる人数を超えています。')
        return
      }

      let customerId: Id<'customer'> | undefined
      let customerName: string | undefined
      if (!isFirstCustomer) {
        customerId = await createCustomerComplete({
          salonId: salonId as Id<'salon'>,
          lastName: data.customerLastName ?? undefined,
          firstName: data.customerFirstName ?? undefined,
          gender: data.customerGender ?? undefined,
          birthday: data.customerBirthday ?? undefined,
          tags: data.customerTags ?? undefined,
          phone: data.customerPhone ?? undefined,
          notes: data.notes ?? undefined,
        })
        customerName =
          (data.customerLastName ? data.customerLastName : '') +
          (data.customerFirstName ? ' ' + data.customerFirstName : '')
      } else {
        customerId = reservationCustomer?._id ?? undefined
        customerName =
          (reservationCustomer?.lastName ?? '') +
          (reservationCustomer?.firstName ? ' ' + reservationCustomer?.firstName : '')
      }

      await createReservation({
        customerId: customerId,
        customerName: customerName,
        salonId: salonId as Id<'salon'>,
        menus: data.menus as { menuId: Id<'menu'>; quantity: number }[],
        startTime_unix: data.startTime_unix as number,
        endTime_unix: data.endTime_unix as number,
        status: 'confirmed',
        unitPrice: data.unitPrice as number,
        staffId: selectStaff?._id as Id<'staff'>,
        staffName: selectStaff?.name ?? undefined,
        couponId: data.couponId as Id<'coupon'>,
        usePoints: data.usePoints as number,
        notes: data.notes as string,
        paymentMethod: data.paymentMethod as PaymentMethod,
        totalPrice: data.totalPrice as number,
        options: data.options as { optionId: Id<'salon_option'>; quantity: number }[],
      })

      toast.success('予約が完了しました')
      router.push('/dashboard/reservation')
    } catch (error) {
      toast.error(handleErrorToMsg(error))
    }
  }

  const selectStaff = availableStaff.find((staff) => staff._id === selectedStaffId)

  const toDate = scheduleConfig?.reservationLimitDays
    ? new Date(
        new Date().setDate(new Date().getDate() + (scheduleConfig.reservationLimitDays ?? 30))
      )
    : undefined

  if (!salon || !salonId) return <Loading />

  console.log(isFirstCustomer)
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
                {customers && customers.results.length > 0 ? (
                  customers.results.map((customer) => {
                    return (
                      <div key={customer._id}>
                        <p className="text-primary text-sm font-bold mb-1">検索結果</p>
                        <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant={'outline'}
                              className="w-full justify-start h-fit border border-border"
                            >
                              {customer.lastName && customer.lastName !== '未登録'
                                ? customer.lastName + ' '
                                : ''}
                              {customer.firstName && customer.firstName !== '未登録'
                                ? customer.firstName + ' '
                                : ''}
                              {customer.lineUserName && customer.lineUserName !== '未登録'
                                ? customer.lineUserName + '　'
                                : ''}
                              {customer.phone ? 'tel:' + customer.phone : ''}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-full min-w-[350px] p-2 overflow-y-auto h-fit"
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
                                {customers.results.map((customer) => {
                                  return (
                                    <CommandItem
                                      key={customer._id}
                                      className="flex items-center justify-between cursor-pointer"
                                      onSelect={() => {
                                        setReservationCustomer(customer)
                                        setCustomerPopoverOpen(false)
                                      }}
                                    >
                                      <div className="flex items-start gap-1 text-xs">
                                        {customer.lastName && customer.lastName !== '未登録'
                                          ? customer.lastName + ' '
                                          : ''}
                                        {customer.firstName && customer.firstName !== '未登録'
                                          ? customer.firstName + ' '
                                          : ''}
                                        {customer.lineUserName && customer.lineUserName !== '未登録'
                                          ? customer.lineUserName + '　'
                                          : ''}
                                        {customer.phone ? 'tel:' + customer.phone : ''}
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
                    )
                  })
                ) : searchName.length > 0 ? (
                  <p className="text-warning-foreground text-sm text-center bg-warning border border-warning-foreground p-4 rounded-md">
                    顧客が見つかりません
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm text-center bg-muted border border-border p-4 rounded-md">
                    顧客を検索してください。
                  </p>
                )}
                {reservationCustomer && (
                  <div className="flex flex-col gap-2 mt-2 bg-active-foreground border border-active p-3 rounded-md">
                    <p className="text-active text-sm font-bold">予約する顧客</p>
                    <p className="text-active text-sm">
                      {reservationCustomer.lastName ? reservationCustomer.lastName + ' ' : null}
                      {reservationCustomer.firstName ? reservationCustomer.firstName + ' ' : null}
                      {reservationCustomer.lineUserName
                        ? reservationCustomer.lineUserName + '　'
                        : null}
                      {reservationCustomer.phone ? 'tel:' + reservationCustomer.phone : null}
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
                    name="customerLastName"
                    placeholder="姓"
                    className="w-full"
                    errors={errors}
                    label="姓"
                  />
                  <ZodTextField
                    register={register}
                    name="customerFirstName"
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
                    name="customerPhone"
                    placeholder="電話番号"
                    className="w-full"
                    errors={errors}
                    label="電話番号"
                  />
                  <div className="flex flex-col">
                    <Label className="text-sm ml-2">性別</Label>
                    <Select
                      value={watch('customerGender') ?? ''}
                      onValueChange={(value: string) => {
                        setValue('customerGender', value as Gender)
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
                    value={watch('customerBirthday') ?? ''}
                    onChange={(e) => setValue('customerBirthday', e.target.value)}
                  />
                </div>
                <TagInput
                  tags={watch('customerTags') ?? []}
                  setTagsAction={(value: string[]) => setValue('customerTags', value)}
                />
                <Textarea
                  placeholder="備考"
                  rows={8}
                  value={watch('customerNotes') ?? ''}
                  onChange={(e) => setValue('customerNotes', e.target.value)}
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
                          const m = menus.find((m) => m._id === id)
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
                  className="w-full min-w-[350px] max-w-[500px] py-2 px-4 overflow-y-auto h-full "
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  <Command>
                    <div className="flex items-center justify-between border-b">
                      <CommandInput
                        placeholder="メニューを検索…"
                        className="flex-1 border-0 focus:ring-0"
                      />
                      <button
                        type="button"
                        onClick={() => setMenuPopoverOpen(false)}
                        className="p-2"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                        <span className="sr-only">閉じる</span>
                      </button>
                    </div>
                    <CommandList className=" max-h-[calc(100vh-200px)] max-w-[calc(100vw-50px)] py-8 overflow-y-auto">
                      {menus.map((menu) => {
                        const count = getMenuCount(menu._id)
                        return (
                          <CommandItem
                            key={menu._id}
                            className="flex items-center justify-between w-full"
                          >
                            {menu.imgPath && (
                              <Image
                                src={menu.imgPath}
                                alt={menu.name ?? ''}
                                className="w-10 h-10 rounded-full max-w-[40px] max-h-[40px] min-w-[40px] min-h-[40px]"
                                width={40}
                                height={40}
                              />
                            )}
                            <div className="flex flex-col justify-start w-full items-start gap-1 text-xs">
                              <p className="text-sm">{menu.name}</p>
                              <div>
                                {menu.salePrice && menu.salePrice > 0 ? (
                                  <>
                                    <span className="line-through text-muted-foreground">
                                      ￥{menu.unitPrice?.toLocaleString()}
                                    </span>
                                    <span className="font-semibold text-active">
                                      ￥{menu.salePrice.toLocaleString()}
                                    </span>
                                  </>
                                ) : (
                                  <span className="">￥{menu.unitPrice?.toLocaleString()}</span>
                                )}
                                <div className="flex items-center gap-1">
                                  <p>{menu.timeToMin}分</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => removeMenu(menu._id)}
                                disabled={count === 0}
                                className="p-1 disabled:opacity-30 border border-destructive hover:bg-destructive-foreground"
                              >
                                <Minus className="w-4 h-4 text-destructive" />
                              </Button>
                              <span className="w-5 text-center text-sm">{count}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => addMenu(menu._id)}
                                disabled={selectedMenus.length >= MAX_MENU_ITEMS}
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
              {errors.menus && <p className="text-destructive text-sm">{errors.menus.message}</p>}
              {selectedMenus.length > 0 && (
                <div className="mt-2 bg-active-foreground p-3 rounded-md border border-active">
                  <Label className=" block text-active font-bold mb-2">選択中のメニュー</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {uniqMenuIds.map((menuId) => {
                      const menu = menus.find((m) => m._id === menuId)
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
              {isLoadingStaff ? (
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
                    value={watch('staffId') ?? ''}
                    onValueChange={(value: string) => {
                      setValue('staffId', value)
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
                  {errors.staffId && (
                    <p className="text-destructive text-sm">{errors.staffId.message}</p>
                  )}
                  {selectedStaffId && (
                    <div className="flex flex-col bg-active-foreground p-3 rounded-md border border-active mt-3">
                      <p className="text-active text-sm font-bold mb-2">選択中のスタッフ</p>
                      <div className="flex items-center gap-2">
                        {selectStaff?.thumbnailPath ? (
                          <Image
                            src={selectStaff.thumbnailPath}
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
                            {selectStaff?.extraCharge
                              ? selectStaff?.extraCharge.toLocaleString()
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
                              const option = options.find((o) => o._id === selectedOption.optionId)
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
                      className="w-full min-w-[320px] p-2"
                      onOpenAutoFocus={(event) => event.preventDefault()}
                    >
                      <Command>
                        <div className="flex justify-between items-center w-full border-b">
                          <CommandInput
                            placeholder="オプションを検索..."
                            className=" border-0 focus:ring-0 w-full"
                          />
                          <button
                            type="button"
                            onClick={() => setOptionPopoverOpen(false)}
                            className="p-2 text-muted-foreground hover:text-muted-foreground"
                          >
                            <X className="w-4 h-4" aria-hidden="true" />
                            <span className="sr-only">閉じる</span>
                          </button>
                        </div>
                        <CommandList className="max-h-[300px] max-w-[100vw] overflow-y-auto py-8">
                          {options.map((option) => {
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
                                  {option.timeToMin && option.timeToMin > 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      {option.timeToMin}分
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
                                    onClick={() => addOption(option._id)}
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
                      const option = options.find((o) => o._id === selectedOption.optionId)
                      return option ? (
                        <div
                          key={selectedOption.optionId}
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
                          'w-[240px] justify-start text-left font-normal border border-border',
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
                          ...(salonExceptionSchedules?.map((day) => new Date(day.date)) ?? []),
                          // サロンの営業曜日外を除外
                          (date: Date) => {
                            const dayKey = getDayOfWeek(date)

                            const salonWeekSchedule = salonWeekSchedules?.find(
                              (s) => s.dayOfWeek === dayKey
                            )
                            const staffWeekSchedule = staffWeekSchedules?.find(
                              (s) => s.dayOfWeek === dayKey
                            )

                            // 営業スケジュールがあれば isOpen が false の日を無効化。見つからなければ無効化しない。
                            return (
                              (salonWeekSchedule ? !salonWeekSchedule.isOpen : false) ||
                              (staffWeekSchedule ? !staffWeekSchedule.isOpen : false)
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
                            watch('startTime_unix') ===
                            convertHourToUnixTimestamp(slot.startHour, formattedDate)
                              ? 'bg-active-foreground text-active border-active'
                              : 'border-border bg-background hover:bg-muted hover:text-muted-foreground'
                          }`}
                          onClick={() => {
                            // 日付込みでタイムスタンプ生成
                            const timestampStart = convertHourToUnixTimestamp(
                              slot.startHour,
                              formattedDate
                            )!
                            const timestampEnd = convertHourToUnixTimestamp(
                              slot.endHour,
                              formattedDate
                            )!
                            setValue('startTime_unix', timestampStart)
                            setValue('endTime_unix', timestampEnd)
                            setSelectTime({
                              startTime_unix: timestampStart,
                              endTime_unix: timestampEnd,
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
                name="startTime_unix"
                type="number"
                label="開始時間 UNIXタイム"
              />
              <ZodTextField
                ghost
                register={register}
                errors={errors}
                name="endTime_unix"
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
                  const menu = menus.find((m) => m._id === menuId)
                  const price =
                    menu?.salePrice && menu?.salePrice > 0
                      ? menu?.salePrice
                      : (menu?.unitPrice ?? 0)
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
                  const option = options.find((o) => o._id === selectedOption.optionId)
                  return (
                    option && (
                      <div
                        key={selectedOption.optionId}
                        className="w-full flex items-center justify-between gap-2 p-2 text-xs bg-background  border-b border-border"
                      >
                        <p className="text-primary font-bold text-sm">{option.name}</p>
                        <p className="text-primary font-bold text-sm">
                          {' '}
                          {option.salePrice
                            ? `¥${option.salePrice.toLocaleString()}`
                            : `¥${option.unitPrice?.toLocaleString()}`}
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
              {selectStaff?.thumbnailPath ? (
                <Avatar className="w-8 h-8">
                  <AvatarImage
                    className="object-cover"
                    src={selectStaff.thumbnailPath}
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
                  {selectStaff?.extraCharge ? selectStaff?.extraCharge.toLocaleString() : '0'}
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
                        {formatJpTime(watch('startTime_unix')!)} ~{' '}
                        {formatJpTime(watch('endTime_unix')!)}
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
