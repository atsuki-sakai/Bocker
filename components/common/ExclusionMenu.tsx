'use client';

import { useState, useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Menu, Search, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { useStablePaginatedQuery } from '@/hooks/useStablePaginatedQuery';
import { api } from '@/convex/_generated/api';
import { useSalon } from '@/hooks/useSalon';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

const numberOfMenus = 10;

interface ExclusionMenuProps {
  title?: string;
  selectedMenuIds: Id<'menu'>[];
  setSelectedMenuIdsAction: (menuIds: Id<'menu'>[]) => void;
}

export default function ExclusionMenu({
  title,
  selectedMenuIds,
  setSelectedMenuIdsAction,
}: ExclusionMenuProps) {
  const { salon } = useSalon();
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelectedIds, setLocalSelectedIds] = useState<Id<'menu'>[]>(selectedMenuIds);

  const {
    results: menus,
    loadMore,
    status,
  } = useStablePaginatedQuery(
    api.menu.core.query.listBySalonId,
    salon ? { salonId: salon._id as Id<'salon'> } : 'skip',
    { initialNumItems: numberOfMenus }
  );

  useEffect(() => {
    setLocalSelectedIds(selectedMenuIds);
  }, [selectedMenuIds]);

  const updateSelectedIds = (newIds: Id<'menu'>[]) => {
    setLocalSelectedIds(newIds);
    setSelectedMenuIdsAction(newIds);
  };

  function handleToggleMenu(menuId: Id<'menu'>) {
    const isCurrentlySelected = localSelectedIds.includes(menuId);
    const newSelectedIds = isCurrentlySelected
      ? localSelectedIds.filter((id) => id !== menuId)
      : [...localSelectedIds, menuId];
    console.log('トグル:', {
      menuId,
      isCurrentlySelected,
      beforeIds: localSelectedIds,
      afterIds: newSelectedIds,
    });
    updateSelectedIds(newSelectedIds);
  }

  function handleToggleAll() {
    if (!filteredMenus || filteredMenus.length === 0) return;
    const visibleMenuIds = filteredMenus.map((m) => m._id);
    const allVisibleSelected = visibleMenuIds.every((id) => localSelectedIds.includes(id));
    let newSelectedIds: Id<'menu'>[];
    if (allVisibleSelected) {
      newSelectedIds = localSelectedIds.filter((id) => !visibleMenuIds.includes(id));
    } else {
      newSelectedIds = Array.from(new Set([...localSelectedIds, ...visibleMenuIds]));
    }
    console.log('全選択/全解除:', {
      allVisibleSelected,
      visibleMenuIds,
      beforeIds: localSelectedIds,
      afterIds: newSelectedIds,
    });
    updateSelectedIds(newSelectedIds);
  }

  const filteredMenus = useMemo(() => {
    if (!menus) return [];
    if (!searchTerm.trim()) return menus;

    return menus.filter(
      (menu: Doc<'menu'>) =>
        (menu.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (menu.unitPrice?.toString() || '').includes(searchTerm)
    );
  }, [menus, searchTerm]);

  const selectedMenusCount = localSelectedIds.length;
  // 表示中のメニュー数に応じて全選択状態を判断する
  const totalMenusCount = filteredMenus.length;
  const selectionText =
    selectedMenusCount === 0
      ? '選択なし'
      : selectedMenusCount === totalMenusCount
        ? 'すべて選択'
        : `${selectedMenusCount}件選択`;

  const allVisibleSelected =
    filteredMenus.length > 0 && filteredMenus.every((menu) => localSelectedIds.includes(menu._id));

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-gray-700 font-medium">
              <Menu size={16} />
              {title ?? '除外するメニュー'}
            </Label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-500">{selectionText}</span>
              <Button size="sm" onClick={handleToggleAll} className="text-xs h-8" type="button">
                {totalMenusCount > 0 && allVisibleSelected ? (
                  <span className="flex items-center gap-1">
                    <Minus size={14} />
                    全て解除
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Plus size={14} />
                    全て選択
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* 検索フィールド */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="メニューを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              type="text"
            />
          </div>

          {/* メニューリスト */}
          <ScrollArea className="max-h-[80vh] rounded-md border p-2">
            <div className="space-y-1">
              {filteredMenus.map((menu: Doc<'menu'>) => (
                <div
                  key={menu._id}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100"
                >
                  <Checkbox
                    id={menu._id}
                    checked={localSelectedIds.includes(menu._id)}
                    onCheckedChange={() => handleToggleMenu(menu._id)}
                    className="data-[state=checked]:bg-primary"
                  />
                  <label
                    htmlFor={menu._id}
                    className="flex flex-1 justify-between items-center cursor-pointer text-sm py-1"
                  >
                    <span className="font-medium">{menu.name}</span>
                    <span className="text-gray-500">¥{menu.unitPrice?.toLocaleString()}</span>
                  </label>
                </div>
              ))}
              {filteredMenus.length === 0 && (
                <div className="text-center py-4 text-gray-500">該当するメニューがありません</div>
              )}
              {menus && menus.length >= numberOfMenus && status === 'CanLoadMore' && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadMore(numberOfMenus)}
                    type="button"
                  >
                    さらに読み込む
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
