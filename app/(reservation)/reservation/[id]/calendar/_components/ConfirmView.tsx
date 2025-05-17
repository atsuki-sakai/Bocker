'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Clock, CheckCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import type { StaffDisplay } from './StaffView'
import type { TimeRange } from '@/lib/type'
import { Separator } from '@/components/ui/separator'
import { PaymentMethod } from '@/services/convex/shared/types/common'
// オプション選択数をカウントする関数
const countOptionOccurrences = (options: Doc<'salon_option'>[]) => {
  const counts = new Map<string, { option: Doc<'salon_option'>; count: number }>()

  options.forEach((option) => {
    if (counts.has(option._id)) {
      const existing = counts.get(option._id)!
      counts.set(option._id, {
        option: existing.option,
        count: existing.count + 1,
      })
    } else {
      counts.set(option._id, { option, count: 1 })
    }
  })

  return Array.from(counts.values())
}

type ConfirmViewProps = {
  salonId: Id<'salon'>
  availablePoints: number
  usePoints: number
  onChangePointsAction: (points: number) => void
  selectedMenus: Doc<'menu'>[]
  selectedOptions: Doc<'salon_option'>[]
  selectedPaymentMethod: PaymentMethod
  selectedStaff: StaffDisplay | null
  selectedDate: Date | null
  selectedTime: TimeRange | null
  // クーポン関連のpropsを追加
  onApplyCoupon?: (discount: number, couponId: Id<'coupon'>) => void
}

