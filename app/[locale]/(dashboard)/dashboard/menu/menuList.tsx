'use client'

import { useState, useCallback, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { ChevronDown, X, Grid, List, Check } from 'lucide-react'
import { Doc, Id } from '@/convex/_generated/dataModel'
import type { MenuCategory } from '@/convex/types'
import { MENU_CATEGORY_VALUES } from '@/convex/types'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'

// 性別とタイプの定義を追加
type TargetGender = 'male' | 'female' | 'unselected'
type TargetType = 'all' | 'first_time' | 'repeat'

export const MenuList = memo(() => {
  const { tenantId, orgId } = useTenantAndOrganization()
  const t = useTranslations('menu')
  const tCommon = useTranslations('common')
  const [selectedCategories, setSelectedCategories] = useState<MenuCategory[]>([])
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false)
  // 性別とタイプの絞り込み状態を追加
  const [selectedGender, setSelectedGender] = useState<TargetGender | null>(null)
  const [selectedType, setSelectedType] = useState<TargetType | null>(null)
  const [openGenderPopover, setOpenGenderPopover] = useState(false)
  const [openTypePopover, setOpenTypePopover] = useState(false)

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  // === 1. すべてのメニュー取得 ===
  const allMenusQuery = useQuery(
    api.menu.query.listByTenantAndOrg,
    tenantId && orgId
      ? {
          tenant_id: tenantId as Id<'tenant'>,
          org_id: orgId as Id<'organization'>,
          paginationOpts: { numItems: 100, cursor: null },
          sort: 'desc',
          activeOnly: true,
          includeArchive: false,
        }
      : 'skip'
  )

  // ページネーション関連（今回は先頭 100 件のみ）
  const allMenus: Doc<'menu'>[] = useMemo(() => allMenusQuery?.page || [], [allMenusQuery])
  const status: 'CanLoadMore' | 'Exhausted' = allMenusQuery?.isDone ? 'Exhausted' : 'CanLoadMore'
  const loadMore = () => {
    // 今後の拡張用: 追加読み込みが必要な場合に実装
  }
  const numberOfMenus = allMenus.length

  // 表示するメニューの決定 - 複数フィルターを考慮
  const menusToDisplay = useMemo(() => {
    // ベースは全メニュー（100件取得）
    const baseMenus: Doc<'menu'>[] = allMenus

    return baseMenus.filter((menu) => {
      // カテゴリフィルター
      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategories.some((category) => menu.categories.includes(category))

      // 性別フィルター
      const genderMatch = !selectedGender || menu.target_gender === selectedGender

      // タイプフィルター
      const typeMatch = !selectedType || menu.target_type === selectedType

      return categoryMatch && genderMatch && typeMatch
    })
  }, [selectedCategories, selectedGender, selectedType, allMenus])

  const isLoadingData = !allMenusQuery

  const allCategories = MENU_CATEGORY_VALUES

  // カテゴリの選択/解除
  const toggleCategory = useCallback((category: MenuCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }, [])

  // 特定のカテゴリを削除
  const removeCategory = useCallback((category: MenuCategory) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== category))
  }, [])

  // すべてのカテゴリ選択をクリア
  const clearCategoryFilter = useCallback(() => {
    setSelectedCategories([])
  }, [])

  // 性別とタイプのフィルター関数
  const toggleGender = useCallback((gender: TargetGender) => {
    setSelectedGender((prev) => (prev === gender ? null : gender))
  }, [])

  const toggleType = useCallback((type: TargetType) => {
    setSelectedType((prev) => (prev === type ? null : type))
  }, [])

  // すべてのフィルターをクリア
  const clearAllFilters = useCallback(() => {
    setSelectedCategories([])
    setSelectedGender(null)
    setSelectedType(null)
  }, [])

  // スケルトンの表示
  const renderSkeletons = useCallback(() => {
    return Array.from({ length: 6 }).map((_, index) => (
      <Skeleton key={index} className="h-40 w-full" />
    ))
  }, [])

  // メニューの表示
  const renderMenus = useCallback(() => {
    if (!menusToDisplay || menusToDisplay.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('messages.noMenus')}</p>
        </div>
      )
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menusToDisplay.map((menu: Doc<'menu'>) => (
            <div key={menu._id} className="p-4 border rounded-lg">
              <h3 className="font-semibold">{menu.name}</h3>
              <p className="text-sm text-muted-foreground">¥{menu.unit_price}</p>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {menusToDisplay.map((menu: Doc<'menu'>) => (
          <div key={menu._id} className="p-4 border rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{menu.name}</h3>
              <p className="text-sm text-muted-foreground">¥{menu.unit_price}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }, [menusToDisplay, viewMode, t])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* カテゴリフィルター */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium">{t('messages.filterByCategory')}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Popover open={openCategoryPopover} onOpenChange={setOpenCategoryPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'secondary'}
                      size="sm"
                      className="border-dashed flex justify-between"
                    >
                      <span className="text-sm">{t('messages.selectCategory')}</span>
                      <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="relative p-0 w-56" align="start">
                    <div className="absolute top-0 right-0 flex items-center justify-end gap-2 p-2 z-10">
                      <Button
                        onClick={() => setOpenCategoryPopover(false)}
                        variant="outline"
                        size="icon"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Command>
                      <CommandList>
                        <CommandEmpty>{t('messages.categoryNotFound')}</CommandEmpty>
                        <CommandGroup>
                          {allCategories.map((category) => (
                            <CommandItem
                              key={category}
                              value={category}
                              onSelect={() => {
                                toggleCategory(category)
                                // 選択してもポップオーバーを閉じない
                              }}
                            >
                              {selectedCategories.includes(category) && (
                                <Check className="h-4 w-4 mr-2 text-primary" />
                              )}
                              <span>{category}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedCategories.length > 0 && (
                  <Button size="sm" className="h-9 px-2" onClick={clearCategoryFilter}>
                    <X className="h-4 w-4 mr-1" />
                    {tCommon('delete')}
                  </Button>
                )}
              </div>
              {/* 選択されたカテゴリの表示 */}
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedCategories.map((category) => (
                    <Badge
                      key={category}
                      variant="secondary"
                      className="px-2 py-1 flex items-center gap-1"
                    >
                      {category}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
                        onClick={() => removeCategory(category)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {/* 性別フィルター */}
            <div>
              <div className="flex items-center gap-1 mt-4">
                <span className="text-xs font-medium">性別で絞り込み</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Popover open={openGenderPopover} onOpenChange={setOpenGenderPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'secondary'}
                      size="sm"
                      className="border-dashed flex justify-between"
                    >
                      <span className="text-sm">
                        {selectedGender
                          ? selectedGender === 'male'
                            ? '男性'
                            : selectedGender === 'female'
                              ? '女性'
                              : '指定なし'
                          : '性別を選択'}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="relative p-0 w-40" align="start">
                    <div className="absolute top-0 right-0 flex items-center justify-end gap-2 p-2 z-10">
                      <Button
                        onClick={() => setOpenGenderPopover(false)}
                        variant="outline"
                        size="icon"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {(['male', 'female', 'unselected'] as TargetGender[]).map((gender) => (
                            <CommandItem
                              key={gender}
                              value={gender}
                              onSelect={() => {
                                toggleGender(gender)
                                setOpenGenderPopover(false)
                              }}
                            >
                              {selectedGender === gender && (
                                <Check className="h-4 w-4 mr-2 text-primary" />
                              )}
                              <span>
                                {gender === 'male'
                                  ? '男性'
                                  : gender === 'female'
                                    ? '女性'
                                    : '指定なし'}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedGender && (
                  <Button size="sm" className="h-9 px-2" onClick={() => setSelectedGender(null)}>
                    <X className="h-4 w-4 mr-1" />
                    クリア
                  </Button>
                )}
              </div>
            </div>

            <div>
              {/* タイプフィルター */}
              <div className="flex items-center gap-1 mt-4">
                <span className="text-xs font-medium">タイプで絞り込み</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Popover open={openTypePopover} onOpenChange={setOpenTypePopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'secondary'}
                      size="sm"
                      className="border-dashed flex justify-between"
                    >
                      <span className="text-sm">
                        {selectedType
                          ? selectedType === 'all'
                            ? '全て'
                            : selectedType === 'first_time'
                              ? '初回'
                              : 'リピーター'
                          : 'タイプを選択'}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="relative p-0 w-40" align="start">
                    <div className="absolute top-0 right-0 flex items-center justify-end gap-2 p-2 z-10">
                      <Button
                        onClick={() => setOpenTypePopover(false)}
                        variant="outline"
                        size="icon"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {(['all', 'first_time', 'repeat'] as TargetType[]).map((type) => (
                            <CommandItem
                              key={type}
                              value={type}
                              onSelect={() => {
                                toggleType(type)
                                setOpenTypePopover(false)
                              }}
                            >
                              {selectedType === type && (
                                <Check className="h-4 w-4 mr-2 text-primary" />
                              )}
                              <span>
                                {type === 'all'
                                  ? '全て'
                                  : type === 'first_time'
                                    ? '初回'
                                    : 'リピーター'}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedType && (
                  <Button size="sm" className="h-9 px-2" onClick={() => setSelectedType(null)}>
                    <X className="h-4 w-4 mr-1" />
                    クリア
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 全フィルタークリアボタン */}
          {(selectedCategories.length > 0 || selectedGender || selectedType) && (
            <div className="mt-4">
              <Button size="sm" variant="outline" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                全てクリア
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium">{t('messages.viewMode')}</span>
          <div className="bg-muted rounded-md p-1 flex items-center">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
              <span className="sr-only">{t('messages.gridView')}</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
              <span className="sr-only">{t('messages.listView')}</span>
            </Button>
          </div>
        </div>
      </div>

      <div>
        {' '}
        {isLoadingData ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderSkeletons()}
            </div>
          ) : (
            <div className="space-y-2">{renderSkeletons()}</div>
          )
        ) : (
          renderMenus()
        )}
        {allMenus &&
          !selectedCategories.length &&
          !selectedGender &&
          !selectedType &&
          allMenus.length >= numberOfMenus &&
          status === 'CanLoadMore' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex justify-center"
            >
              <Button onClick={loadMore} variant="outline" className="w-full sm:w-auto">
                {t('messages.loadMore')}
              </Button>
            </motion.div>
          )}
      </div>
    </div>
  )
})

MenuList.displayName = 'MenuList'