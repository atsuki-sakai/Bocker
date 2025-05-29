'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/common'
import { Doc } from '@/convex/_generated/dataModel'
import type { MenuCategory } from '@/convex/shared/types/common'
import { MENU_CATEGORY_VALUES } from '@/convex/shared/types/common'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Pencil,
  Trash2,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Grid,
  List,
  Clock,
  CreditCard,
  Filter,
  X,
  Check,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSalon } from '@/hooks/useSalon'
import { useMutation, useQuery } from 'convex/react'

import { useStablePaginatedQuery } from '@/hooks/useStablePaginatedQuery'
import { api } from '@/convex/_generated/api'
import { toast } from 'sonner'
import { handleErrorToMsg } from '@/lib/error'
import { Id } from '@/convex/_generated/dataModel'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const numberOfMenus = 9

// パフォーマンス最適化のためメモ化したメニューアイテムコンポーネント
interface MenuItemProps {
  menu: Doc<'menu'>
  onEdit: (menuId: Id<'menu'>) => void
  onDelete: (menuId: Id<'menu'>, imgPaths: string[]) => void
}

const MenuItem = ({ menu, onEdit, onDelete }: MenuItemProps) => {
  return (
    <div className="col-span-1">
      <Card className="h-full overflow-hidden hover:shadow-md transition-all">
        <div className="relative h-32 md:h-48 w-full">
          {menu.images && menu.images.length > 0 ? (
            <Image
              src={menu.images[0].thumbnailPath || ''}
              alt={menu.name || ''}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <p className="text-muted-foreground text-base font-bold uppercase">
                {menu.name?.slice(0, 1)}
              </p>
            </div>
          )}
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
            {menu.tags?.map((tag: string, idx: number) => <Badge key={idx}>{tag}</Badge>)}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background backdrop-blur-sm"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">メニューを開く</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href={`/dashboard/menu/${menu._id}`}>
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  <span>詳細</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem onClick={() => onEdit(menu._id)}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>編集</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onDelete(menu._id, menu.images?.map((image) => image.imgPath || '') || [])
                }
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>削除</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardContent className="p-2 md:p-4">
          <div className="flex flex-wrap gap-1">
            {menu.categories &&
              menu.categories.length > 0 &&
              menu.categories.map((category, index) => (
                <p className="text-xs text-muted-foreground mb-1" key={category}>
                  {category} {menu.categories && index === menu.categories.length - 1 ? '' : '・'}
                </p>
              ))}
          </div>
          <h3 className="font-semibold text-base md:text-lg line-clamp-1">{menu.name}</h3>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-sm text-muted-foreground">
                {menu.salePrice ? (
                  <div className="flex items-center gap-2">
                    <span className="line-through text-xs">{menu.unitPrice}円</span>
                    <span className="font-bold text-primary">{menu.salePrice}円</span>
                  </div>
                ) : (
                  <span className="font-medium">{menu.unitPrice}円</span>
                )}
              </div>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <Clock className="h-3 w-3 mr-1" />
                {menu.timeToMin}分
              </div>
            </div>
          </div>

          {menu.paymentMethod && (
            <div className="mt-2 flex items-center text-xs text-muted-foreground">
              <CreditCard className="h-3 w-3 mr-1" />
              {menu.paymentMethod === 'all'
                ? '両方対応'
                : menu.paymentMethod === 'credit_card'
                  ? 'オンライン決済'
                  : '店舗決済'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// メニューリスト表示コンポーネント
interface MenuListContentProps {
  menus: Doc<'menu'>[]
  onDelete: (menuId: Id<'menu'>, imgPaths: string[]) => void
}

const MenuListContent = ({ menus, onDelete }: MenuListContentProps) => {
  const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const listItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -20 },
  }

  return (
    <motion.div
      variants={listContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      <AnimatePresence>
        {menus.map((menu: Doc<'menu'>) => {
          return (
            <motion.div
              key={menu._id}
              variants={listItemVariants}
              exit="exit"
              layoutId={`menu-${menu._id}`}
            >
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4 border-b border-gray-200 pb-4 mb-4">
                {menu.isActive ? (
                  <Badge variant="default" className=" bg-active text-active-foreground">
                    公開中
                  </Badge>
                ) : (
                  <Badge variant="secondary" className=" bg-muted text-muted-foreground">
                    非公開
                  </Badge>
                )}
                <div className="flex items-center gap-2">
                  <div className="relative h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
                    {menu.images && menu.images.length > 0 ? (
                      <Image
                        src={menu.images[0].thumbnailPath || ''}
                        alt={menu.name || ''}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-muted flex items-center justify-center">
                        <p className="text-muted-foreground text-base font-bold uppercase">
                          {menu.name?.slice(0, 1)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 md:pl-2 gap-1">
                    <div className="flex flex-wrap gap-1">
                      {menu.categories &&
                        menu.categories.length > 0 &&
                        menu.categories.map((category, index) => (
                          <p className="text-xs text-muted-foreground mb-1" key={category}>
                            {category}{' '}
                            {menu.categories && index === menu.categories.length - 1 ? '' : '・'}
                          </p>
                        ))}
                    </div>
                    <h3 className="font-medium text-base md:text-lg truncate">{menu.name}</h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        {menu.salePrice ? (
                          <div className="flex items-center gap-2">
                            <span className="line-through text-xs">{menu.unitPrice}円</span>
                            <span className="font-medium text-primary">{menu.salePrice}円</span>
                          </div>
                        ) : (
                          <span>{menu.unitPrice}円</span>
                        )}
                      </div>

                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {menu.timeToMin}分{' '}
                      </div>

                      {menu.paymentMethod && (
                        <div className="flex items-center">
                          <CreditCard className="h-3 w-3 mr-1" />
                          {menu.paymentMethod === 'all'
                            ? '両方対応'
                            : menu.paymentMethod === 'credit_card'
                              ? 'オンライン決済'
                              : '店舗決済'}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {menu.tags?.map((tag: string, idx: number) => (
                          <Badge key={idx} className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-centersm:mt-0 absolute right-0 top-0 md:top-1/4">
                  <Link href={`/dashboard/menu/${menu._id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">詳細</span>
                    </Button>
                  </Link>
                  <Link href={`/dashboard/menu/${menu._id}/edit`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">編集</span>
                    </Button>
                  </Link>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                    onClick={() =>
                      onDelete(menu._id, menu.images?.map((image) => image.imgPath || '') || [])
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">削除</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </motion.div>
  )
}

// メインコンポーネント
export default function MenuList() {
  const { salon } = useSalon()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [deletingMenuId, setDeletingMenuId] = useState<Id<'menu'> | null>(null)
  const [deletingImgPaths, setDeletingImgPaths] = useState<string[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false)
  const [selectedCategories, setSelectedCategories] = useState<MenuCategory[]>([])
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false)

  // APIリクエスト用フック
  const killMenu = useMutation(api.menu.core.mutation.kill)

  // カテゴリで絞り込むクエリと全てのメニューを取得するクエリ
  const filteredMenus = useQuery(
    api.menu.core.query.getMenusByCategories,
    salon?._id && selectedCategories.length > 0
      ? { salonId: salon._id, categories: selectedCategories }
      : 'skip'
  )

  // カテゴリ選択がない場合は全てのメニューを取得
  const {
    results: allMenus,
    isLoading,
    loadMore,
    status,
  } = useStablePaginatedQuery(
    api.menu.core.query.listBySalonId,
    salon?._id ? { salonId: salon._id } : 'skip',
    {
      initialNumItems: numberOfMenus,
    }
  )

  // 表示するメニューの決定
  const menusToDisplay = selectedCategories.length > 0 ? filteredMenus : allMenus

  // すべてのカテゴリをMENU_CATEGORY_VALUESから取得
  const allCategories = MENU_CATEGORY_VALUES

  // カテゴリの選択/解除
  const toggleCategory = useCallback((category: MenuCategory) => {
    setSelectedCategories((prev) => {
      // すでに選択されている場合は削除
      if (prev.includes(category)) {
        return prev.filter((cat) => cat !== category)
      }
      // 選択されていない場合は追加
      else {
        return [...prev, category]
      }
    })
  }, [])

  // 特定のカテゴリを削除
  const removeCategory = useCallback((category: MenuCategory) => {
    setSelectedCategories((prev) => prev.filter((cat) => cat !== category))
  }, [])

  // すべてのカテゴリ選択をクリア
  const clearCategoryFilter = useCallback(() => {
    setSelectedCategories([])
  }, [])

  // コールバック関数のメモ化
  const handleDeleteMenu = useCallback(async () => {
    if (!deletingMenuId) return

    try {
      if (deletingImgPaths.length === 0) {
        toast.error('メニュー画像がありません')
        // 画像がない場合はメニューの削除のみ実行する場合もあるので、returnはコメントアウトまたは削除検討
        // return
      }
      await killMenu({ menuId: deletingMenuId })

      // 画像を一括削除
      if (deletingImgPaths.length > 0) {
        try {
          const response = await fetch('/api/storage', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imgUrls: deletingImgPaths, withThumbnail: true }),
          })

          const result = await response.json()

          if (!response.ok) {
            // APIがエラーを返した場合 (207 Multi-Status もエラーとして扱うか検討)
            // ここでは、response.ok でない場合は全てエラーとしてトースト表示する
            const errorMessage =
              result.error || result.message || '画像の一括削除中にエラーが発生しました。'
            toast.error(errorMessage)
            if (result.details) {
              console.error('画像削除失敗詳細:', result.details)
            }
            // 必要に応じて、一部成功・一部失敗のシナリオをより詳細にハンドリング
            if (
              response.status === 207 &&
              result.failedDeletes &&
              result.failedDeletes.length > 0
            ) {
              toast.warning(`${result.failedDeletes.length}件の画像の削除に失敗しました。`)
              result.failedDeletes.forEach((fail: { url: string; error: string }) => {
                console.error(` - ${fail.url}: ${fail.error}`)
              })
            }
          } else {
            // response.ok === true (通常は200 OK)
            if (result.message) {
              toast.success(result.message) // 例: "3件の画像を削除しました。"
            }
          }
        } catch (e) {
          // ネットワークエラーやJSONパースエラーなど
          console.error('画像一括削除リクエストエラー:', e)
          toast.error('画像削除リクエストの送信に失敗しました。')
        }
      }

      toast.success('メニューを削除しました') // メニュー自体の削除成功メッセージ
      setIsDeleteDialogOpen(false)
    } catch (error) {
      toast.error(handleErrorToMsg(error))
    }
  }, [deletingMenuId, deletingImgPaths, killMenu])

  const openDeleteDialog = useCallback((menuId: Id<'menu'>, imgPaths: string[]) => {
    setDeletingMenuId(menuId)
    setDeletingImgPaths(imgPaths)
    setIsDeleteDialogOpen(true)
  }, [])

  const navigateToEdit = useCallback((menuId: Id<'menu'>) => {
    window.location.href = `/dashboard/menu/${menuId}/edit`
  }, [])

  // スケルトンローダーコンポーネント
  const renderSkeletons = useCallback(() => {
    if (viewMode === 'grid') {
      return Array(6)
        .fill(0)
        .map((_, idx) => (
          <div key={idx} className="col-span-1">
            <Card className="h-full">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-5 w-3/4 mt-1" />
                <div className="mt-3 flex justify-between">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-6 w-1/4 rounded-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        ))
    }

    return Array(3)
      .fill(0)
      .map((_, idx) => (
        <Card key={idx} className="w-full mb-2">
          <div className="p-4 flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-5 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </Card>
      ))
  }, [viewMode])

  // メニューリストのレンダリング
  const renderMenus = () => {
    if (!menusToDisplay || menusToDisplay.length === 0) {
      return (
        <Card className="col-span-full p-10 text-center bg-muted">
          <p className="text-muted-foreground">
            {selectedCategories.length > 0
              ? '選択されたカテゴリに該当するメニューがありません'
              : 'メニューがありません'}
          </p>
        </Card>
      )
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <AnimatePresence>
            {menusToDisplay.map((menu: Doc<'menu'>) => (
              <MenuItem
                key={menu._id}
                menu={menu}
                onEdit={navigateToEdit}
                onDelete={openDeleteDialog}
              />
            ))}
          </AnimatePresence>
        </div>
      )
    }

    return <MenuListContent menus={menusToDisplay} onDelete={openDeleteDialog} />
  }

  // ロード中かどうかを判定
  const isLoadingData = isLoading || (selectedCategories.length > 0 && filteredMenus === undefined)

  // メインレンダリング
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full flex flex-col gap-6"
    >
      <div className="flex items-start sm:items-center justify-between gap-4">
        {/* カテゴリフィルター - Commandコンポーネント使用 */}
        <div className="flex flex-col w-full sm:w-auto gap-2">
          <div className="flex items-center gap-1">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">カテゴリで絞り込む</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Popover open={openCategoryPopover} onOpenChange={setOpenCategoryPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant={'secondary'}
                  size="sm"
                  className=" border-dashed flex justify-between"
                >
                  <span className="text-sm">
                    {selectedCategories.length > 0
                      ? `${selectedCategories.length}件選択中`
                      : 'カテゴリを選択'}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-56" align="start">
                <Command>
                  <div className="flex items-center gap-2">
                    <CommandInput
                      placeholder="カテゴリを検索..."
                      className="h-9"
                      // キーボードが自動で開かないようにする
                      autoFocus={false}
                      inputMode="none"
                    />
                    <Button
                      onClick={() => setOpenCategoryPopover(false)}
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <CommandList>
                    <CommandEmpty>カテゴリが見つかりません</CommandEmpty>
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
                クリア
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

        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium">表示形式</span>
          <div className="bg-muted rounded-md p-1 flex items-center">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
              <span className="sr-only">グリッド表示</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
              <span className="sr-only">リスト表示</span>
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
          allMenus.length >= numberOfMenus &&
          status === 'CanLoadMore' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex justify-center"
            >
              <Button
                onClick={() => loadMore(numberOfMenus)}
                variant="outline"
                className="gap-2"
                disabled={isLoading}
              >
                もっと見る
                <ChevronDown className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
      </div>

      <Dialog
        title="メニューの削除"
        description="このメニューを削除してもよろしいですか？この操作は元に戻せません。"
        confirmTitle="削除する"
        cancelTitle="キャンセル"
        onConfirmAction={handleDeleteMenu}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </motion.div>
  )
}
