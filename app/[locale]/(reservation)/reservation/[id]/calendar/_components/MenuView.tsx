'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { api } from '@/convex/_generated/api'
import { Doc, Id } from '@/convex/_generated/dataModel'
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
import { Button } from '@/components/ui/button'
import { usePaginatedQuery } from 'convex/react'
import { convertPaymentMethod, MENU_CATEGORY_VALUES, MenuCategory } from '@/convex/types'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, X } from 'lucide-react'
import {
  convertGender,
  convertActiveCustomerType,
  Gender,
  ActiveCustomerType,
  PaymentMethod,
  GENDER_VALUES,
} from '@/convex/types'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandItem } from '@/components/ui/command'
import { Check } from 'lucide-react'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel'

interface MenuViewProps {
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  selectedMenuIds: Id<'menu'>[] | null
  onChangeMenusAction: (menus: Doc<'menu'>[]) => void
  targetType?: ActiveCustomerType | null | undefined
  isMultipleSelection?: boolean
}

type MenuCategoryWithSet = MenuCategory | 'セットメニュー'

export const MenuView = ({
  tenantId,
  orgId,
  selectedMenuIds,
  onChangeMenusAction,
  targetType,
  isMultipleSelection,
}: MenuViewProps) => {
  // STATES
  const [currentCategory, setCurrentCategory] = useState<MenuCategoryWithSet | null>(null)
  const [showMenuDetails, setShowMenuDetails] = useState<boolean>(false)
  const [selectedMenu, setSelectedMenu] = useState<Doc<'menu'> | null>(null)
  const [selectedMenuMap, setSelectedMenuMap] = useState<Record<string, Doc<'menu'>>>({})
  const [selectedCategories, setSelectedCategories] = useState<MenuCategoryWithSet[]>([])
  const [showPopover, setShowPopover] = useState<boolean>(false)
  const [blockedCategories, setBlockedCategories] = useState<MenuCategoryWithSet[]>([])
  const [selectedGenders, setSelectedGenders] = useState<Gender[]>([])
  console.log('targetType', targetType)
  const [showGenderPopover, setShowGenderPopover] = useState<boolean>(false)

  // ADDED START: State and effect for Carousel
  const [mainCarouselApi, setMainCarouselApi] = useState<CarouselApi>()
  const [currentMainImageIndex, setCurrentMainImageIndex] = useState(0)

  // 人気メニューCarousel用のState
  const [recommendedCarouselApi, setRecommendedCarouselApi] = useState<CarouselApi>()
  const [currentRecommendedIndex, setCurrentRecommendedIndex] = useState(0)

  // ADDED START: Effect to sync main carousel's current image index
  useEffect(() => {
    if (!mainCarouselApi) {
      return
    }

    const handleSelect = () => {
      setCurrentMainImageIndex(mainCarouselApi.selectedScrollSnap())
    }

    mainCarouselApi.on('select', handleSelect)
    // 初期状態を設定
    handleSelect()

    // クリーンアップ関数
    return () => {
      mainCarouselApi.off('select', handleSelect)
    }
  }, [mainCarouselApi])
  // ADDED END: Effect to sync main carousel's current image index

  // 人気メニューCarousel用のEffect
  useEffect(() => {
    if (!recommendedCarouselApi) {
      return
    }

    const handleSelect = () => {
      setCurrentRecommendedIndex(recommendedCarouselApi.selectedScrollSnap())
    }

    recommendedCarouselApi.on('select', handleSelect)
    handleSelect()

    return () => {
      recommendedCarouselApi.off('select', handleSelect)
    }
  }, [recommendedCarouselApi])

  // 選択されたメニューの配列を取得するための計算プロパティ
  const selectedMenus = useMemo(() => {
    return Object.values(selectedMenuMap)
  }, [selectedMenuMap])

  // CONVEX
  const { results: menus, isLoading } = usePaginatedQuery(
    api.menu.query.listByTenantAndOrg,
    {
      tenant_id: tenantId as Id<'tenant'>,
      org_id: orgId as Id<'organization'>,
    },
    {
      initialNumItems: 100,
    }
  )

  // セットメニューかどうかを判定する関数
  const isSetMenu = useCallback((menu: Doc<'menu'>): boolean => {
    return Array.isArray(menu.categories) && menu.categories.length > 1
  }, [])

  // メニューがブロックされているかどうかを判定する関数
  const menuBlocked = (menu: Doc<'menu'>): boolean => {
    // セットメニューはブロックされない
    if (isSetMenu(menu)) return false

    // メニューのカテゴリが一つでもブロックされていればtrue
    return menu.categories
      ? menu.categories.some((cat) => blockedCategories.includes(cat))
      : blockedCategories.includes('その他')
  }

  // FUNCTIONS
  const extractUniqueCategories = (menus: Doc<'menu'>[]): MenuCategoryWithSet[] => {
    // Set を使用して重複を排除
    const categorySet = new Set<MenuCategoryWithSet>()

    // メニューからカテゴリを抽出して Set に追加
    menus.forEach((menu) => {
      if (Array.isArray(menu.categories) && menu.categories.length > 0) {
        menu.categories.forEach((cat) => categorySet.add(cat))
      } else {
        categorySet.add('その他')
      }
    })

    // セットメニューを順序配列に追加
    const categoryOrder: MenuCategoryWithSet[] = [...MENU_CATEGORY_VALUES, 'セットメニュー']

    // 順序に基づいて並び替え（存在するカテゴリのみ）
    return categoryOrder.filter((category) => categorySet.has(category))
  }

  // カテゴリに基づいてメニューをフィルタリング
  const getMenusByCategory = useCallback(
    (category: MenuCategoryWithSet | null): Doc<'menu'>[] => {
      if (!category || !menus) return []

      if (category === 'セットメニュー') {
        // セットメニューカテゴリの場合、複数カテゴリを持つメニューを返す
        return menus.filter((menu) => isSetMenu(menu))
      }

      if (category === 'その他') {
        // 「その他」カテゴリの場合、カテゴリがないメニューを返す
        return menus.filter((menu) => !menu.categories || menu.categories.length === 0)
      }

      // 選択されたカテゴリがメニューのカテゴリ配列に含まれていれば表示
      // ただし、セットメニューとして分類されるものは除く
      return menus.filter(
        (menu) =>
          Array.isArray(menu.categories) &&
          menu.categories.includes(category) && // 選択されたカテゴリを含む
          !isSetMenu(menu) // セットメニューではない
      )
    },
    [menus, isSetMenu]
  )

  // メニューが選択済みかどうかを判定するユーティリティ
  const isMenuSelected = useCallback(
    (checkMenu: Doc<'menu'>) => {
      return Object.values(selectedMenuMap).some((m) => m._id === checkMenu._id)
    },
    [selectedMenuMap]
  )

  // メニュー選択時の処理
  const handleMenuSelect = (menu: Doc<'menu'>, allowMultipleSelection: boolean = true) => {
    const isSet = isSetMenu(menu)
    const menuCategories = menu.categories || []
    const newSelectedMenuMap: Record<string, Doc<'menu'>> = { ...selectedMenuMap }

    // すでに選択済みかどうかをチェック
    const existingKey = Object.keys(newSelectedMenuMap).find(
      (k) => newSelectedMenuMap[k]._id === menu._id
    )

    // --- 解除処理 ------------------------------
    if (existingKey) {
      delete newSelectedMenuMap[existingKey]

      // セットメニュー解除時はブロックを再計算
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
      // --- 追加処理 ------------------------------

      // ブロックされているカテゴリか判定（セットメニューは常に選択可）
      const categoryIsBlocked = isSet
        ? false
        : menuCategories.some((cat) => blockedCategories.includes(cat))

      if (categoryIsBlocked) {
        alert('このメニューは現在選択できません。セットメニューと競合しています。')
        return
      }

      // allowMultipleSelection が false の場合、同一カテゴリの既存メニューを除外
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

      // セットメニュー選択時は関連カテゴリのメニューを解除
      if (isSet) {
        Object.keys(newSelectedMenuMap).forEach((k) => {
          const m = newSelectedMenuMap[k]
          if (!isSetMenu(m) && m.categories?.some((cat) => menuCategories.includes(cat))) {
            delete newSelectedMenuMap[k]
          }
        })
        setBlockedCategories(menuCategories)
      }

      // メニューをマップに追加（キーは menu._id で一意に）
      newSelectedMenuMap[menu._id] = menu
    }

    setSelectedMenuMap(newSelectedMenuMap)
    onChangeMenusAction(Object.values(newSelectedMenuMap))
  }

  const handleShowMenuDetails = (menu: Doc<'menu'>) => {
    console.log('handleShowMenuDetails が呼ばれました', menu.name) // デバッグ用
    setSelectedMenu(menu)
    setShowMenuDetails(true)
  }

  // 初期メニュー選択の設定
  useEffect(() => {
    if (selectedMenuIds && selectedMenuIds.length > 0 && menus) {
      // IDからメニューオブジェクトを取得
      const menuMap: Record<string, Doc<'menu'>> = {}
      const blockedCats: MenuCategoryWithSet[] = []

      selectedMenuIds.forEach((menuId) => {
        const menu = menus.find((m) => m._id === menuId)
        if (menu) {
          menuMap[menu._id] = menu

          // セットメニューの場合はブロックカテゴリを設定
          if (isSetMenu(menu) && menu.categories) {
            blockedCats.push(...menu.categories)
          }
        }
      })

      setSelectedMenuMap(menuMap)
      setBlockedCategories(blockedCats)
    }
  }, [selectedMenuIds, menus, isSetMenu])

  // 初期カテゴリ設定
  useEffect(() => {
    if (menus && menus.length > 0) {
      const uniqueCategories = extractUniqueCategories(menus)
      if (uniqueCategories.length > 0 && !currentCategory) {
        const initialCategory = uniqueCategories[0]
        setCurrentCategory(initialCategory)
      }
    }
  }, [menus, currentCategory])

  // ユニークカテゴリ取得
  const uniqueCategories: MenuCategoryWithSet[] = useMemo(() => {
    const categories = extractUniqueCategories(menus)
    // セットメニューが含まれていない場合は追加
    if (!categories.includes('セットメニュー')) {
      return [...categories, 'セットメニュー']
    }
    return categories
  }, [menus])

  // カテゴリトグル関数
  const toggleCategory = (category: MenuCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  // 性別トグル関数
  const toggleGender = (gender: Gender) => {
    setSelectedGenders((prev) =>
      prev.includes(gender) ? prev.filter((g) => g !== gender) : [...prev, gender]
    )
  }

  const handleThumbnailClick = (index: number) => {
    mainCarouselApi?.scrollTo(index)
  }

  // 人気メニューを取得する関数
  const getRecommendedMenus = useMemo(() => {
    if (!menus) return []

    // 「人気メニュー」カテゴリのメニューを取得
    const recommendedMenus = menus.filter((menu) => {
      return menu.categories?.includes('人気メニュー' as MenuCategory)
    })

    // 性別・顧客タイプでフィルタリング
    return (
      recommendedMenus
        .filter((menu) => {
          const genderMatches =
            selectedGenders.length === 0 ||
            selectedGenders.includes(menu.target_gender as Gender) ||
            menu.target_gender === 'unselected'

          const customerTypeMatches = targetType === menu.target_type || menu.target_type === 'all'

          return genderMatches && customerTypeMatches
        })
        // 最新のメニューを上位に表示（更新日時順）
        .sort((a, b) => {
          const aUpdated = a.updated_at || a._creationTime || 0
          const bUpdated = b.updated_at || b._creationTime || 0
          return bUpdated - aUpdated
        })
    )
  }, [menus, selectedGenders, targetType])

  const filteredMenusToDisplay = useMemo(() => {
    if (!menus) return {}

    // メニューをフィルタリングする関数
    const filterMenusByGenderAndType = (menuList: Doc<'menu'>[]): Doc<'menu'>[] => {
      return menuList.filter((menu) => {
        // 性別フィルター
        const genderMatches =
          selectedGenders.length === 0 ||
          selectedGenders.includes(menu.target_gender as Gender) ||
          menu.target_gender === 'unselected'

        // 顧客タイプフィルター
        const customerTypeMatches = targetType === menu.target_type || menu.target_type === 'all'

        return genderMatches && customerTypeMatches
      })
    }

    // カテゴリ絞り込みがない場合は、すべてのメニューをカテゴリ別にグループ化して返す
    if (selectedCategories.length === 0) {
      const grouped: Partial<Record<MenuCategoryWithSet, Doc<'menu'>[]>> = {}
      uniqueCategories.forEach((cat) => {
        const categoryMenus = getMenusByCategory(cat)
        grouped[cat] = filterMenusByGenderAndType(categoryMenus)
      })
      return grouped
    }

    // 選択されたカテゴリに基づいてフィルタリング
    const result: Partial<Record<MenuCategoryWithSet, Doc<'menu'>[]>> = {}

    selectedCategories.forEach((selectedCat) => {
      // selectedCat が MenuCategory であることを保証 (型安全のため)
      const currentFilteringCategory = selectedCat as MenuCategory

      // 通常カテゴリのメニューを取得 (セットメニューは除く)
      const categoryMenus = menus.filter((menu) => {
        if (isSetMenu(menu)) return false // セットメニューは別途専用ロジックで扱う

        if (!menu.categories || menu.categories.length === 0) {
          return currentFilteringCategory === 'その他'
        }
        return menu.categories.includes(currentFilteringCategory)
      })

      // 性別・顧客タイプでフィルタリング
      const filteredCategoryMenus = filterMenusByGenderAndType(categoryMenus)

      if (filteredCategoryMenus.length > 0) {
        if (!result[currentFilteringCategory]) {
          result[currentFilteringCategory] = []
        }
        // 重複を避けて追加
        filteredCategoryMenus.forEach((menu) => {
          if (!result[currentFilteringCategory]?.find((m) => m._id === menu._id)) {
            result[currentFilteringCategory]?.push(menu)
          }
        })
      }
    })

    // セットメニューの処理
    // 常に「セットメニュー」カテゴリのセクションは表示する可能性があるためキーは保持
    // 実際に表示するセットメニューは、選択されたカテゴリに合致するもの、または全てのセットメニュー
    const setMenuCategoryKey = 'セットメニュー' as MenuCategoryWithSet
    const allSetMenus = menus.filter(isSetMenu)
    let relevantSetMenus: Doc<'menu'>[] = []

    if (selectedCategories.length === 0) {
      relevantSetMenus = allSetMenus // 絞り込みがない場合は全てのセットメニュー
    } else if (selectedCategories.includes(setMenuCategoryKey as MenuCategory)) {
      relevantSetMenus = allSetMenus // 「セットメニュー」が選択されていれば全てのセットメニュー
    } else {
      // 他のカテゴリが選択されている場合、それらのカテゴリを一つでも含むセットメニューを抽出
      relevantSetMenus = allSetMenus.filter((sMenu) =>
        sMenu.categories?.some((cat) => selectedCategories.includes(cat as MenuCategory))
      )
    }

    // セットメニューも性別・顧客タイプでフィルタリング
    const filteredSetMenus = filterMenusByGenderAndType(relevantSetMenus)

    // 既存の result にセットメニューのカテゴリがなければ初期化
    if (!result[setMenuCategoryKey] && filteredSetMenus.length > 0) {
      result[setMenuCategoryKey] = []
    }
    // filteredSetMenus を result[setMenuCategoryKey] にマージ (重複回避)
    filteredSetMenus.forEach((menu) => {
      if (!result[setMenuCategoryKey]?.find((m) => m._id === menu._id)) {
        result[setMenuCategoryKey]?.push(menu)
      }
    })
    // selectedCategories に何も含まれていない場合でも、セットメニューのキーは保持したいので、
    // もし filteredSetMenus が空でも、キーだけは作成しておく（表示ロジックで中身がなければ非表示になる）
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

  if (isLoading) return <Loading />

  return (
    <div className="w-full relative">
      {/* 人気メニューCarousel */}
      {getRecommendedMenus.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary">人気メニュー</h2>
            <div className="text-sm text-muted-foreground">
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
                const isBlocked = menuBlocked(menu)
                const isCurrentlySelected = isMenuSelected(menu)

                return (
                  <CarouselItem
                    key={menu._id}
                    className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/2 mb-4 "
                  >
                    <Card
                      className={`transition-all p-2 h-full ${
                        isCurrentlySelected
                          ? 'border-2 border-accent-2 shadow-md cursor-pointer'
                          : isBlocked
                            ? 'opacity-50 border-2 border-transparent'
                            : 'hover:shadow-md border-2 border-transparent cursor-pointer'
                      }`}
                      onClick={() => !isBlocked && handleMenuSelect(menu, isMultipleSelection)}
                    >
                      <div className=" px-2 pt-6 flex justify-between items-center relative ">
                        <div className="absolute -top-2 -right-2 z-10">
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
      <Card className="p-4 border-border">
        <p className="text-xs text-muted-foreground mb-2 border-b border-border pb-2">
          予約したいメニューを絞り込めます。カテゴリまたは性別を選択してください。
        </p>
        <div className="space-y-4">
          <div className="flex gap-2 justify-between">
            {/* 性別フィルター */}
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

            {/* カテゴリフィルター */}
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

          {/* 選択されたフィルターのタグ表示 */}
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
                    <p className="text-sm mt-1 w-full whitespace-normal break-all bg-muted p-4  tracking-wide leading-5 rounded-md">
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
      <div className="mt-4 space-y-8">
        {Object.entries(filteredMenusToDisplay)
          .sort(([catA], [catB]) => {
            // 'セットメニュー' を最後に表示するためのソートロジック
            const order: MenuCategoryWithSet[] = [
              ...MENU_CATEGORY_VALUES,
              'その他',
              'セットメニュー',
            ]
            const indexA = order.indexOf(catA as MenuCategoryWithSet)
            const indexB = order.indexOf(catB as MenuCategoryWithSet)
            if (indexA === -1 && indexB === -1) return 0 // 両方とも順序配列になければそのまま
            if (indexA === -1) return 1 // AだけなければAを後ろに
            if (indexB === -1) return -1 // BだけなければBを後ろに
            return indexA - indexB
          })
          .map(([categoryStr, categoryMenus]) => {
            const category = categoryStr as MenuCategoryWithSet // 型キャスト

            // カテゴリに該当するメニューがない場合はセクションを表示しない
            // ただし、絞り込み表示で「セットメニュー」が選択されていなくても、
            // 他のカテゴリとの関連でセットメニューセクションのヘッダーだけは表示したい場合があるため、
            // selectedCategories が空でない、かつ category が 'セットメニュー' の場合は、categoryMenus が空でも表示を試みる
            if (
              categoryMenus.length === 0 &&
              !(selectedCategories.length > 0 && category === 'セットメニュー')
            ) {
              // もし、categoryがセットメニューで、かつ実際に表示すべきセットメニューがない場合はここで早期リターン
              // （例えば、絞り込みがなく、元々セットメニューが０件の場合など）
              if (
                category === 'セットメニュー' &&
                !menus?.some(isSetMenu) &&
                selectedCategories.length === 0
              )
                return null
              // selectedCategories が空でなく、category が 'セットメニュー' で、categoryMenus が空の場合でも、
              // ヘッダーだけ表示するケースがあるので、ここではリターンしない。
              // それ以外のカテゴリでメニューがなければ非表示
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
                {/* categoryMenus が空でも、selectedCategories が空でなく category が 'セットメニュー' の場合は grid を表示しない */}
                {!(
                  categoryMenus.length === 0 &&
                  selectedCategories.length > 0 &&
                  category === 'セットメニュー'
                ) &&
                  categoryMenus.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {categoryMenus
                        .sort((a, b) => {
                          //  人気メニューカテゴリの場合は、updated_atで新しいものを上に
                          if (category === '人気メニュー') {
                            const aUpdated = a.updated_at || a._creationTime || 0
                            const bUpdated = b.updated_at || b._creationTime || 0
                            return bUpdated - aUpdated // 降順（新しいものが上）
                          }
                          // その他のカテゴリは既存の順序を維持
                          return 0
                        })
                        .map((menu) => {
                          const isBlocked = menuBlocked(menu)
                          const isCurrentlySelected = isMenuSelected(menu)

                          return (
                            <Card
                              key={menu._id}
                              className={`relative transition-all p-2 h-full ${
                                isCurrentlySelected
                                  ? 'border-2 border-accent-2 shadow-md cursor-pointer'
                                  : isBlocked
                                    ? 'opacity-50 border-2 border-transparent'
                                    : 'hover:shadow-md border-2 border-transparent cursor-pointer'
                              }`}
                              onClick={() =>
                                !isBlocked && handleMenuSelect(menu, isMultipleSelection)
                              }
                            >
                              <div className="absolute -top-4 -right-4 z-10">
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
                                        {convertPaymentMethod(menu.payment_method as PaymentMethod)}
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
                                    <div className="flex justify-end">
                                      <Button
                                        variant="ghost"
                                        className="z-10 text-xs underline text-link-foreground tracking-widest"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation() // クリックイベントの伝播を停止
                                          // 詳細モーダルを表示する処理を実装
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
                        })}
                    </div>
                  )}
                {/* 絞り込みがあり、かつセットメニューカテゴリで、表示すべきメニューがない場合にメッセージを表示 */}
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
      {/* 選択済みメニュー表示 */}
      {selectedMenus.length > 0 && (
        <div className="my-8">
          <h3 className="text-base font-medium mb-2">選択中のメニュー {selectedMenus.length}点</h3>
          <div className="space-y-2">
            {selectedMenus.map((menu) => (
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
  )
}
