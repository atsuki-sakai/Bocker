'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { CheckCircle, Tag, X } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { ActiveCustomerType } from '@/convex/types'
import { convertActiveCustomerType } from '@/convex/types'
import { fetchQuery } from 'convex/nextjs'

type CouponViewProps = {
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  selectedMenus: Doc<'menu'>[]
  sessionCustomerType: ActiveCustomerType
  onSelectCoupon: (coupon: Doc<'coupon'> | null, discountAmount: number) => void
  selectedCoupon: Id<'coupon'> | null
}

export const CouponView = ({
  tenantId,
  orgId,
  selectedMenus,
  sessionCustomerType,
  onSelectCoupon,
  selectedCoupon,
}: CouponViewProps) => {
  const [availableCoupons, setAvailableCoupons] = useState<Doc<'coupon'>[]>([])
  const [loading, setLoading] = useState(true)

  const selectCoupon = useQuery(
    api.coupon.query.findById,
    selectedCoupon
      ? {
          coupon_id: selectedCoupon,
        }
      : 'skip'
  )
  // アクティブなクーポン一覧を取得
  const couponsData = useQuery(api.coupon.query.list, {
    tenant_id: tenantId,
    org_id: orgId,
    paginationOpts: { numItems: 100, cursor: null },
    include_archive: false,
    active_only: true,
  })

  console.log('couponsData', couponsData)

  useEffect(() => {
    const filterCoupons = async () => {
      if (!couponsData?.page) {
        setLoading(false)
        return
      }

      setLoading(true)

      // 並列でクーポン設定と除外メニューを取得
      const couponChecks = await Promise.all(
        couponsData.page.map(async (coupon) => {
          // active_only=trueで取得しているので、is_activeチェックは不要

          try {
            // 除外メニューとクーポン設定を並列で取得
            const [exclusionMenus, couponConfigData] = await Promise.all([
              fetchQuery(api.coupon.exclusion_menu.query.list, {
                tenant_id: tenantId,
                org_id: orgId,
                coupon_id: coupon._id,
              }),
              fetchQuery(api.coupon.config.query.findByCouponId, {
                tenant_id: tenantId,
                org_id: orgId,
                coupon_id: coupon._id,
              }),
            ])

            // 選択中のメニューが除外対象に含まれているかチェック
            const hasExcludedMenu = selectedMenus.some((menu) =>
              exclusionMenus.some((exclusion) => exclusion.menu_id === menu._id)
            )

            if (hasExcludedMenu) return { coupon, isValid: false }

            if (!couponConfigData) return { coupon, isValid: false }

            // 顧客タイプによるフィルタリング
            const activeCustomerType = couponConfigData.active_customer_type
            const isValidCustomerType =
              activeCustomerType === 'all' || activeCustomerType === sessionCustomerType

            return { coupon, isValid: isValidCustomerType }
          } catch (error) {
            console.error('クーポンフィルタリングエラー:', error)
            return { coupon, isValid: false }
          }
        })
      )

      // 有効なクーポンのみフィルタ
      const validCoupons = couponChecks.filter(({ isValid }) => isValid).map(({ coupon }) => coupon)

      setAvailableCoupons(validCoupons)
      setLoading(false)
    }

    filterCoupons()
  }, [couponsData, selectedMenus, sessionCustomerType, tenantId, orgId])

  // 割引額を計算する関数
  const calculateDiscount = (coupon: Doc<'coupon'>, totalAmount: number) => {
    if (coupon.discount_type === 'percentage') {
      return Math.floor((totalAmount * (coupon.percentage_discount_value || 0)) / 100)
    } else {
      return coupon.fixed_discount_value || 0
    }
  }

  // メニュー合計金額
  const menuTotalPrice = selectedMenus.reduce((total: number, menu: Doc<'menu'>) => {
    return total + (menu.sale_price ? menu.sale_price : menu.unit_price || 0)
  }, 0)

  const handleCouponSelect = (coupon: Doc<'coupon'>) => {
    const discountAmount = calculateDiscount(coupon, menuTotalPrice)
    onSelectCoupon(coupon, discountAmount)
  }

  const handleCouponDeselect = () => {
    onSelectCoupon(null, 0)
  }

  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="space-y-6">
          <h3 className="text-xl md:text-2xl font-bold text-center tracking-wide mb-6 text-primary">
            クーポンを選択
          </h3>
          <div className="text-center text-muted-foreground">利用可能なクーポンを確認中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="space-y-6">
        <h3 className="text-xl md:text-2xl font-bold text-center tracking-wide mb-6 text-primary">
          クーポンを選択
        </h3>

        {/* 顧客タイプ表示 */}
        <div className="text-center text-sm text-muted-foreground mb-4">
          あなたは{' '}
          <strong className="text-base font-bold">
            {convertActiveCustomerType(sessionCustomerType)}
          </strong>{' '}
          のお客様です
        </div>

        {/* 選択中のクーポン表示 */}
        {selectCoupon && (
          <Card className="border-neon bg-neon-foreground">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center text-neon">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  選択中のクーポン
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCouponDeselect}
                  className="text-neon"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium text-neon">{selectCoupon.name}</p>
                <p className="text-sm text-neon">
                  {selectCoupon.discount_type === 'percentage'
                    ? `¥ ${calculateDiscount(selectCoupon, menuTotalPrice).toLocaleString()} - OFF`
                    : `¥ ${selectCoupon.fixed_discount_value?.toLocaleString()} - OFF`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 利用可能なクーポン一覧 */}
        {availableCoupons.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>現在利用可能なクーポンはありません</p>
            <p className="text-sm mt-2">
              選択したメニューや顧客タイプによって利用できるクーポンが決まります
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-base font-medium">
              利用可能なクーポン ({availableCoupons.length}件)
            </p>
            {availableCoupons.map((coupon) => {
              const discountAmount = calculateDiscount(coupon, menuTotalPrice)
              const isSelected = selectCoupon?._id === coupon._id

              return (
                <Card
                  key={coupon._id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleCouponSelect(coupon)}
                >
                  <CardContent className=" p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-base mb-1 text-neon">{coupon.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Tag className="h-4 w-4 mr-1" />
                            {coupon.discount_type === 'percentage'
                              ? `${coupon.percentage_discount_value}%割引`
                              : `¥${coupon.fixed_discount_value?.toLocaleString()}割引`}
                          </span>
                        </div>
                        <p className="text-sm text-primary font-medium mt-2">
                          この注文での割引額: ¥{discountAmount.toLocaleString()}
                        </p>
                      </div>
                      {isSelected ? (
                        <CheckCircle className="h-6 w-6 text-neon" />
                      ) : (
                        <div className="h-6 w-6 border-2 border-muted-foreground rounded-full" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
