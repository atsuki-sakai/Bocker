'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog } from '@/components/common';
import { Doc } from '@/convex/_generated/dataModel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSalon } from '@/hooks/useSalon';
import { useMutation, useAction } from 'convex/react';

import { useStablePaginatedQuery } from '@/hooks/useStablePaginatedQuery';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { handleError } from '@/lib/errors';
import { Id } from '@/convex/_generated/dataModel';

// メニューの型定義
interface Menu {
  _id: Id<'menu'>;
  salonId: Id<'salon'>;
  name?: string;
  price?: number;
  salePrice?: number;
  timeToMin?: string;
  imgPath?: string;
  description?: string;
  targetGender?: string;
  targetType?: string;
  tags?: string[];
  paymentMethod?: string;
  isActive?: boolean;
}

// スタッフの型定義
interface Staff {
  salonId: string;
  menuId: string;
  staffId: string;
  staffName?: string;
}

// 元のデータ構造を維持
const availableStaffs: Staff[] = [
  {
    salonId: '1',
    menuId: '1',
    staffId: '1',
    staffName: 'スタッフ1',
  },
  {
    salonId: '1',
    menuId: '2',
    staffId: '2',
    staffName: 'スタッフ2',
  },
  {
    salonId: '1',
    menuId: '1',
    staffId: '3',
    staffName: 'スタッフ3',
  },
  {
    salonId: '1',
    menuId: '2',
    staffId: '2',
    staffName: 'スタッフ2',
  },
  {
    salonId: '1',
    menuId: '1',
    staffId: '3',
    staffName: 'スタッフ3',
  },
  {
    salonId: '1',
    menuId: '2',
    staffId: '2',
    staffName: 'スタッフ2',
  },
  {
    salonId: '1',
    menuId: '1',
    staffId: '3',
    staffName: 'スタッフ3',
  },
  {
    salonId: '1',
    menuId: '2',
    staffId: '2',
    staffName: 'スタッフ2',
  },
  {
    salonId: '1',
    menuId: '1',
    staffId: '3',
    staffName: 'スタッフ3',
  },
];

const numberOfMenus = 10;

// パフォーマンス最適化のためメモ化したメニューアイテムコンポーネント
interface MenuItemProps {
  menu: Menu;
  onEdit: (menuId: Id<'menu'>) => void;
  onDelete: (menuId: Id<'menu'>, imgPath: string) => void;
  staffs: Staff[];
}

