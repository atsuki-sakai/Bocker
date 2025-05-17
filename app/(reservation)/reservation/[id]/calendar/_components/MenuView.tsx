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
import {
  convertPaymentMethod,
  MENU_CATEGORY_VALUES,
  MenuCategory,
} from '@/services/convex/shared/types/common'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, X, Info } from 'lucide-react'
import {
  convertGender,
  convertTarget,
  Gender,
  Target,
  PaymentMethod,
} from '@/services/convex/shared/types/common'
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
  salonId: Id<'salon'>
  selectedMenuIds: Id<'menu'>[] | null
  onChangeMenusAction: (menus: Doc<'menu'>[]) => void
}

type MenuCategoryWithSet = MenuCategory | 'セットメニュー'

export const MenuView = ({ salonId, selectedMenuIds, onChangeMenusAction }: MenuViewProps) => {
  // STATES
  const [currentCategory, setCurrentCategory] = useState<MenuCategoryWithSet | null>(null)
  const [showMenuDetails, setShowMenuDetails] = useState<boolean>(false)
  const [selectedMenu, setSelectedMenu] = useState<Doc<'menu'> | null>(null)
  const [selectedMenuMap, setSelectedMenuMap] = useState<
    Partial<Record<MenuCategoryWithSet, Doc<'menu'>>>
  >({})
  const [selectedCategories, setSelectedCategories] = useState<MenuCategoryWithSet[]>([])
  const [showPopover, setShowPopover] = useState<boolean>(false)
  const [blockedCategories, setBlockedCategories] = useState<MenuCategoryWithSet[]>([])

  // ADDED START: State and effect for Carousel
  const [mainCarouselApi, setMainCarouselApi] = useState<CarouselApi>()
  const [currentMainImageIndex, setCurrentMainImageIndex] = useState(0)

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

  // 選択されたメニューの配列を取得するための計算プロパティ
  const selectedMenus = useMemo(() => {
    return Object.values(selectedMenuMap)
  }, [selectedMenuMap])

  // CONVEX
  const { results: menus, isLoading } = usePaginatedQuery(
    api.menu.core.query.listBySalonId,
    {
      salonId: salonId as Id<'salon'>,
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

  // メニュー選択時の処理
  const handleMenuSelect = (menu: Doc<'menu'>) => {
    const isMenuSet = isSetMenu(menu)
    const menuCategories = menu.categories || []
    const newSelectedMenuMap = { ...selectedMenuMap }

    // メニューが既に選択されている場合（選択解除のケース）
    if (
      (isMenuSet && selectedMenuMap['セットメニュー']?._id === menu._id) ||
      (!isMenuSet &&
        menuCategories.length > 0 &&
        selectedMenuMap[menuCategories[0]]?._id === menu._id) ||
      (!menuCategories.length && selectedMenuMap['その他']?._id === menu._id)
    ) {
      if (isMenuSet) {
        delete newSelectedMenuMap['セットメニュー']
        // セットメニュー解除時、ブロックされたカテゴリをクリア
        setBlockedCategories([])
      } else {
        const category = menuCategories.length > 0 ? menuCategories[0] : 'その他'
        delete newSelectedMenuMap[category]
      }
    }
    // 新しいメニュー選択のケース
    else {
      // 選択しようとしているカテゴリがブロックされているかチェック
      const categoryIsBlocked = isMenuSet
        ? false // セットメニューは常に選択可能
        : menuCategories.some((cat) => blockedCategories.includes(cat))

      if (categoryIsBlocked) {
        // ブロックされているカテゴリなら選択させない
        alert('このメニューは現在選択できません。セットメニューと競合しています。')
        return
      }

      if (isMenuSet) {
        // セットメニュー選択時、既存の競合するカテゴリの選択を解除
        menuCategories.forEach((cat) => {
          if (newSelectedMenuMap[cat]) {
            delete newSelectedMenuMap[cat]
          }
        })

        // セットメニューをマップに追加
        newSelectedMenuMap['セットメニュー'] = menu

        // ブロックするカテゴリを設定
        setBlockedCategories(menuCategories)
      } else {
        // 通常メニュー選択
        const category = menuCategories.length > 0 ? menuCategories[0] : 'その他'
        newSelectedMenuMap[category] = menu
      }
    }

    setSelectedMenuMap(newSelectedMenuMap)
    // 選択されたメニューの配列を親コンポーネントに渡す
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
      const menuMap: Partial<Record<MenuCategoryWithSet, Doc<'menu'>>> = {}
      const blockedCats: MenuCategoryWithSet[] = []

      selectedMenuIds.forEach((menuId) => {
        const menu = menus.find((m) => m._id === menuId)
        if (menu) {
          if (isSetMenu(menu)) {
            menuMap['セットメニュー'] = menu
            // ブロックするカテゴリを追加
            if (menu.categories) {
              blockedCats.push(...menu.categories)
            }
          } else {
            const category =
              menu.categories && menu.categories.length > 0 ? menu.categories[0] : 'その他'
            menuMap[category] = menu
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

  const handleThumbnailClick = (index: number) => {
    mainCarouselApi?.scrollTo(index)
  }

  const filteredMenusToDisplay = useMemo(() => {
    if (!menus) return {}

    // カテゴリ絞り込みがない場合は、すべてのメニューをカテゴリ別にグループ化して返す
    if (selectedCategories.length === 0) {
      const grouped: Partial<Record<MenuCategoryWithSet, Doc<'menu'>[]>> = {}
      uniqueCategories.forEach((cat) => {
        // getMenusByCategory は null を受け付けないように修正されている前提
        grouped[cat] = getMenusByCategory(cat)
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

      if (categoryMenus.length > 0) {
        if (!result[currentFilteringCategory]) {
          result[currentFilteringCategory] = []
        }
        // 重複を避けて追加
        categoryMenus.forEach((menu) => {
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
    // 既存の result にセットメニューのカテゴリがなければ初期化
    if (!result[setMenuCategoryKey] && relevantSetMenus.length > 0) {
      result[setMenuCategoryKey] = []
    }
    // relevantSetMenus を result[setMenuCategoryKey] にマージ (重複回避)
    relevantSetMenus.forEach((menu) => {
      if (!result[setMenuCategoryKey]?.find((m) => m._id === menu._id)) {
        result[setMenuCategoryKey]?.push(menu)
      }
    })
    // selectedCategories に何も含まれていない場合でも、セットメニューのキーは保持したいので、
    // もし relevantSetMenus が空でも、キーだけは作成しておく（表示ロジックで中身がなければ非表示になる）
    if (!result[setMenuCategoryKey]) {
      result[setMenuCategoryKey] = []
    }

    return result
  }, [menus, selectedCategories, uniqueCategories, getMenusByCategory, isSetMenu])

  if (isLoading) return <Loading />

  return (
    <div className="w-full relative">
      {/* カテゴリタブ */}

      <Popover open={showPopover} onOpenChange={setShowPopover}>
        <div className="flex justify-between items-end">
          <div className="flex justify-between items-end">
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
                        selectedCategories.includes(category as MenuCategory) ? 'font-bold' : ''
                      }`}
                    >
                      {category}
                    </span>
                    {selectedCategories.includes(category as MenuCategory) && (
                      <Check className="w-4 h-4 font-bold text-active" />
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap mt-2 gap-1 bg-muted p-2 rounded-md ">
          {selectedCategories.map((category, index) => {
            return (
              <div
                key={index}
                className="flex justify-between items-center gap-1 px-2 py-0.5 bg-background border border-border text-muted-foreground rounded-md"
              >
                <span className="text-xs">{category}</span>
                <button
                  onClick={() => {
                    setSelectedCategories(selectedCategories.filter((_, i) => i !== index))
                  }}
                >
                  <X className="w-4 h-4 ml-1 text-destructive bg-destructive-foreground rounded-full p-0.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* メニュー詳細ダイアログ */}
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
                  | {convertTarget(selectedMenu.targetType as Target)} |{' '}
                  {convertGender(selectedMenu.targetGender as Gender)}
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
                                  src={image.imgPath || ''}
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
                                src={image.thumbnailPath || ''}
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
                  ) : (
                    <div className="flex items-center justify-center w-full aspect-[4/3] sm:aspect-[3/4] bg-muted text-muted-foreground rounded-lg">
                      <Info className="w-8 h-8 mr-2 opacity-30" />
                      <span>画像がありません</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-bold text-muted-foreground">
                      <span className="text-lg text-primary">{selectedMenu.timeToMin} </span>分
                    </p>
                  </div>
                  <div>
                    {selectedMenu.salePrice ? (
                      <div className="flex items-center gap-1">
                        <span className="line-through text-sm text-muted-foreground">
                          ¥{selectedMenu.unitPrice?.toLocaleString()}
                        </span>
                        <span className="font-bold text-active text-lg">
                          ¥{selectedMenu.salePrice.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-lg">
                        ¥{selectedMenu.unitPrice?.toLocaleString()}
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
                    {convertPaymentMethod(selectedMenu.paymentMethod as PaymentMethod)}
                  </p>
                </div>
              </div>
              <DialogFooter className="flex flex-row justify-between items-center">
                <DialogClose asChild>
                  <Button variant="outline">閉じる</Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    handleMenuSelect(selectedMenu)
                    setShowMenuDetails(false)
                  }}
                >
                  {selectedMenuMap[
                    selectedMenu.categories && selectedMenu.categories.length > 0
                      ? selectedMenu.categories[0]
                      : 'その他'
                  ]?._id === selectedMenu._id
                    ? 'メニューを解除'
                    : 'メニューを選択'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* メニュー表示部分（カテゴリ別セクション） */}
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
                <div className="flex flex-col justify-between items-start w-full mb-2">
                  <h3 className="text-lg font-semibold">{category}</h3>
                  {category === 'セットメニュー' ? (
                    <span className="text-xs text-muted-foreground">
                      複数のカテゴリを含むメニューです。選択すると含まれるカテゴリは個別に選択できなくなります。
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      同じカテゴリのメニューは一つまで選択可
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
                      {categoryMenus.map((menu) => {
                        const isBlocked = menuBlocked(menu)
                        const isCurrentlySelected =
                          selectedMenuMap[
                            isSetMenu(menu)
                              ? 'セットメニュー'
                              : menu.categories && menu.categories.length > 0
                                ? menu.categories[0]
                                : 'その他'
                          ]?._id === menu._id

                        return (
                          <Card
                            key={menu._id}
                            className={`transition-all p-2 ${
                              isCurrentlySelected
                                ? 'border-2 border-active shadow-md cursor-pointer'
                                : isBlocked
                                  ? 'opacity-50 border-2 border-transparent'
                                  : 'hover:shadow-md border-2 border-transparent cursor-pointer'
                            }`}
                            onClick={() => !isBlocked && handleMenuSelect(menu)}
                          >
                            <div className="px-2 pt-2 flex justify-between items-center">
                              <div className="flex flex-wrap gap-1 divide-x divide-border text-xs text-muted-foreground text-nowrap">
                                <p className="">{convertTarget(menu.targetType as Target)}</p>
                                <p className="pl-1">{convertGender(menu.targetGender as Gender)}</p>
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
                                      src={menu.images[0].thumbnailPath || ''}
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
                                      {convertPaymentMethod(menu.paymentMethod as PaymentMethod)}
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
                                        {menu.timeToMin}分
                                      </span>
                                    </div>
                                    {menu.salePrice ? (
                                      <div className="flex items-center gap-1">
                                        <span className="line-through text-xs text-muted-foreground">
                                          ¥{menu.unitPrice?.toLocaleString()}
                                        </span>
                                        <span className="font-bold text-active">
                                          ¥{menu.salePrice.toLocaleString()}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="font-medium">
                                        ¥{menu.unitPrice?.toLocaleString()}
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
                    / {menu.timeToMin}分
                  </span>
                  <span className="block text-sm font-bold">{menu.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-active font-bold">
                    {menu.salePrice ? (
                      <div className="flex items-center gap-1">
                        <span className="line-through text-xs text-muted-foreground">
                          ¥{menu.unitPrice?.toLocaleString()}
                        </span>
                        <span className="font-bold text-active">
                          ¥{menu.salePrice.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="font-medium">¥{menu.unitPrice?.toLocaleString()}</span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive-foreground border-destructive-foreground bg-destructive h-8 w-8 p-0"
                    onClick={() => handleMenuSelect(menu)}
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
