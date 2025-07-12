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
import { CouponErrorBoundary } from './CouponErrorBoundary'

type CouponViewProps = {
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  selectedMenus: Doc<'menu'>[]
  sessionCustomerType: ActiveCustomerType
  onSelectCoupon: (coupon: Doc<'coupon'> | null, discountAmount: number) => void
  selectedCoupon: Id<'coupon'> | null
}

type CouponWithApplicableMenus = {
  coupon: Doc<'coupon'>
  applicableMenus: Doc<'menu'>[]
}

const CouponViewInner = ({
  tenantId,
  orgId,
  selectedMenus,
  sessionCustomerType,
  onSelectCoupon,
  selectedCoupon,
}: CouponViewProps) => {
  const [availableCoupons, setAvailableCoupons] = useState<CouponWithApplicableMenus[]>([])
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


  // 適用可能メニューを特定するヘルパー関数
  const getApplicableMenus = (selectedMenus: Doc<'menu'>[], exclusionMenus: Doc<'coupon_exclusion_menu'>[]) => {
    return selectedMenus.filter((menu) => 
      !exclusionMenus.some((exclusion) => exclusion.menu_id === menu._id)
    )
  }

  useEffect(() => {
    const filterCoupons = async () => {
      if (!couponsData?.page) {
        setLoading(false)
        return
      }

      setLoading(true)

      try {
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

              // 適用可能メニューを特定
              const applicableMenus = getApplicableMenus(selectedMenus, exclusionMenus)
              
              // 適用可能メニューが1つもない場合は無効
              if (applicableMenus.length === 0) return { coupon, isValid: false, applicableMenus }

              if (!couponConfigData) return { coupon, isValid: false, applicableMenus }

              // 顧客タイプによるフィルタリング
              const activeCustomerType = couponConfigData.active_customer_type
              const isValidCustomerType =
                activeCustomerType === 'all' || activeCustomerType === sessionCustomerType

              return { coupon, isValid: isValidCustomerType, applicableMenus }
            } catch (error) {
              console.error('クーポンフィルタリングエラー:', error)
              return { coupon, isValid: false, applicableMenus: [] }
            }
          })
        )

        // 有効なクーポンのみフィルタ
        const validCoupons = couponChecks
          .filter(({ isValid }) => isValid)
          .map(({ coupon, applicableMenus }) => ({ coupon, applicableMenus }))

        setAvailableCoupons(validCoupons)
      } catch (error) {
        console.error('クーポン一覧の取得でエラーが発生しました:', error)
        setAvailableCoupons([])
      } finally {
        setLoading(false)
      }
    }

    filterCoupons()
  }, [couponsData, selectedMenus, sessionCustomerType, tenantId, orgId])

  // 適用可能メニューの合計金額を計算する関数
  const calculateApplicableMenusTotal = (applicableMenus: Doc<'menu'>[]) => {
    return applicableMenus.reduce((total: number, menu: Doc<'menu'>) => {
      try {
        return total + (menu.sale_price ?? menu.unit_price ?? 0)
      } catch (error) {
        console.error('メニュー価格の計算でエラーが発生しました:', error, menu)
        return total
      }
    }, 0)
  }

  // 割引額を計算する関数（適用可能メニューの金額のみ対象）
  const calculateDiscount = (coupon: Doc<'coupon'>, applicableMenus: Doc<'menu'>[]) => {
    try {
      const applicableTotal = calculateApplicableMenusTotal(applicableMenus)
      if (coupon.discount_type === 'percentage') {
        const percentage = coupon.percentage_discount_value ?? 0
        return Math.floor((applicableTotal * percentage) / 100)
      } else {
        return coupon.fixed_discount_value ?? 0
      }
    } catch (error) {
      console.error('割引額の計算でエラーが発生しました:', error)
      return 0
    }
  }


  const handleCouponSelect = (coupon: Doc<'coupon'>, applicableMenus: Doc<'menu'>[]) => {
    try {
      const discountAmount = calculateDiscount(coupon, applicableMenus)
      onSelectCoupon(coupon, discountAmount)
    } catch (error) {
      console.error('クーポン選択でエラーが発生しました:', error)
    }
  }

  const handleCouponDeselect = () => {
    try {
      onSelectCoupon(null, 0)
    } catch (error) {
      console.error('クーポン選択解除でエラーが発生しました:', error)
    }
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
        {selectCoupon && (() => {
          // 選択中のクーポンの適用可能メニューを取得
          const selectedCouponData = availableCoupons.find(
            item => item.coupon._id === selectCoupon._id
          )
          const applicableMenus = selectedCouponData?.applicableMenus || []
          
          return (
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
                    ¥ {calculateDiscount(selectCoupon, applicableMenus).toLocaleString()} - OFF
                  </p>
                  {applicableMenus.length > 0 && (
                    <p className="text-xs text-neon/80">
                      適用対象: {applicableMenus.map(menu => menu.name).join(', ')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })()}

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
            {availableCoupons.map(({ coupon, applicableMenus }) => {
              const discountAmount = calculateDiscount(coupon, applicableMenus)
              const isSelected = selectCoupon?._id === coupon._id

              return (
                <Card
                  key={coupon._id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleCouponSelect(coupon, applicableMenus)}
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
                              : `¥${(coupon.fixed_discount_value ?? 0).toLocaleString()}割引`}
                          </span>
                        </div>
                        <p className="text-sm text-primary font-medium mt-2">
                          この注文での割引額: ¥{discountAmount.toLocaleString()}
                        </p>
                        {applicableMenus.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            適用対象: {applicableMenus.map(menu => menu.name).join(', ')}
                          </p>
                        )}
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

export const CouponView = (props: CouponViewProps) => {
  return (
    <CouponErrorBoundary>
      <CouponViewInner {...props} />
    </CouponErrorBoundary>
  )
}
