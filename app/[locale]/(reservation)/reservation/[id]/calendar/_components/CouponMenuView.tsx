'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { CheckCircle, Tag, X, Clock, AlertTriangle } from 'lucide-react'
import { useQuery, usePaginatedQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { ActiveCustomerType } from '@/convex/types'
import { convertActiveCustomerType } from '@/convex/types'
import { fetchQuery } from 'convex/nextjs'
import { CouponErrorBoundary } from './CouponErrorBoundary'
import { Loading } from '@/components/common'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  convertPaymentMethod,
  MENU_CATEGORY_VALUES,
  MenuCategory,
  convertGender,
  Gender,
  GENDER_VALUES,
  PaymentMethod,
} from '@/convex/types'
import Image from 'next/image'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandItem } from '@/components/ui/command'
import { Check } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel'

type CouponMenuViewProps = {
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  sessionCustomerType: ActiveCustomerType
  onCouponChange: (coupon: Doc<'coupon'> | null) => void
  onMenuChange: (menus: Doc<'menu'>[]) => void
  selectedCoupon: Id<'coupon'> | null
  selectedMenus: Doc<'menu'>[]
  appliedDiscount: number
  targetType?: ActiveCustomerType | null | undefined
  isMultipleSelection?: boolean
}

type CouponWithApplicableMenus = {
  coupon: Doc<'coupon'>
  applicableMenus: Doc<'menu'>[]
}

type MenuCategoryWithSet = MenuCategory | 'セットメニュー'

