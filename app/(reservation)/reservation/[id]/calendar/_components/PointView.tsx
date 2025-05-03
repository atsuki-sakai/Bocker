'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Doc } from '@/convex/_generated/dataModel'
import { Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { StaffDisplay } from './StaffView'

type PointViewProps = {
  totalAmount: number
  availablePoints: number
  usePoints: number
  onChangePointsAction: (points: number) => void
  selectedMenus: Doc<'menu'>[]
  selectedOptions: Doc<'salon_option'>[]
  selectedStaff: StaffDisplay | null
  // クーポン関連のpropsを追加
  onApplyCoupon?: (couponCode: string) => Promise<{ valid: boolean; discount: number } | null>
}

export const PointView = ({
  totalAmount,
  availablePoints,
  usePoints,
  onChangePointsAction,
  selectedMenus,
  selectedOptions,
  selectedStaff,
  onApplyCoupon,
}: PointViewProps) => {
  const maxUsablePoints = Math.min(availablePoints, totalAmount)

  const handlePointsChange = (value: number[]) => {
    onChangePointsAction(value[0])
  }

  // 施術時間の計算
  const calculateTotalTime = () => {
    // メニューの施術時間を計算
    const menuTime = selectedMenus.reduce((total, menu) => {
      return total + (menu.ensureTimeToMin || menu.timeToMin || 0)
    }, 0)

    // オプションの施術時間を計算
    const optionTime = selectedOptions.reduce((total, option) => {
      return total + (option.ensureTimeToMin || option.timeToMin || 0)
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
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(
    null
  )
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

      const result = await onApplyCoupon(couponCode)

      if (!result) {
        setCouponError('クーポンの検証中にエラーが発生しました')
        setAppliedCoupon(null)
        return
      }

      if (!result.valid) {
        setCouponError('無効なクーポンコードです')
        setAppliedCoupon(null)
        return
      }

      setAppliedCoupon({
        code: couponCode,
        discount: result.discount,
      })
      setCouponError(null)
    } catch (error) {
      console.error('クーポン適用エラー:', error)
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

  return (
    <div>
      <h2 className="text-xl">ポイントを使用</h2>
      <p className="text-gray-600 mb-4">保有ポイントを使用して割引を受けることができます。</p>

      <div className="space-y-6">
        {/* 予約内容の概要 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">予約内容</h3>
          <div className="space-y-2">
            {/* 施術時間 */}
            <div className="flex items-center text-sm">
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              <span>
                施術時間: {hours > 0 ? `${hours}時間` : ''} {minutes > 0 ? `${minutes}分` : ''}
              </span>
            </div>

            {/* メニュー一覧 */}
            <div className="space-y-1">
              <p className="text-sm font-medium">メニュー:</p>
              <ul className="text-sm pl-5 space-y-1">
                {selectedMenus.map((menu) => (
                  <li key={menu._id} className="flex justify-between">
                    <span>{menu.name}</span>
                    <span className="text-gray-500">
                      {menu.ensureTimeToMin || menu.timeToMin
                        ? `${menu.ensureTimeToMin || menu.timeToMin}分`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* オプション一覧 */}
            {selectedOptions.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">オプション:</p>
                <ul className="text-sm pl-5 space-y-1">
                  {selectedOptions.map((option) => (
                    <li key={option._id} className="flex justify-between">
                      <span>{option.name}</span>
                      <span className="text-gray-500">
                        {option.ensureTimeToMin || option.timeToMin
                          ? `${option.ensureTimeToMin || option.timeToMin}分`
                          : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* スタッフ情報 */}
            {selectedStaff && (
              <div className="space-y-1">
                <p className="text-sm font-medium">スタッフ:</p>
                <p className="text-sm pl-5 flex justify-between">
                  <span>{selectedStaff.name}</span>
                  {extraCharge > 0 && (
                    <span className="text-gray-500">指名料: ¥{extraCharge.toLocaleString()}</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-700">利用可能ポイント: {availablePoints}ポイント</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <p className="text-sm font-medium">使用ポイント: {usePoints}ポイント</p>
            <p className="text-sm text-gray-500">最大 {maxUsablePoints}ポイント</p>
          </div>

          <div className="w-full px-4">
            <Slider
              value={[usePoints]}
              max={maxUsablePoints}
              step={100}
              onValueChange={handlePointsChange}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span>0</span>
            <span>{maxUsablePoints}</span>
          </div>
        </div>
        <div className="space-y-2 border-t pt-4">
          <div>
            <p className="font-medium mb-2">クーポンコードを使用する</p>
            <div className="flex space-x-2">
              <Input
                placeholder="クーポンコード"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={!!appliedCoupon || isValidatingCoupon}
                className={couponError ? 'border-red-500' : ''}
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
            {couponError && <p className="text-red-500 text-sm mt-1">{couponError}</p>}
            {appliedCoupon && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-700 text-sm flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  クーポン「{appliedCoupon.code}」が適用されました（
                  {appliedCoupon.discount.toLocaleString()}円割引）
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
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
          <div className="flex justify-between text-green-600">
            <p>ポイント割引</p>
            <p>-¥{usePoints.toLocaleString()}</p>
          </div>
          {appliedCoupon && (
            <div className="flex justify-between text-green-600">
              <p>クーポン割引</p>
              <p>-¥{appliedCoupon.discount.toLocaleString()}</p>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg">
            <p>お支払い金額</p>
            <p>¥{finalAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}