const MenuItem = ({ menu, onEdit, onDelete, staffs }: MenuItemProps) => {
  // 対象メニューに関連するスタッフをフィルタリング
  const menuStaffs = useMemo(() => {
    return staffs.filter((staff: Staff) => staff.menuId === menu._id);
  }, [staffs, menu._id]);

  console.log('menu', menu.imgPath);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="col-span-1"
    >
      <Card className="h-full overflow-hidden hover:shadow-md transition-all">
        <div className="relative h-48 w-full">
          {menu.imgPath ? (
            <Image src={menu.imgPath} alt={menu.name || ''} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <p className="text-gray-500 text-base font-bold uppercase">
                {menu.name?.slice(0, 1)}
              </p>
            </div>
          )}
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
            {menu.tags?.map((tag: string, idx: number) => (
              <Badge key={idx} variant="secondary" className="bg-blue-600 text-white">
                {tag}
              </Badge>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"
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
                onClick={() => onDelete(menu._id, menu.imgPath || '')}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>削除</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg line-clamp-1">{menu.name}</h3>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-sm text-muted-foreground">
                {menu.salePrice ? (
                  <div className="flex items-center gap-2">
                    <span className="line-through text-xs">{menu.price}円</span>
                    <span className="font-bold text-primary">{menu.salePrice}円</span>
                  </div>
                ) : (
                  <span className="font-medium">{menu.price}円</span>
                )}
              </div>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <Clock className="h-3 w-3 mr-1" />
                {menu.timeToMin}分
              </div>
            </div>

            <div className="flex -space-x-2">
              {menuStaffs.slice(0, 3).map((staff: Staff, idx: number) => (
                <Avatar key={idx} className="h-7 w-7 border-2 border-background">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {staff.staffName?.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {menuStaffs.length > 3 && (
                <Avatar className="h-7 w-7 border-2 border-background">
                  <AvatarFallback className="text-xs bg-muted">
                    +{menuStaffs.length - 3}
                  </AvatarFallback>
                </Avatar>
              )}
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
    </motion.div>
  );
};

// メニューリスト表示コンポーネント
interface MenuListContentProps {
  menus: Menu[];
  staffs: Staff[];
  onDelete: (menuId: Id<'menu'>, imgPath: string) => void;
}

const MenuListContent = ({ menus, staffs, onDelete }: MenuListContentProps) => {
  const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const listItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <motion.div
      variants={listContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      <AnimatePresence>
        {menus.map((menu: Menu) => {
          const menuStaffs = staffs.filter((staff: Staff) => staff.menuId === menu._id);

          return (
            <motion.div
              key={menu._id}
              variants={listItemVariants}
              exit="exit"
              layoutId={`menu-${menu._id}`}
            >
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {menu.isActive ? (
                    <Badge variant="default" className="mb-2">
                      公開中
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="mb-2">
                      非公開
                    </Badge>
                  )}
                  <div className="relative h-16 w-24 rounded-md overflow-hidden flex-shrink-0">
                    {menu.imgPath ? (
                      <Image
                        src={menu.imgPath}
                        alt={menu.name || ''}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                        <p className="text-gray-500 text-base font-bold uppercase">
                          {menu.name?.slice(0, 1)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-lg truncate">{menu.name}</h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        {menu.salePrice ? (
                          <div className="flex items-center gap-2">
                            <span className="line-through text-xs">{menu.price}円</span>
                            <span className="font-medium text-primary">{menu.salePrice}円</span>
                          </div>
                        ) : (
                          <span>{menu.price}円</span>
                        )}
                      </div>

                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {menu.timeToMin}分
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
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {menu.tags?.map((tag: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs bg-blue-600 text-white"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center mt-2 sm:mt-0">
                    <div className="flex -space-x-2 mr-4">
                      {menuStaffs.slice(0, 3).map((staff: Staff, idx: number) => (
                        <Avatar key={idx} className="h-7 w-7 border-2 border-background">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {staff.staffName?.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {menuStaffs.length > 3 && (
                        <Avatar className="h-7 w-7 border-2 border-background">
                          <AvatarFallback className="text-xs bg-muted">
                            +{menuStaffs.length - 3}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>

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
                      onClick={() => onDelete(menu._id, menu.imgPath || '')}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">削除</span>
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};

// メインコンポーネント
export default function MenuList() {
  const { salon } = useSalon();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [deletingMenuId, setDeletingMenuId] = useState<Id<'menu'> | null>(null);
  const [deletingImgPath, setDeletingImgPath] = useState<string>('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  // APIリクエスト用フック
  const killMenu = useMutation(api.menu.core.kill);
  const deleteMenuImage = useAction(api.storage.core.deleteImage);
  const {
    results: menus,
    isLoading,
    loadMore,
    status,
  } = useStablePaginatedQuery(
    api.menu.core.getAllBySalonId,
    salon?._id ? { salonId: salon._id } : 'skip',
    {
      initialNumItems: numberOfMenus,
    }
  );

  // コールバック関数のメモ化
  const handleDeleteMenu = useCallback(async () => {
    if (!deletingMenuId) return;

    try {
      if (deletingImgPath === '') {
        toast.error('メニュー画像がありません');
        return;
      }
      await killMenu({ menuId: deletingMenuId });
      await deleteMenuImage({ imgUrl: deletingImgPath });
      toast.success('メニューを削除しました');
      setIsDeleteDialogOpen(false);
    } catch (error) {
      const errorDetails = handleError(error);
      toast.error(errorDetails.message);
    }
  }, [deletingMenuId, deletingImgPath, killMenu, deleteMenuImage]);

  const openDeleteDialog = useCallback((menuId: Id<'menu'>, imgPath: string) => {
    setDeletingMenuId(menuId);
    setDeletingImgPath(imgPath);
    setIsDeleteDialogOpen(true);
  }, []);

  const navigateToEdit = useCallback((menuId: Id<'menu'>) => {
    window.location.href = `/dashboard/menu/${menuId}/edit`;
  }, []);

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
        ));
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
      ));
  }, [viewMode]);

  // メニューリストのレンダリング
  const renderMenus = () => {
    if (!menus || menus.length === 0) {
      return (
        <Card className="col-span-full p-10 text-center">
          <p className="text-muted-foreground">メニューがありません</p>
        </Card>
      );
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {menus.map((menu: Doc<'menu'>) => (
              <MenuItem
                key={menu._id}
                menu={menu}
                staffs={availableStaffs}
                onEdit={navigateToEdit}
                onDelete={openDeleteDialog}
              />
            ))}
          </AnimatePresence>
        </div>
      );
    }

    return <MenuListContent menus={menus} staffs={availableStaffs} onDelete={openDeleteDialog} />;
  };

  // メインレンダリング
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full flex flex-col gap-6"
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">メニュー管理</CardTitle>
              <CardDescription>サロンのメニューを管理・編集できます</CardDescription>
            </div>

            <div className="flex items-center gap-2">
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
        </CardHeader>

        <CardContent>
          {isLoading ? (
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

          {menus && menus.length >= numberOfMenus && status === 'CanLoadMore' && (
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
        </CardContent>
      </Card>

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
  );
}