export const ConfirmView = ({
  salonId,
  availablePoints,
  usePoints,
  onChangePointsAction,
  selectedMenus,
  selectedOptions,
  selectedStaff,
  selectedDate,
  selectedTime,
  onApplyCoupon,
}: ConfirmViewProps) => {
  const menuTotalPrice = selectedMenus.reduce((total: number, menu: Doc<'menu'>) => {
    return total + (menu.salePrice ? menu.salePrice : menu.unitPrice || 0)
  }, 0)

  // オプション合計金額の計算（複数選択を考慮）
  const optionTotalPrice = selectedOptions.reduce((total: number, option: Doc<'salon_option'>) => {
    return total + (option.salePrice ? option.salePrice : option.unitPrice || 0)
  }, 0)

  const totalAmount = menuTotalPrice + optionTotalPrice
  const maxUsablePoints = 1000 < availablePoints ? 1000 : availablePoints
  const handlePointsChange = (points: number[]) => {
    const value = Math.min(points[0], maxUsablePoints)
    onChangePointsAction(value)
  }

  // 施術時間の計算
  const calculateTotalTime = () => {
    // メニューの施術時間を計算
    const menuTime = selectedMenus.reduce((total: number, menu: Doc<'menu'>) => {
      return total + (menu.timeToMin || 0)
    }, 0)

    // オプションの施術時間を計算（複数選択を考慮）
    const optionTime = selectedOptions.reduce((total: number, option: Doc<'salon_option'>) => {
      return total + (option.timeToMin || 0)
    }, 0)

    return menuTime + optionTime
  }

  // 指名料の計算
  const calculateExtraCharge = () => {
    return selectedStaff?.extraCharge || 0
  }

  // 合計施術時間（分）
  const totalTime = calculateTotalTime()

  // 時間と分に変換
  const hours = Math.floor(totalTime / 60)
  const minutes = totalTime % 60

  // 指名料
  const extraCharge = calculateExtraCharge()

  // クーポン関連の状態
  const [couponCode, setCouponCode] = useState<string>('')
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount: number
    name: string
  } | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [isValidatingCoupon, setIsValidatingCoupon] = useState<boolean>(false)

  // クーポンを適用する関数
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('クーポンコードを入力してください')
      return
    }

    if (!onApplyCoupon) {
      setCouponError('クーポン機能は現在利用できません')
      return
    }

    try {
      setIsValidatingCoupon(true)
      setCouponError(null)
      const coupon = await fetchQuery(api.coupon.core.query.findByCouponUid, {
        salonId: salonId,
        couponUid: couponCode,
        activeOnly: true,
      })

      if (!coupon) {
        setCouponError('クーポンが見つかりません。')
        setAppliedCoupon(null)
        return
      }

      if (!coupon.fixedDiscountValue || !coupon.percentageDiscountValue) {
        setCouponError('クーポンが見つかりません。')
        setAppliedCoupon(null)
        return
      }

      const couponExclutionMenus = await fetchQuery(api.coupon.exclusion_menu.query.list, {
        salonId: salonId,
        couponId: coupon._id,
      })

      const hasExclusionMenu = selectedMenus.some((menu) => {
        if (
          couponExclutionMenus.some(
            (couponExclutionMenu) => couponExclutionMenu.menuId === menu._id
          )
        ) {
          setCouponError(menu.name + 'にはクーポンが適用できません。')
          setAppliedCoupon(null)
          return true // 除外メニューが見つかった
        }
        return false
      })

      if (hasExclusionMenu) {
        return // クーポン適用処理を中断
      }

      const formattedDiscount =
        coupon.discountType === 'percentage'
          ? coupon.percentageDiscountValue + '%'
          : '¥' + coupon.fixedDiscountValue

      const discount =
        coupon.discountType === 'percentage'
          ? coupon.percentageDiscountValue
          : coupon.fixedDiscountValue

      const resultDiscount =
        totalAmount +
        extraCharge -
        (coupon.discountType === 'percentage'
          ? coupon.percentageDiscountValue
            ? totalAmount + extraCharge - (totalAmount + extraCharge) * (discount / 100)
            : 0
          : coupon.fixedDiscountValue
            ? totalAmount + extraCharge - coupon.fixedDiscountValue
            : 0)

      if (resultDiscount > totalAmount + extraCharge) {
        setCouponError('割引金額が合計金額を超えています。')
        setAppliedCoupon(null)
        return
      }

      setAppliedCoupon({
        code: couponCode,
        discount: resultDiscount,
        name: coupon.name + formattedDiscount,
      })
      if (onApplyCoupon) {
        onApplyCoupon(resultDiscount, coupon._id)
      }
      setCouponError(null)
    } catch (error) {
      console.log(error)
      setCouponError('クーポンの適用中にエラーが発生しました')
      setAppliedCoupon(null)
    } finally {
      setIsValidatingCoupon(false)
    }
  }

  // クーポンをリセットする関数
  const handleResetCoupon = () => {
    setCouponCode('')
    setAppliedCoupon(null)
    setCouponError(null)
  }

  // 合計金額から割引を計算（ポイントとクーポン）
  const totalDiscount = usePoints + (appliedCoupon?.discount || 0)
  const finalAmount = totalAmount + extraCharge - totalDiscount

  // オプションを選択数でグループ化
  const groupedOptions = countOptionOccurrences(selectedOptions)

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="space-y-6">
        {/* 予約内容の概要 */}
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-center tracking-wide mb-6 text-primary">
            予約内容の確認
          </h3>
          <div className="space-y-6">
            {/* 施術時間 */}
            <div className="border-b pb-4 border-border">
              <p className="text-lg font-bold text-primary flex items-center">
                <span className="mr-4">{selectedDate?.toLocaleDateString()}</span>
                <span>
                  {selectedTime?.startHour} - {selectedTime?.endHour}
                </span>
              </p>
              <div className="flex items-center text-sm md:text-base mt-3 text-muted-foreground">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <p>
                  施術時間{' '}
                  <span className="text-muted-foreground ml-2">
                    {hours > 0 ? `${hours}時間` : ''} {minutes > 0 ? `${minutes}分` : ''}
                  </span>
                </p>
              </div>
            </div>
            {/* メニュー一覧 */}
            <div className="border-b pb-4 border-border">
              <p className="text-base font-bold mb-3 text-primary">メニュー</p>
              <ul className="text-sm md:text-base pl-4 space-y-2 text-muted-foreground">
                {selectedMenus.map((menu: Doc<'menu'>) => (
                  <li key={menu._id} className="flex justify-between items-start">
                    <span className="flex-grow mr-2">{menu.name}</span>
                    <span className="text-muted-foreground text-nowrap text-right">
                      {menu.timeToMin
                        ? `¥${menu.salePrice ? menu.salePrice.toLocaleString() : menu.unitPrice ? menu.unitPrice.toLocaleString() : ''} / ${menu.timeToMin}分`
                        : `¥${menu.salePrice ? menu.salePrice.toLocaleString() : menu.unitPrice ? menu.unitPrice.toLocaleString() : ''}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {/* オプション一覧（グループ化して表示） */}
            {groupedOptions.length > 0 && (
              <div className="border-b pb-4 border-border">
                <p className="text-base font-bold mb-3 text-primary">オプション</p>
                <ul className="text-sm md:text-base pl-4 space-y-2 text-muted-foreground">
                  {groupedOptions.map(({ option, count }) => (
                    <li key={option._id} className="flex justify-between items-start">
                      <span className="flex-grow mr-2">
                        {option.name} {count > 1 ? `× ${count}` : ''}
                      </span>
                      <span className="text-muted-foreground text-nowrap text-right">
                        {option.timeToMin
                          ? `¥${(option.salePrice ? option.salePrice : option.unitPrice || 0) * count} / ${option.timeToMin * count}分`
                          : `¥${(option.salePrice ? option.salePrice : option.unitPrice || 0) * count}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* スタッフ情報 */}
            {selectedStaff && (
              <div>
                <p className="text-base font-bold mb-3 text-primary">スタッフ</p>
                <div className="text-sm md:text-base pl-4 flex justify-between items-start text-muted-foreground">
                  <span className="flex-grow mr-2">{selectedStaff.name}</span>
                  {extraCharge > 0 ? (
                    <span className="text-muted-foreground text-nowrap text-right">
                      指名料 / ¥{extraCharge.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-nowrap text-right">
                      指名料 / 無料
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <Separator className="my-6 " />

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground ">
            現在保有しているポイント <span className="font-bold mx-1">{availablePoints}</span>P
          </div>
          <div className="flex justify-between items-center">
            <p className="text-base font-bold">使用ポイント: {usePoints}ポイント</p>
            <p className="text-xs text-muted-foreground">最大 {maxUsablePoints}ポイント</p>
          </div>

          <div className="w-[90%] mx-auto">
            <Slider
              value={[usePoints]}
              max={maxUsablePoints}
              step={100}
              onValueChange={handlePointsChange}
            />
          </div>

          <div className="flex justify-between text-sm text-muted-foreground">
            <span>0</span>
            <span>{maxUsablePoints}</span>
          </div>
        </div>
        <div className="space-y-2 border-t pt-4">
          <div>
            <p className="font-bold mb-2">クーポンコードを使用する</p>
            <div className="flex space-x-2">
              <Input
                placeholder="クーポンコード"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={!!appliedCoupon || isValidatingCoupon}
                className={couponError ? 'border-destructive' : ''}
              />
              {!appliedCoupon ? (
                <Button
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || isValidatingCoupon}
                  className="whitespace-nowrap"
                >
                  {isValidatingCoupon ? '確認中...' : '適用する'}
                </Button>
              ) : (
                <Button variant="outline" onClick={handleResetCoupon} className="whitespace-nowrap">
                  リセット
                </Button>
              )}
            </div>
            {couponError && <p className="text-destructive text-sm mt-1">{couponError}</p>}
            {appliedCoupon && (
              <div className="mt-2 p-2 bg-active-foreground border border-active rounded-md">
                <p className="text-active text-sm flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  クーポン「{appliedCoupon.name}」が適用されました（
                  {appliedCoupon.discount.toLocaleString()}円割引）
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2 pt-6">
            <div className="flex justify-between">
              <p>商品金額</p>
              <p>¥{totalAmount.toLocaleString()}</p>
            </div>
            {extraCharge > 0 && (
              <div className="flex justify-between">
                <p>指名料</p>
                <p>¥{extraCharge.toLocaleString()}</p>
              </div>
            )}
            <div className="flex justify-between text-active">
              <p>ポイント割引</p>
              <p>-¥{usePoints.toLocaleString()}</p>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-active">
                <p>クーポン割引</p>
                <p>-¥{appliedCoupon.discount.toLocaleString()}</p>
              </div>
            )}
            <div className="flex justify-between text-lg text-muted-foreground">
              <p>小計</p>
              <p>¥{menuTotalPrice + optionTotalPrice + extraCharge}</p>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <p>お支払い金額</p>
              <p>¥{finalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