const CouponMenuViewInner = ({
  tenantId,
  orgId,
  sessionCustomerType,
  onCouponChange,
  onMenuChange,
  selectedCoupon,
  selectedMenus,
  appliedDiscount,
  targetType,
  isMultipleSelection = true,
}: CouponMenuViewProps) => {
  // Coupon states
  const [availableCoupons, setAvailableCoupons] = useState<CouponWithApplicableMenus[]>([])
  const [couponLoading, setCouponLoading] = useState(true)

  // Menu states
  const [currentCategory, setCurrentCategory] = useState<MenuCategoryWithSet | null>(null)
  const [showMenuDetails, setShowMenuDetails] = useState<boolean>(false)
  const [selectedMenu, setSelectedMenu] = useState<Doc<'menu'> | null>(null)
  const [selectedMenuMap, setSelectedMenuMap] = useState<Record<string, Doc<'menu'>>>({})
  const [selectedCategories, setSelectedCategories] = useState<MenuCategoryWithSet[]>([])
  const [showPopover, setShowPopover] = useState<boolean>(false)
  const [blockedCategories, setBlockedCategories] = useState<MenuCategoryWithSet[]>([])
  const [selectedGenders, setSelectedGenders] = useState<Gender[]>([])
  const [showGenderPopover, setShowGenderPopover] = useState<boolean>(false)

  // Carousel states
  const [mainCarouselApi, setMainCarouselApi] = useState<CarouselApi>()
  const [currentMainImageIndex, setCurrentMainImageIndex] = useState(0)
  const [recommendedCarouselApi, setRecommendedCarouselApi] = useState<CarouselApi>()
  const [currentRecommendedIndex, setCurrentRecommendedIndex] = useState(0)

  // Coupon queries
  const selectCoupon = useQuery(
    api.coupon.query.findById,
    selectedCoupon
      ? {
          coupon_id: selectedCoupon,
        }
      : 'skip'
  )

  const couponsData = useQuery(api.coupon.query.list, {
    tenant_id: tenantId,
    org_id: orgId,
    paginationOpts: { numItems: 100, cursor: null },
    include_archive: false,
    active_only: true,
  })

  // Menu queries
  const { results: menus, isLoading: menuLoading } = usePaginatedQuery(
    api.menu.query.listByTenantAndOrg,
    {
      tenant_id: tenantId as Id<'tenant'>,
      org_id: orgId as Id<'organization'>,
    },
    {
      initialNumItems: 100,
    }
  )

  const excludedMenus = useQuery(
    api.coupon.exclusion_menu.query.list,
    selectedCoupon
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          coupon_id: selectedCoupon,
        }
      : 'skip'
  )

  // 適用外メニューの詳細情報を取得
  const excludedMenuDetails = useQuery(
    api.menu.query.getDisplayByIds,
    excludedMenus && excludedMenus.length > 0
      ? {
          menu_ids: excludedMenus.map(em => em.menu_id),
          option_ids: []
        }
      : 'skip'
  )

  // Force re-render when selectedCoupon changes
  const [couponVersion, setCouponVersion] = useState(0)
  useEffect(() => {
    setCouponVersion(prev => prev + 1)
  }, [selectedCoupon])

  // Helper functions
  const getApplicableMenus = useCallback(
    (selectedMenus: Doc<'menu'>[], exclusionMenus: Doc<'coupon_exclusion_menu'>[]) => {
      return selectedMenus.filter(
        (menu) => !exclusionMenus.some((exclusion) => exclusion.menu_id === menu._id)
      )
    },
    []
  )

  const isMenuExcludedByCoupon = useCallback(
    (menu: Doc<'menu'>): boolean => {
      if (!selectedCoupon || !excludedMenus) return false
      return excludedMenus.some((ex) => ex.menu_id === menu._id)
    },
    [selectedCoupon, excludedMenus, couponVersion]
  )

  const isSetMenu = useCallback((menu: Doc<'menu'>): boolean => {
    return Array.isArray(menu.categories) && menu.categories.length > 1
  }, [])

  // Coupon filtering effect
  useEffect(() => {
    const filterCoupons = async () => {
      if (!couponsData?.page) {
        setCouponLoading(false)
        return
      }

      setCouponLoading(true)

      console.log('🔍 [CouponFilter] セッション顧客タイプ:', sessionCustomerType)
      console.log('🔍 [CouponFilter] 検証対象クーポン数:', couponsData.page.length)

      try {
        const couponChecks = await Promise.all(
          couponsData.page.map(async (coupon) => {
            try {
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

              const applicableMenus = getApplicableMenus(selectedMenus, exclusionMenus)

              if (selectedMenus.length > 0 && applicableMenus.length === 0) {
                return { coupon, isValid: false, applicableMenus }
              }

              if (!couponConfigData) {
                console.log('❌ [CouponFilter] クーポン設定なし:', coupon.name)
                return { coupon, isValid: false, applicableMenus }
              }

              const activeCustomerType = couponConfigData.active_customer_type
              console.log(`🔍 [CouponFilter] "${coupon.name}":`, {
                activeCustomerType,
                sessionCustomerType,
                condition1: activeCustomerType === 'all',
                condition2: activeCustomerType === sessionCustomerType
              })

              // より厳密なクーポン顧客タイプの検証
              let isValidCustomerType = false

              if (!sessionCustomerType) {
                // セッション顧客タイプが不明な場合は、'all'のクーポンのみ表示
                isValidCustomerType = activeCustomerType === 'all'
                console.log(`⚠️ [CouponFilter] セッション顧客タイプが不明 - 'all'のみ許可`)
              } else {
                switch (activeCustomerType) {
                  case 'all':
                    // 全顧客対象のクーポンは常に表示
                    isValidCustomerType = true
                    break
                  case 'first_time':
                    // 初回限定クーポンは初回顧客のみ
                    isValidCustomerType = sessionCustomerType === 'first_time'
                    break
                  case 'repeat':
                    // リピーター限定クーポンはリピーター顧客のみ
                    isValidCustomerType = sessionCustomerType === 'repeat'
                    break
                  default:
                    // 不明なタイプは表示しない
                    isValidCustomerType = false
                    console.log(`❌ [CouponFilter] 不明なactive_customer_type: ${activeCustomerType}`)
                }
              }

              console.log(`${isValidCustomerType ? '✅' : '❌'} [CouponFilter] "${coupon.name}" 表示結果:`, isValidCustomerType)

              return { coupon, isValid: isValidCustomerType, applicableMenus }
            } catch (error) {
              console.error('クーポンフィルタリングエラー:', error)
              return { coupon, isValid: false, applicableMenus: [] }
            }
          })
        )

        const validCoupons = couponChecks
          .filter(({ isValid }) => isValid)
          .map(({ coupon, applicableMenus }) => ({ coupon, applicableMenus }))

        setAvailableCoupons(validCoupons)
      } catch (error) {
        console.error('クーポン一覧の取得でエラーが発生しました:', error)
        setAvailableCoupons([])
      } finally {
        setCouponLoading(false)
      }
    }

    filterCoupons()
  }, [couponsData, selectedMenus, sessionCustomerType, tenantId, orgId, getApplicableMenus])

  // Menu helper functions
  const menuBlocked = useCallback(
    (menu: Doc<'menu'>): { isBlocked: boolean; reason: string | null } => {
      if (isMenuExcludedByCoupon(menu)) {
        return { isBlocked: true, reason: '選択中のクーポンでは利用できません' }
      }

      if (isSetMenu(menu)) return { isBlocked: false, reason: null }

      const isBlockedByCategory = menu.categories
        ? menu.categories.some((cat) => blockedCategories.includes(cat))
        : blockedCategories.includes('その他')

      if (isBlockedByCategory) {
        return { isBlocked: true, reason: 'セットメニューと競合しています' }
      }

      return { isBlocked: false, reason: null }
    },
    [isMenuExcludedByCoupon, isSetMenu, blockedCategories, couponVersion]
  )

  const extractUniqueCategories = useCallback((menus: Doc<'menu'>[]): MenuCategoryWithSet[] => {
    const categorySet = new Set<MenuCategoryWithSet>()
    menus.forEach((menu) => {
      if (Array.isArray(menu.categories) && menu.categories.length > 0) {
        menu.categories.forEach((cat) => categorySet.add(cat))
      } else {
        categorySet.add('その他')
      }
    })
    const categoryOrder: MenuCategoryWithSet[] = [...MENU_CATEGORY_VALUES, 'セットメニュー']
    return categoryOrder.filter((category) => categorySet.has(category))
  }, [])

  const getMenusByCategory = useCallback(
    (category: MenuCategoryWithSet | null): Doc<'menu'>[] => {
      if (!category || !menus) return []

      if (category === 'セットメニュー') {
        return menus.filter((menu) => isSetMenu(menu))
      }

      if (category === 'その他') {
        return menus.filter((menu) => !menu.categories || menu.categories.length === 0)
      }

      return menus.filter(
        (menu) =>
          Array.isArray(menu.categories) &&
          menu.categories.includes(category) &&
          !isSetMenu(menu)
      )
    },
    [menus, isSetMenu]
  )

  const isMenuSelected = useCallback(
    (checkMenu: Doc<'menu'>) => {
      return Object.values(selectedMenuMap).some((m) => m._id === checkMenu._id)
    },
    [selectedMenuMap]
  )

  // Event handlers
  const handleCouponSelect = useCallback(
    (coupon: Doc<'coupon'>) => {
      try {
        onCouponChange(coupon)
      } catch (error) {
        console.error('クーポン選択でエラーが発生しました:', error)
      }
    },
    [onCouponChange]
  )

  const handleCouponDeselect = useCallback(() => {
    try {
      onCouponChange(null)
    } catch (error) {
      console.error('クーポン選択解除でエラーが発生しました:', error)
    }
  }, [onCouponChange])

  const handleMenuSelect = useCallback(
    (menu: Doc<'menu'>, allowMultipleSelection: boolean = true) => {
      const isSet = isSetMenu(menu)
      const menuCategories = menu.categories || []
      const newSelectedMenuMap: Record<string, Doc<'menu'>> = { ...selectedMenuMap }

      const existingKey = Object.keys(newSelectedMenuMap).find(
        (k) => newSelectedMenuMap[k]._id === menu._id
      )

      if (existingKey) {
        delete newSelectedMenuMap[existingKey]

        if (isSet) {
          const remainingSetMenus = Object.values(newSelectedMenuMap).filter(isSetMenu)
          if (remainingSetMenus.length === 0) {
            setBlockedCategories([])
          } else {
            const newBlocked = new Set<MenuCategoryWithSet>()
            remainingSetMenus.forEach((m) => m.categories?.forEach((c) => newBlocked.add(c)))
            setBlockedCategories(Array.from(newBlocked))
          }
        }
      } else {
        const categoryIsBlocked = isSet
          ? false
          : menuCategories.some((cat) => blockedCategories.includes(cat))

        if (categoryIsBlocked) {
          alert('このメニューは現在選択できません。セットメニューと競合しています。')
          return
        }

        if (!allowMultipleSelection) {
          Object.keys(newSelectedMenuMap).forEach((k) => {
            const m = newSelectedMenuMap[k]
            const mPrimaryCat = isSetMenu(m)
              ? 'セットメニュー'
              : m.categories && m.categories.length > 0
                ? m.categories[0]
                : 'その他'
            const thisPrimaryCat = isSet ? 'セットメニュー' : menuCategories[0] || 'その他'
            if (mPrimaryCat === thisPrimaryCat) {
              delete newSelectedMenuMap[k]
            }
          })
        }

        if (isSet) {
          Object.keys(newSelectedMenuMap).forEach((k) => {
            const m = newSelectedMenuMap[k]
            if (!isSetMenu(m) && m.categories?.some((cat) => menuCategories.includes(cat))) {
              delete newSelectedMenuMap[k]
            }
          })
          setBlockedCategories(menuCategories)
        }

        newSelectedMenuMap[menu._id] = menu
      }

      setSelectedMenuMap(newSelectedMenuMap)
      onMenuChange(Object.values(newSelectedMenuMap))
    },
    [selectedMenuMap, isSetMenu, blockedCategories, onMenuChange]
  )

  const handleShowMenuDetails = useCallback((menu: Doc<'menu'>) => {
    setSelectedMenu(menu)
    setShowMenuDetails(true)
  }, [])

  // Carousel effects
  useEffect(() => {
    if (!mainCarouselApi) return

    const handleSelect = () => {
      setCurrentMainImageIndex(mainCarouselApi.selectedScrollSnap())
    }

    mainCarouselApi.on('select', handleSelect)
    handleSelect()

    return () => {
      mainCarouselApi.off('select', handleSelect)
    }
  }, [mainCarouselApi])

  useEffect(() => {
    if (!recommendedCarouselApi) return

    const handleSelect = () => {
      setCurrentRecommendedIndex(recommendedCarouselApi.selectedScrollSnap())
    }

    recommendedCarouselApi.on('select', handleSelect)
    handleSelect()

    return () => {
      recommendedCarouselApi.off('select', handleSelect)
    }
  }, [recommendedCarouselApi])

  // Initialize selected menus
  useEffect(() => {
    if (selectedMenus.length > 0 && menus) {
      const menuMap: Record<string, Doc<'menu'>> = {}
      const blockedCats: MenuCategoryWithSet[] = []

      selectedMenus.forEach((menu) => {
        menuMap[menu._id] = menu
        if (isSetMenu(menu) && menu.categories) {
          blockedCats.push(...menu.categories)
        }
      })

      setSelectedMenuMap(menuMap)
      setBlockedCategories(blockedCats)
    }
  }, [selectedMenus, menus, isSetMenu])

  // Initialize category
  useEffect(() => {
    if (menus && menus.length > 0) {
      const uniqueCategories = extractUniqueCategories(menus)
      if (uniqueCategories.length > 0 && !currentCategory) {
        const initialCategory = uniqueCategories[0]
        setCurrentCategory(initialCategory)
      }
    }
  }, [menus, currentCategory, extractUniqueCategories])

  // Computed values
  const selectedMenusArray = useMemo(() => {
    return Object.values(selectedMenuMap)
  }, [selectedMenuMap])

  const uniqueCategories: MenuCategoryWithSet[] = useMemo(() => {
    const categories = extractUniqueCategories(menus || [])
    if (!categories.includes('セットメニュー')) {
      return [...categories, 'セットメニュー']
    }
    return categories
  }, [menus, extractUniqueCategories])

  const toggleCategory = useCallback((category: MenuCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }, [])

  const toggleGender = useCallback((gender: Gender) => {
    setSelectedGenders((prev) =>
      prev.includes(gender) ? prev.filter((g) => g !== gender) : [...prev, gender]
    )
  }, [])

  const handleThumbnailClick = useCallback(
    (index: number) => {
      mainCarouselApi?.scrollTo(index)
    },
    [mainCarouselApi]
  )

  const getRecommendedMenus = useMemo(() => {
    if (!menus) return []

    const recommendedMenus = menus.filter((menu) => {
      return menu.categories?.includes('人気メニュー' as MenuCategory)
    })

    return recommendedMenus
      .filter((menu) => {
        const genderMatches =
          selectedGenders.length === 0 ||
          selectedGenders.includes(menu.target_gender as Gender) ||
          menu.target_gender === 'unselected'

        const customerTypeMatches = targetType === menu.target_type || menu.target_type === 'all'

        return genderMatches && customerTypeMatches
      })
      .sort((a, b) => {
        const aUpdated = a.updated_at || a._creationTime || 0
        const bUpdated = b.updated_at || b._creationTime || 0
        return bUpdated - aUpdated
      })
  }, [menus, selectedGenders, targetType])

  const filteredMenusToDisplay = useMemo(() => {
    if (!menus) return {}

    const filterMenusByGenderAndType = (menuList: Doc<'menu'>[]): Doc<'menu'>[] => {
      return menuList.filter((menu) => {
        const genderMatches =
          selectedGenders.length === 0 ||
          selectedGenders.includes(menu.target_gender as Gender) ||
          menu.target_gender === 'unselected'

        const customerTypeMatches = targetType === menu.target_type || menu.target_type === 'all'

        return genderMatches && customerTypeMatches
      })
    }

    if (selectedCategories.length === 0) {
      const grouped: Partial<Record<MenuCategoryWithSet, Doc<'menu'>[]>> = {}
      uniqueCategories.forEach((cat) => {
        const categoryMenus = getMenusByCategory(cat)
        grouped[cat] = filterMenusByGenderAndType(categoryMenus)
      })
      return grouped
    }

    const result: Partial<Record<MenuCategoryWithSet, Doc<'menu'>[]>> = {}

    selectedCategories.forEach((selectedCat) => {
      const currentFilteringCategory = selectedCat as MenuCategory

      const categoryMenus = menus.filter((menu) => {
        if (isSetMenu(menu)) return false

        if (!menu.categories || menu.categories.length === 0) {
          return currentFilteringCategory === 'その他'
        }
        return menu.categories.includes(currentFilteringCategory)
      })

      const filteredCategoryMenus = filterMenusByGenderAndType(categoryMenus)

      if (filteredCategoryMenus.length > 0) {
        if (!result[currentFilteringCategory]) {
          result[currentFilteringCategory] = []
        }
        filteredCategoryMenus.forEach((menu) => {
          if (!result[currentFilteringCategory]?.find((m) => m._id === menu._id)) {
            result[currentFilteringCategory]?.push(menu)
          }
        })
      }
    })

    const setMenuCategoryKey = 'セットメニュー' as MenuCategoryWithSet
    const allSetMenus = menus.filter(isSetMenu)
    let relevantSetMenus: Doc<'menu'>[] = []

    if (selectedCategories.length === 0) {
      relevantSetMenus = allSetMenus
    } else if (selectedCategories.includes(setMenuCategoryKey as MenuCategory)) {
      relevantSetMenus = allSetMenus
    } else {
      relevantSetMenus = allSetMenus.filter((sMenu) =>
        sMenu.categories?.some((cat) => selectedCategories.includes(cat as MenuCategory))
      )
    }

    const filteredSetMenus = filterMenusByGenderAndType(relevantSetMenus)

    if (!result[setMenuCategoryKey] && filteredSetMenus.length > 0) {
      result[setMenuCategoryKey] = []
    }
    filteredSetMenus.forEach((menu) => {
      if (!result[setMenuCategoryKey]?.find((m) => m._id === menu._id)) {
        result[setMenuCategoryKey]?.push(menu)
      }
    })
    if (!result[setMenuCategoryKey]) {
      result[setMenuCategoryKey] = []
    }

    return result
  }, [
    menus,
    selectedCategories,
    selectedGenders,
    targetType,
    uniqueCategories,
    getMenusByCategory,
    isSetMenu,
  ])

  const calculateApplicableMenusTotal = useCallback((applicableMenus: Doc<'menu'>[]) => {
    return applicableMenus.reduce((total: number, menu: Doc<'menu'>) => {
      try {
        return total + (menu.sale_price ?? menu.unit_price ?? 0)
      } catch (error) {
        console.error('メニュー価格の計算でエラーが発生しました:', error, menu)
        return total
      }
    }, 0)
  }, [])

  const calculateDiscount = useCallback(
    (coupon: Doc<'coupon'>, applicableMenus: Doc<'menu'>[]) => {
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
    },
    [calculateApplicableMenusTotal]
  )

  if (couponLoading || menuLoading) return <Loading />

  return (
    <div className="w-full space-y-4 md:space-y-8">

              {/* Filter Section */}
              <Card className="p-4 border-border">
          <p className="text-xs text-muted-foreground mb-2 border-b border-border pb-2">
            予約したいメニューを絞り込めます。カテゴリまたは性別を選択してください。
          </p>
          <div className="space-y-4">
            <div className="flex gap-2 justify-between">
              {/* Gender Filter */}
              <Popover open={showGenderPopover} onOpenChange={setShowGenderPopover}>
                <div className="flex flex-col justify-between items-start mb-2">
                  <div className="flex justify-between items-end">
                    {selectedGenders.length > 0 ? (
                      <p className="text-base font-bold text-muted-foreground rounded-md">
                        <span className="mr-0.5">{selectedGenders.length}</span>
                        <span className="text-xs">性別選択中</span>
                      </p>
                    ) : (
                      <p className="text-xs px-3 py-1 bg-secondary font-bold border border-border text-muted-foreground rounded-md">
                        全性別を表示中
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end items-center gap-4">
                    <PopoverTrigger asChild>
                      <Button size="sm" onClick={() => setShowGenderPopover(true)}>
                        {'性別で絞り込む'}
                      </Button>
                    </PopoverTrigger>
                  </div>
                </div>
                <PopoverContent
                  className="w-[240px] p-2"
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  <Command>
                    <div className="flex justify-between items-center">
                      <CommandInput placeholder="性別を検索…" />
                      <Button size="sm" variant="ghost" onClick={() => setShowGenderPopover(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <CommandList className="max-h-[400px] overflow-y-auto">
                      {GENDER_VALUES.filter((gender) => gender !== 'unselected').map((gender) => (
                        <CommandItem
                          key={gender}
                          className="cursor-pointer"
                          onSelect={() => toggleGender(gender)}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span
                              className={`${selectedGenders.includes(gender) ? 'font-bold' : ''}`}
                            >
                              {convertGender(gender)}
                            </span>
                            {selectedGenders.includes(gender) && (
                              <Check className="w-4 h-4 font-bold text-accent-2" />
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Category Filter */}
              <Popover open={showPopover} onOpenChange={setShowPopover}>
                <div className="flex flex-col justify-between items-start mb-2">
                  <div className="flex justify-between items-end mb-2">
                    {selectedCategories.length > 0 ? (
                      <p className="text-base font-bold text-muted-foreground rounded-md">
                        <span className="mr-0.5">{selectedCategories.length}</span>
                        <span className="text-xs">件選択中</span>
                      </p>
                    ) : (
                      <p className="text-xs px-3 py-1 bg-secondary font-bold border border-border text-muted-foreground rounded-md">
                        全カテゴリを表示中
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end items-center gap-4">
                    <PopoverTrigger asChild>
                      <Button size="sm" onClick={() => setShowPopover(true)}>
                        {'カテゴリを絞り込む'}
                      </Button>
                    </PopoverTrigger>
                  </div>
                </div>
                <PopoverContent
                  className="w-[240px] p-2"
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  <Command>
                    <div className="flex justify-between items-center">
                      <CommandInput placeholder="カテゴリを検索…" />
                      <Button size="sm" variant="ghost" onClick={() => setShowPopover(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <CommandList className="max-h-[400px] overflow-y-auto">
                      {uniqueCategories.map((category) => (
                        <CommandItem
                          key={category}
                          className="cursor-pointer"
                          onSelect={() => toggleCategory(category as MenuCategory)}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span
                              className={`${
                                selectedCategories.includes(category as MenuCategory)
                                  ? 'font-bold'
                                  : ''
                              }`}
                            >
                              {category}
                            </span>
                            {selectedCategories.includes(category as MenuCategory) && (
                              <Check className="w-4 h-4 font-bold text-accent-2" />
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Selected Filters Display */}
            {(selectedCategories.length > 0 || selectedGenders.length > 0 || targetType) && (
              <div className="flex items-center gap-2">
                {selectedCategories.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">カテゴリ:</p>
                    <div className="flex flex-wrap gap-1 bg-muted p-2 rounded-md">
                      {selectedCategories.map((category, index) => {
                        return (
                          <div
                            key={index}
                            className="flex justify-between items-center gap-1 px-2 py-0.5 bg-background border border-border text-muted-foreground rounded-md"
                          >
                            <span className="text-xs text-nowrap">{category}</span>
                            <button
                              onClick={() => {
                                setSelectedCategories(
                                  selectedCategories.filter((_, i) => i !== index)
                                )
                              }}
                            >
                              <X className="w-4 h-4 ml-1 text-destructive bg-destructive-foreground rounded-full p-0.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {selectedGenders.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">性別:</p>
                    <div className="flex flex-wrap gap-1 bg-muted p-2 rounded-md">
                      {selectedGenders.map((gender, index) => {
                        return (
                          <div
                            key={index}
                            className="flex justify-between items-center gap-1 px-2 py-0.5 bg-background border border-border text-muted-foreground rounded-md"
                          >
                            <span className="text-xs text-nowrap">{convertGender(gender)}</span>
                            <button
                              onClick={() => {
                                setSelectedGenders(selectedGenders.filter((_, i) => i !== index))
                              }}
                            >
                              <X className="w-4 h-4 ml-1 text-destructive bg-destructive-foreground rounded-full p-0.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      {/* Coupon Section */}
      <div className="w-full max-w-3xl mx-auto">
        <div className="space-y-3 md:space-y-6">

          {/* Selected Coupon Display */}
          {selectCoupon && (
            <div className="border-neon bg-neon-foreground p-2 rounded-md border-2">
              <div className="pb-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm md:text-base flex items-center text-neon">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                    選択中のクーポン
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCouponDeselect}
                    className="text-neon h-6 w-6 md:h-8 md:w-8 p-0 md:p-1"
                  >
                    <X className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              </div>
              <div className="pt-0 pb-3 md:pb-6">
                <div className="space-y-1 md:space-y-2">
                  <p className="font-medium text-sm md:text-base text-neon line-clamp-1">{selectCoupon.name}</p>
                  {selectedMenus.length > 0 ? (
                    <p className="text-xs md:text-sm text-neon">¥ {appliedDiscount.toLocaleString()} - OFF</p>
                  ) : (
                    <p className="text-[10px] md:text-xs text-neon/80">割引額はメニュー選択後に確定します</p>
                  )}
                  {selectedMenus.length > 0 &&
                    selectCoupon &&
                    (() => {
                      const selectedCouponData = availableCoupons.find(
                        (c) => c.coupon._id === selectCoupon._id
                      )
                      return (
                        selectedCouponData?.applicableMenus &&
                        selectedCouponData.applicableMenus.length > 0 && (
                          <p className="text-[10px] md:text-xs text-neon/80">
                            適用対象:{' '}
                            {selectedCouponData.applicableMenus.map((menu) => menu.name).join(', ')}
                          </p>
                        )
                      )
                    })()}

                  {/* 適用外メニューリスト */}
                  {selectCoupon && excludedMenuDetails?.menus && excludedMenuDetails.menus.length > 0 && (
                    <div className="mt-2 md:mt-3 pt-2 border-t border-neon/20">
                      <div className="flex items-center gap-1 mb-1">
                        <AlertTriangle size={12} className="text-neon/80" />
                        <p className="text-[10px] md:text-xs text-neon/80 font-medium">
                          適用外メニュー ({excludedMenuDetails.menus.length}件)
                        </p>
                      </div>
                      <div className="max-h-12 md:max-h-16 overflow-y-auto space-y-1">
                        {excludedMenuDetails.menus.map((menu) => (
                          <div key={menu._id} className="flex justify-between items-center text-[10px] md:text-xs bg-neon/10 p-0.5 rounded">
                            <span className="text-neon/80 truncate flex-1">{menu.name}</span>
                            <span className="text-neon/60 ml-2 text-nowrap">
                              ¥{(menu.sale_price && menu.sale_price > 0 ? menu.sale_price : menu.unit_price)?.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Available Coupons List */}
          {availableCoupons.length === 0 ? (
            <div className="text-center text-muted-foreground py-4 md:py-8">
              <Tag className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-2 md:mb-4 text-muted-foreground/50" />
              <p className="text-sm md:text-base">現在利用可能なクーポンはありません</p>
              <p className="text-xs md:text-sm mt-1 md:mt-2">
                選択したメニューや顧客タイプによって利用できるクーポンが決まります
              </p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-4">
              <p className="text-sm md:text-base font-medium">
                利用可能なクーポン ({availableCoupons.length}件)
              </p>
              <div className="flex overflow-x-auto gap-3 w-full snap-x snap-mandatory scrollbar-hide pb-2">
              {availableCoupons.map(({ coupon, applicableMenus }) => {
                const isSelected = selectCoupon?._id === coupon._id

                return (
                  <Card
                    key={coupon._id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md min-w-[280px] md:min-w-[320px] snap-start ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleCouponSelect(coupon)}
                  >
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-3">
                          <h4 className="font-medium text-sm md:text-base mb-1 text-neon line-clamp-1">{coupon.name}</h4>
                          <div className="flex items-center space-x-2 md:space-x-4 text-xs md:text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <Tag className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                              {coupon.discount_type === 'percentage'
                                ? `${coupon.percentage_discount_value}%割引`
                                : `¥${(coupon.fixed_discount_value ?? 0).toLocaleString()}割引`}
                            </span>
                          </div>
                          {selectedMenus.length > 0 ? (
                            <p className="text-xs md:text-sm text-primary font-medium mt-1 md:mt-2">
                              この注文での割引額: ¥
                              {calculateDiscount(coupon, applicableMenus).toLocaleString()}
                            </p>
                          ) : (
                            <p className="text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2">
                              割引額はメニュー選択後に確定します
                            </p>
                          )}
                          {applicableMenus.length > 0 && (
                            <p className="text-[10px] md:text-xs text-muted-foreground mt-1 line-clamp-1">
                              適用対象: {applicableMenus.map((menu) => menu.name).join(', ')}
                            </p>
                          )}
                        </div>
                        {isSelected ? (
                          <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-neon flex-shrink-0" />
                        ) : (
                          <div className="h-5 w-5 md:h-6 md:w-6 border-2 border-muted-foreground rounded-full flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Section */}
      <div className="w-full relative">
        <h3 className="text-lg md:text-2xl font-bold text-center tracking-wide mb-3 md:mb-6 text-primary">
          メニューを選択
        </h3>

        {/* Recommended Menus Carousel */}
        {getRecommendedMenus.length > 0 && (
          <div className="mb-4 md:mb-6">
            <div className="flex justify-between items-center mb-2 md:mb-4">
              <h2 className="text-lg md:text-xl font-bold text-primary">人気メニュー</h2>
              <div className="text-xs md:text-sm text-muted-foreground">
                {currentRecommendedIndex + 1} / {getRecommendedMenus.length}
              </div>
            </div>

            <Carousel
              setApi={setRecommendedCarouselApi}
              className="w-full"
              opts={{
                loop: getRecommendedMenus.length > 1,
                align: 'start',
              }}
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {getRecommendedMenus.map((menu: Doc<'menu'>) => {
                  const { isBlocked, reason } = menuBlocked(menu)
                  const isCurrentlySelected = isMenuSelected(menu)
                  const isCouponExcluded = selectedCoupon && isMenuExcludedByCoupon(menu)

                  const cardContent = (
                    <Card
                      className={`transition-all p-2 h-full ${
                        isCurrentlySelected
                          ? 'border-2 border-accent-2 shadow-md cursor-pointer'
                          : isBlocked || isCouponExcluded
                            ? 'opacity-50 border-2 border-transparent cursor-not-allowed'
                            : 'hover:shadow-md border-2 border-transparent cursor-pointer'
                      } ${
                        selectedCoupon && !isMenuExcludedByCoupon(menu) && !isBlocked
                          ? 'ring-2 ring-blue-200 bg-background'
                          : ''
                      }`}
                      onClick={() => !isBlocked && !isCouponExcluded && handleMenuSelect(menu, isMultipleSelection)}
                    >
                      <div className="px-2 pt-6 flex justify-between items-center relative">
                        <div className="absolute -top-2 -right-2 z-10">
                          {(isBlocked || isCouponExcluded) && (
                            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full">
                              選択不可
                            </span>
                          )}
                          {selectedCoupon && !isMenuExcludedByCoupon(menu) && !isBlocked && (
                            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                              適用対象
                            </span>
                          )}
                          {menu.categories?.includes('人気メニュー' as MenuCategory) && (
                            <span className="bg-neon-foreground border border-dashed border-neon text-neon text-[10px] font-bold px-2 py-1 rounded-full">
                              人気メニュー
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 divide-x divide-border text-xs text-muted-foreground text-nowrap">
                          <p className="pl-1">{convertGender(menu.target_gender as Gender)}</p>
                        </div>
                        {menu.tags && menu.tags.length > 0 && (
                          <div className="flex justify-end flex-wrap gap-0.5 scale-95">
                            {menu.tags.slice(0, 2).map((tag: string, idx: number) => (
                              <p
                                key={idx}
                                className="text-xs px-2 py-0.5 bg-muted border border-border text-muted-foreground rounded-full"
                              >
                                {tag}
                              </p>
                            ))}
                            {menu.tags.length > 2 && (
                              <p className="text-xs px-2 py-0.5 bg-muted border border-border text-muted-foreground rounded-full">
                                +{menu.tags.length - 2}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <CardContent className="p-2">
                        <div className="flex items-start gap-3">
                          {menu.images && menu.images.length > 0 && (
                            <div className="relative h-28 w-20 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                              <Image
                                src={menu.images[0].thumbnail_url || ''}
                                alt={menu.name || ''}
                                fill
                                className="object-cover"
                                quality={90}
                                priority
                              />
                            </div>
                          )}

                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-medium text-base line-clamp-2">{menu.name}</h3>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs scale-90 -ml-2 text-warning-foreground">
                                {convertPaymentMethod(menu.payment_method as PaymentMethod)}
                              </p>
                              {isSetMenu(menu) && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                  セット
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {menu.duration_min}分
                                </span>
                              </div>
                              {menu.sale_price ? (
                                <div className="flex items-center gap-1">
                                  <span className="line-through text-xs text-muted-foreground">
                                    ¥{menu.unit_price?.toLocaleString()}
                                  </span>
                                  <span className="font-bold text-accent-2">
                                    ¥{menu.sale_price?.toLocaleString()}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-medium">
                                  ¥{menu.unit_price?.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                className="z-10 text-xs underline text-link-foreground tracking-widest"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleShowMenuDetails(menu)
                                }}
                              >
                                詳細を見る
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )

                  return (
                    <CarouselItem
                      key={menu._id}
                      className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/2 mb-4"
                    >
                      {(isBlocked || isCouponExcluded) ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
                            <TooltipContent>
                              <p>{reason || (isCouponExcluded && '選択中のクーポンでは利用できません')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        cardContent
                      )}
                    </CarouselItem>
                  )
                })}
              </CarouselContent>
              {getRecommendedMenus.length > 1 && (
                <>
                  <CarouselPrevious className="-left-4" />
                  <CarouselNext className="-right-4" />
                </>
              )}
            </Carousel>
          </div>
        )}



        {/* Menu Details Dialog */}
        <Dialog
          open={showMenuDetails}
          onOpenChange={(open) => {
            setShowMenuDetails(open)
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            {selectedMenu && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl">{selectedMenu.name}</DialogTitle>
                  <DialogDescription>
                    {selectedMenu.categories && selectedMenu.categories.length > 0
                      ? selectedMenu.categories.join(', ')
                      : 'その他'}{' '}
                    | {convertActiveCustomerType(selectedMenu.target_type as ActiveCustomerType)} |{' '}
                    {convertGender(selectedMenu.target_gender as Gender)}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="w-full max-w-sm mx-auto">
                    {selectedMenu.images && selectedMenu.images.length > 0 ? (
                      <div className="space-y-4">
                        <Carousel
                          setApi={setMainCarouselApi}
                          className="w-full max-w-2xl mx-auto"
                          opts={{
                            loop: selectedMenu.images.length > 1,
                            align: 'start',
                          }}
                        >
                          <CarouselContent>
                            {selectedMenu.images.map((image, index) => (
                              <CarouselItem key={`main-${index}`}>
                                <div className="relative w-full h-full aspect-[3/4] bg-muted group rounded-lg overflow-hidden">
                                  <Image
                                    src={image.original_url || ''}
                                    alt={`${selectedMenu.name || 'メニュー画像'} ${index + 1}`}
                                    className="w-full max-h-[70vh] h-full object-contain"
                                    fill
                                    priority={index === currentMainImageIndex}
                                    loading={index === currentMainImageIndex ? 'eager' : 'lazy'}
                                  />
                                  {selectedMenu.images && selectedMenu.images.length > 1 && (
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

                        {selectedMenu.images && selectedMenu.images.length > 1 && (
                          <div className="flex space-x-2 justify-center overflow-x-auto py-2">
                            {selectedMenu.images.map((image, index) => (
                              <button
                                key={`thumb-${index}`}
                                onClick={() => handleThumbnailClick(index)}
                                className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 relative rounded-md border-2 overflow-hidden
                                             ${
                                               currentMainImageIndex === index
                                                 ? 'border-transparent ring-accent ring-2 ring-offset-1 sm:ring-offset-2'
                                                 : 'border-foreground opacity-70 hover:opacity-100'
                                             } focus:outline-none transition-all duration-150 ease-in-out`}
                                aria-label={`画像 ${index + 1} を表示`}
                              >
                                <Image
                                  src={image.thumbnail_url || ''}
                                  alt={`サムネイル ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  fill
                                  sizes="64px md:80px"
                                  loading="lazy"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-bold text-muted-foreground">
                        <span className="text-lg text-primary">{selectedMenu.duration_min} </span>分
                      </p>
                    </div>
                    <div>
                      {selectedMenu.sale_price ? (
                        <div className="flex items-center gap-1">
                          <span className="line-through text-sm text-muted-foreground">
                            ¥{selectedMenu.unit_price?.toLocaleString()}
                          </span>
                          <span className="font-bold text-accent-2 text-lg">
                            ¥{selectedMenu.sale_price?.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-lg">
                          ¥{selectedMenu.unit_price?.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedMenu.description && (
                    <div className="mt-2">
                      <Label className="text-sm font-medium">説明</Label>
                      <p className="text-sm mt-1 w-full whitespace-normal break-all bg-muted p-4 tracking-wide leading-5 rounded-md">
                        {selectedMenu.description}
                      </p>
                    </div>
                  )}

                  {selectedMenu.tags && selectedMenu.tags.length > 0 && (
                    <div className="mt-2">
                      <Label className="text-sm font-medium">タグ</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedMenu.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-muted border border-border text-muted-foreground rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedMenu.warning_message && (
                    <div className="bg-warning p-2 rounded-md mt-2 w-full">
                      <span className="text-xs text-warning-foreground font-bold">注意事項</span>
                      <p className="text-xs text-warning-foreground">
                        {selectedMenu.warning_message}
                      </p>
                    </div>
                  )}
                  <div className="mt-2">
                    <Label className="text-xs font-medium">支払い方法</Label>
                    <p className="text-xs tracking-wide w-fit mt-1 bg-warning border border-warning-foreground rounded-full py-1 px-2 text-warning-foreground">
                      {convertPaymentMethod(selectedMenu.payment_method as PaymentMethod)}
                    </p>
                  </div>
                </div>
                <DialogFooter className="flex flex-row justify-between items-center">
                  <DialogClose asChild>
                    <Button variant="outline">閉じる</Button>
                  </DialogClose>
                  <Button
                    onClick={() => {
                      handleMenuSelect(selectedMenu, isMultipleSelection)
                      setShowMenuDetails(false)
                    }}
                  >
                    {isMenuSelected(selectedMenu) ? 'メニューを解除' : 'メニューを選択'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Menu Categories */}
        <div className="mt-4 space-y-8">
          {Object.entries(filteredMenusToDisplay)
            .sort(([catA], [catB]) => {
              const order: MenuCategoryWithSet[] = ['セットメニュー', ...MENU_CATEGORY_VALUES]
              const indexA = order.indexOf(catA as MenuCategoryWithSet)
              const indexB = order.indexOf(catB as MenuCategoryWithSet)
              if (indexA === -1 && indexB === -1) return 0
              if (indexA === -1) return 1
              if (indexB === -1) return -1
              return indexA - indexB
            })
            .map(([categoryStr, categoryMenus]) => {
              const category = categoryStr as MenuCategoryWithSet

              if (
                categoryMenus.length === 0 &&
                !(selectedCategories.length > 0 && category === 'セットメニュー')
              ) {
                if (
                  category === 'セットメニュー' &&
                  !menus?.some(isSetMenu) &&
                  selectedCategories.length === 0
                )
                  return null
                if (category !== 'セットメニュー') return null
              }

              return (
                <section key={category}>
                  <div className="flex flex-col justify-between items-start w-full mb-4">
                    <h3 className="text-lg font-semibold">{category}</h3>
                    {category === 'セットメニュー' ? (
                      <span className="text-xs text-muted-foreground">
                        複数のカテゴリを含むメニューです。選択すると含まれるカテゴリは個別に選択できなくなります。
                      </span>
                    ) : isMultipleSelection ? null : (
                      <span className="text-xs text-muted-foreground">
                        同一カテゴリは一つまで選択可能です。
                      </span>
                    )}
                  </div>
                  {!(
                    categoryMenus.length === 0 &&
                    selectedCategories.length > 0 &&
                    category === 'セットメニュー'
                  ) &&
                    categoryMenus.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {categoryMenus
                          .sort((a, b) => {
                            if (category === '人気メニュー') {
                              const aUpdated = a.updated_at || a._creationTime || 0
                              const bUpdated = b.updated_at || b._creationTime || 0
                              return bUpdated - aUpdated
                            }
                            return 0
                          })
                          .map((menu) => {
                            const { isBlocked, reason } = menuBlocked(menu)
                            const isCurrentlySelected = isMenuSelected(menu)
                            const isCouponExcluded = selectedCoupon && isMenuExcludedByCoupon(menu)

                            const cardContent = (
                              <Card
                                className={`relative transition-all p-2 h-full ${
                                  isCurrentlySelected
                                    ? 'border-2 border-accent-2 shadow-md cursor-pointer'
                                    : isBlocked || isCouponExcluded
                                      ? 'opacity-50 border-2 border-transparent cursor-not-allowed'
                                      : 'hover:shadow-md border-2 border-transparent cursor-pointer'
                                } ${
                                  selectedCoupon && !isMenuExcludedByCoupon(menu) && !isBlocked
                                    ? 'ring-2 ring-blue-200 bg-background'
                                    : ''
                                }`}
                                onClick={() =>
                                  !isBlocked && !isCouponExcluded && handleMenuSelect(menu, isMultipleSelection)
                                }
                              >
                                <div className="absolute -top-4 -right-4 z-10">
                                  {(isBlocked || isCouponExcluded) && (
                                    <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full">
                                      選択不可
                                    </span>
                                  )}
                                  {selectedCoupon && !isMenuExcludedByCoupon(menu) && !isBlocked && (
                                    <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                      適用対象
                                    </span>
                                  )}
                                  {menu.categories?.includes('人気メニュー' as MenuCategory) && (
                                    <span className="bg-neon-foreground border border-dashed border-neon text-neon text-[10px] font-bold px-2 py-1 rounded-full">
                                      人気メニュー
                                    </span>
                                  )}
                                </div>

                                <div className="px-2 pt-2 flex justify-between items-center">
                                  <div className="flex flex-wrap gap-1 divide-x divide-border text-xs text-muted-foreground text-nowrap">
                                    <p className="">
                                      {convertActiveCustomerType(
                                        menu.target_type as ActiveCustomerType
                                      )}
                                    </p>
                                    <p className="pl-1">
                                      {convertGender(menu.target_gender as Gender)}
                                    </p>
                                  </div>
                                  {menu.tags && menu.tags.length > 0 && (
                                    <div className="flex justify-end flex-wrap gap-0.5 scale-95">
                                      {menu.tags.map((tag, idx) => (
                                        <p
                                          key={idx}
                                          className="text-xs px-2 py-0.5 bg-muted border border-border text-muted-foreground rounded-full"
                                        >
                                          {tag}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <CardContent className="p-2">
                                  <div className="flex items-start gap-3">
                                    {menu.images && menu.images.length > 0 && (
                                      <div className="relative h-28 w-20 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                                        <Image
                                          src={menu.images[0].thumbnail_url || ''}
                                          alt={menu.name || ''}
                                          fill
                                          className="object-cover"
                                          quality={90}
                                          priority
                                        />
                                      </div>
                                    )}

                                    <div className="flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <h3 className="font-medium text-base">{menu.name}</h3>
                                      </div>
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs scale-90 -ml-2 text-warning-foreground ">
                                          {convertPaymentMethod(
                                            menu.payment_method as PaymentMethod
                                          )}
                                        </p>
                                        {isSetMenu(menu) && (
                                          <span className="text-xs px-2 py-0.5 bg-link text-link-foreground rounded-full">
                                            セット
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between gap-2 mt-1">
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-sm text-muted-foreground">
                                            {menu.duration_min}分
                                          </span>
                                        </div>
                                        {menu.sale_price ? (
                                          <div className="flex items-center gap-1">
                                            <span className="line-through text-xs text-muted-foreground">
                                              ¥{menu.unit_price?.toLocaleString()}
                                            </span>
                                            <span className="font-bold text-accent-2">
                                              ¥{menu.sale_price?.toLocaleString()}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="font-medium">
                                            ¥{menu.unit_price?.toLocaleString()}
                                          </span>
                                        )}
                                      </div>
                                      {menu.warning_message && (
                                        <div className="bg-warning p-2 rounded-md w-fit mt-1">
                                          <p className="text-xs text-warning-foreground">
                                            {menu.warning_message}
                                          </p>
                                        </div>
                                      )}
                                      <div className="flex justify-end">
                                        <Button
                                          variant="ghost"
                                          className="z-10 text-xs underline text-link-foreground tracking-widest"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleShowMenuDetails(menu)
                                          }}
                                        >
                                          詳細を見る
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )

                            return (
                              <div key={menu._id}>
                                {(isBlocked || isCouponExcluded) ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          {reason ||
                                            (isCouponExcluded && '選択中のクーポンでは利用できません')}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  cardContent
                                )}
                              </div>
                            )
                          })}
                      </div>
                    )}
                  {category === 'セットメニュー' &&
                    categoryMenus.length === 0 &&
                    selectedCategories.length > 0 &&
                    !selectedCategories.includes('セットメニュー' as MenuCategory) && (
                      <p className="text-sm text-muted-foreground mt-2">
                        選択中のカテゴリに該当するセットメニューはありません。
                      </p>
                    )}
                </section>
              )
            })}
        </div>

        {/* Selected Menus Display */}
        {selectedCoupon && availableCoupons && (
          <div className="my-4 w-full">
            <h3 className="text-base font-medium mb-2">選択中のクーポン</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-muted rounded-md">
                <div>
                  <span className="text-xs font-bold">
                    {availableCoupons.filter((c) => c.coupon._id === selectedCoupon).map((c) => c.coupon.name)}
                  </span>
                  <p className="text-xs md:text-sm text-neon">¥ {appliedDiscount.toLocaleString()} - OFF</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {selectedMenusArray.length > 0 && (
          <div className="my-8">
            <h3 className="text-base font-medium mb-2">選択中のメニュー {selectedMenusArray.length}点</h3>
            <div className="space-y-2">
              {selectedMenusArray.map((menu) => (
                <div
                  key={menu._id}
                  className="flex justify-between items-center p-2 bg-muted rounded-md"
                >
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {menu.categories && menu.categories.length > 0
                        ? menu.categories.join(', ')
                        : 'その他'}{' '}
                      / {menu.duration_min}分
                    </span>
                    <span className="block text-sm font-bold">{menu.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-accent-2 font-bold">
                      {menu.sale_price ? (
                        <div className="flex items-center gap-1">
                          <span className="line-through text-xs text-muted-foreground">
                            ¥{menu.unit_price?.toLocaleString()}
                          </span>
                          <span className="font-bold text-accent-2">
                            ¥{menu.sale_price?.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="font-medium">¥{menu.unit_price?.toLocaleString()}</span>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive-foreground border-destructive-foreground bg-destructive h-8 w-8 p-0"
                      onClick={() => handleMenuSelect(menu, isMultipleSelection)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const CouponMenuView = (props: CouponMenuViewProps) => {
  return (
    <CouponErrorBoundary>
      <CouponMenuViewInner {...props} />
    </CouponErrorBoundary>
  )
}