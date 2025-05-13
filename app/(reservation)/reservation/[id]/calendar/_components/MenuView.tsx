'use client'

import { useEffect, useState, useMemo } from 'react'
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
import { convertPaymentMethod, MenuCategory } from '@/services/convex/shared/types/common'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, X } from 'lucide-react'
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

interface MenuViewProps {
  salonId: Id<'salon'>
  selectedMenuIds: Id<'menu'>[] | null
  onChangeMenusAction: (menus: Doc<'menu'>[]) => void
}

export const MenuView = ({ salonId, selectedMenuIds, onChangeMenusAction }: MenuViewProps) => {
  // STATES
  const [currentCategory, setCurrentCategory] = useState<MenuCategory | null>(null)
  const [showMenuDetails, setShowMenuDetails] = useState<boolean>(false)
  const [selectedMenu, setSelectedMenu] = useState<Doc<'menu'> | null>(null)
  const [selectedMenuMap, setSelectedMenuMap] = useState<
    Partial<Record<MenuCategory, Doc<'menu'>>>
  >({})
  const [selectedCategories, setSelectedCategories] = useState<MenuCategory[]>([])
  const [showPopover, setShowPopover] = useState<boolean>(false)

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

  // FUNCTIONS
  const extractUniqueCategories = (menus: Doc<'menu'>[]): MenuCategory[] => {
    // Set を使用して重複を排除
    const categorySet = new Set<MenuCategory>()

    // メニューからカテゴリを抽出して Set に追加
    menus.forEach((menu) => {
      if (Array.isArray(menu.categories) && menu.categories.length > 0) {
        menu.categories.forEach((cat) => categorySet.add(cat))
      } else {
        categorySet.add('その他')
      }
    })

    // カテゴリの順序を定義
    const categoryOrder: MenuCategory[] = [
      'カット',
      'カラー',
      'パーマ',
      'トリートメント',
      'エクステ',
      'ヘアセット',
      'ヘッドスパ',
      'フェイスケア',
      'ネイル',
      'ヘアサロン',
      'メイク',
      'その他',
    ]

    // 順序に基づいて並び替え（存在するカテゴリのみ）
    return categoryOrder.filter((category) => categorySet.has(category))
  }

  // カテゴリに基づいてメニューをフィルタリング
  const getMenusByCategory = (category: MenuCategory | null): Doc<'menu'>[] => {
    if (!category || !menus) return []

    if (category === 'その他') {
      // 「その他」カテゴリの場合、カテゴリがないメニューを返す
      return menus.filter((menu) => !menu.categories || menu.categories.length === 0)
    }

    return menus.filter(
      (menu) => Array.isArray(menu.categories) && menu.categories.includes(category)
    )
  }

  // メニュー選択時の処理
  const handleMenuSelect = (menu: Doc<'menu'>) => {
    // カテゴリがない場合は「その他」として扱う
    const menuCategory =
      menu.categories && menu.categories.length > 0 ? menu.categories[0] : 'その他'

    const newSelectedMenuMap = { ...selectedMenuMap }

    // 既に同じメニューが選択されている場合は選択解除
    if (selectedMenuMap[menuCategory]?._id === menu._id) {
      delete newSelectedMenuMap[menuCategory]
    } else {
      // 同じカテゴリの別のメニューが選択された場合は置き換え
      newSelectedMenuMap[menuCategory] = menu
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
      const menuMap: Partial<Record<MenuCategory, Doc<'menu'>>> = {}

      selectedMenuIds.forEach((menuId) => {
        const menu = menus.find((m) => m._id === menuId)
        if (menu) {
          const category =
            menu.categories && menu.categories.length > 0 ? menu.categories[0] : 'その他'
          menuMap[category] = menu
        }
      })

      setSelectedMenuMap(menuMap)
    }
  }, [selectedMenuIds, menus])

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
  const uniqueCategories = useMemo(() => extractUniqueCategories(menus), [menus])

  // カテゴリトグル関数
  const toggleCategory = (category: MenuCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

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
                  onSelect={() => toggleCategory(category)}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className={`${selectedCategories.includes(category) ? 'font-bold' : ''}`}>
                      {category}
                    </span>
                    {selectedCategories.includes(category) && (
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
                {selectedMenu.imgPath && (
                  <div className="relative w-full rounded-md overflow-hidden bg-muted aspect-[9/16]">
                    <Image
                      src={selectedMenu.imgPath}
                      alt={selectedMenu.name || ''}
                      fill
                      className="object-cover"
                      quality={90}
                      priority
                    />
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {selectedMenu.timeToMin}分
                    </span>
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
                    <p className="text-sm mt-1 w-full whitespace-normal break-all bg-muted p-2 tracking-wide leading-5 rounded-md">
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
        {(selectedCategories.length === 0 ? uniqueCategories : selectedCategories).map(
          (category) => (
            <section key={category}>
              <div className="flex flex-col justify-between items-start w-full mb-2">
                <h3 className="text-lg font-semibold">{category}</h3>
                <span className="text-xs text-muted-foreground ">
                  同じカテゴリのメニューは一つまで選択可
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getMenusByCategory(category).map((menu) => (
                  <Card
                    key={menu._id}
                    className={`cursor-pointer transition-all  p-2 ${
                      selectedMenuMap[
                        menu.categories && menu.categories.length > 0
                          ? menu.categories[0]
                          : 'その他'
                      ]?._id === menu._id
                        ? 'border-2 border-active shadow-md'
                        : 'hover:shadow-md border-2 border-transparent'
                    }`}
                    onClick={() => handleMenuSelect(menu)}
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
                        {menu.thumbnailPath ? (
                          <div className="relative h-28 w-20 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                            <Image
                              src={menu.thumbnailPath}
                              alt={menu.name || ''}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : null}

                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-medium text-base">{menu.name}</h3>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs scale-90 -ml-2 text-warning-foreground ">
                              {convertPaymentMethod(menu.paymentMethod as PaymentMethod)}
                            </p>
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
                ))}
              </div>
            </section>
          )
        )}
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
