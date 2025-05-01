

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
} from "@/components/ui/dialog"
import {
  Label
} from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { usePaginatedQuery } from 'convex/react'
import { convertPaymentMethod, MenuCategory } from '@/services/convex/shared/types/common'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Clock } from 'lucide-react'
import { convertGender, convertTarget, Gender, Target, PaymentMethod } from '@/services/convex/shared/types/common'
 
interface MenuViewProps {
  salonId: Id<'salon'>,
  selectedMenuIds: Id<'menu'>[] | null,
  onChangeMenusAction: (menus: Doc<'menu'>[]) => void,
}

export const MenuView = ({ salonId, selectedMenuIds, onChangeMenusAction }: MenuViewProps) => {
  // STATES
  const [currentCategory, setCurrentCategory] = useState<MenuCategory | null>(null)
  const [showMenuDetails, setShowMenuDetails] = useState<boolean>(false);
  const [selectedMenu, setSelectedMenu] = useState<Doc<'menu'> | null>(null)
  // カテゴリごとに1つのメニューを管理するためのマップ
  const [selectedMenuMap, setSelectedMenuMap] = useState<Partial<Record<MenuCategory, Doc<'menu'>>>>({})

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
      if (menu.category) {
        categorySet.add(menu.category)
      } else {
        // カテゴリがない場合は「その他」として追加
        categorySet.add('その他')
      }
    })

    // カテゴリの順序を定義
    const categoryOrder: MenuCategory[] = [
      'カット',
      'カラー',
      'パーマ',
      'ストレートパーマ',
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
      return menus.filter(menu => !menu.category || menu.category === 'その他')
    }
    
    return menus.filter(menu => menu.category === category)
  }

  // カテゴリ変更時の処理
  const handleCategoryChange = (category: MenuCategory) => {
    setCurrentCategory(category)
  }

  // メニュー選択時の処理
  const handleMenuSelect = (menu: Doc<'menu'>) => {
    // カテゴリがない場合は「その他」として扱う
    const menuCategory = menu.category || 'その他'
    
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
    console.log('handleShowMenuDetails が呼ばれました', menu.name); // デバッグ用
    setSelectedMenu(menu);
    setShowMenuDetails(true);
  }

  // 初期メニュー選択の設定
  useEffect(() => {
    if (selectedMenuIds && selectedMenuIds.length > 0 && menus) {
      // IDからメニューオブジェクトを取得
      const menuMap: Partial<Record<MenuCategory, Doc<'menu'>>> = {}
      
      selectedMenuIds.forEach(menuId => {
        const menu = menus.find(m => m._id === menuId)
        if (menu) {
          const category = menu.category || 'その他'
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

  if (isLoading) return <Loading />

  const uniqueCategories = extractUniqueCategories(menus)
  return (
    <div className="w-full">
      {/* カテゴリタブ */}
      <Tabs
        className="flex gap-2"
        defaultValue={currentCategory || undefined}
        value={currentCategory || undefined}
        onValueChange={(value) => handleCategoryChange(value as MenuCategory)}
      >
        <TabsList className="flex flex-col h-full w-1/5  overflow-y-auto overflow-x-hidden  rounded-md overflow-hidden">
          {uniqueCategories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="px-2 py-2 text-xs w-[80px] md:w-full text-wrap"
            >
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* メニュー一覧 */}
        {uniqueCategories.map((category) => (
          <TabsContent
            key={category}
            value={category}
            className="w-4/5 h-full max-h-[360px] md:max-h-[500px] overflow-y-auto"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {getMenusByCategory(category).map((menu) => (
                <Card
                  key={menu._id}
                  className={`cursor-pointer transition-all ${
                    selectedMenuMap[category]?._id === menu._id
                      ? 'border-2 border-blue-500 shadow-md'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleMenuSelect(menu)}
                >
                  <div className="px-2 pt-2 flex justify-between items-center">
                    <div className="flex flex-wrap gap-1 divide-x divide-slate-500 text-xs text-slate-500 text-nowrap">
                      <p className="">{convertTarget(menu.targetType as Target)}</p>
                      <p className="pl-1">{convertGender(menu.targetGender as Gender)}</p>
                    </div>
                    {menu.tags && menu.tags.length > 0 && (
                      <div className="flex justify-end flex-wrap gap-0.5 scale-95">
                        {menu.tags.map((tag, idx) => (
                          <p
                            key={idx}
                            className="text-xs px-1 border border-green-700 text-green-700 rounded-full"
                          >
                            {tag}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2">
                    <div className="flex items-start gap-3">
                      {menu.imgPath ? (
                        <div className="relative h-12 w-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                          <Image
                            src={menu.imgPath}
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
                          <p className="text-xs scale-90 -ml-2 text-yellow-600 ">
                            {convertPaymentMethod(menu.paymentMethod as PaymentMethod)}
                          </p>

                          <Button
                            variant="ghost"
                            className="z-10 text-xs underline text-blue-600"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation() // クリックイベントの伝播を停止
                              // 詳細モーダルを表示する処理を実装
                              handleShowMenuDetails(menu)
                            }}
                          >
                            詳細
                          </Button>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {menu.ensureTimeToMin ?? menu.timeToMin}分
                            </span>
                          </div>
                          {menu.salePrice ? (
                            <div className="flex items-center gap-1">
                              <span className="line-through text-xs text-gray-400">
                                ¥{menu.unitPrice?.toLocaleString()}
                              </span>
                              <span className="font-bold text-green-600">
                                ¥{menu.salePrice.toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="font-medium">¥{menu.unitPrice?.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* 選択済みメニュー表示 */}
      {selectedMenus.length > 0 && (
        <div className="mt-4 border-t pt-2">
          <h3 className="text-xs font-medium mb-2">選択中のメニュー {selectedMenus.length}点</h3>
          <div className="space-y-2">
            {selectedMenus.map((menu) => (
              <div
                key={menu._id}
                className="flex justify-between items-center p-1 bg-slate-50 rounded-md"
              >
                <div>
                  <span className="text-xs text-gray-500">
                    {menu.category || 'その他'} / {menu.ensureTimeToMin ?? menu.timeToMin}分
                  </span>
                  <span className="block text-sm font-bold">{menu.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">
                    ¥{(menu.salePrice || menu.unitPrice)?.toLocaleString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 border bg-red-50 h-8 w-8 p-0"
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

      {/* メニュー詳細ダイアログ */}
      <Dialog
        open={showMenuDetails}
        onOpenChange={(open) => {
          console.log('Dialog onOpenChange:', open) // デバッグ用
          setShowMenuDetails(open)
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          {selectedMenu && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedMenu.name}</DialogTitle>
                <DialogDescription>
                  {selectedMenu.category || 'その他'} |{' '}
                  {convertTarget(selectedMenu.targetType as Target)} |{' '}
                  {convertGender(selectedMenu.targetGender as Gender)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {selectedMenu.imgPath && (
                  <div className="relative h-40 w-full rounded-md overflow-hidden bg-gray-100">
                    <Image
                      src={selectedMenu.imgPath}
                      alt={selectedMenu.name || ''}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {selectedMenu.ensureTimeToMin ?? selectedMenu.timeToMin}分
                    </span>
                  </div>
                  <div>
                    {selectedMenu.salePrice ? (
                      <div className="flex items-center gap-1">
                        <span className="line-through text-sm text-gray-400">
                          ¥{selectedMenu.unitPrice?.toLocaleString()}
                        </span>
                        <span className="font-bold text-blue-600 text-lg">
                          ¥{selectedMenu.salePrice.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="font-medium text-lg">
                        ¥{selectedMenu.unitPrice?.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {selectedMenu.description && (
                  <div className="mt-2">
                    <Label className="text-sm font-medium">説明</Label>
                    <p className="text-sm mt-1">{selectedMenu.description}</p>
                  </div>
                )}

                {selectedMenu.tags && selectedMenu.tags.length > 0 && (
                  <div className="mt-2">
                    <Label className="text-sm font-medium">タグ</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedMenu.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-0.5 bg-green-50 border border-green-700 text-green-700 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-2">
                  <Label className="text-sm font-medium">支払い方法</Label>
                  <p className="text-sm mt-1">
                    {convertPaymentMethod(selectedMenu.paymentMethod as PaymentMethod)}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    handleMenuSelect(selectedMenu)
                    setShowMenuDetails(false)
                  }}
                >
                  {selectedMenuMap[selectedMenu.category || 'その他']?._id === selectedMenu._id
                    ? 'メニューを解除'
                    : 'メニューを選択'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
