'use client';

import { api } from '@/convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { useSalon } from '@/hooks/useSalon';
import {
  Mail,
  Phone,
  Calendar,
  ChevronDown,
  Search,
  RefreshCw,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useCallback, useEffect } from 'react';

// 1回のロードでより多くのアイテムを表示
const numberOfItems: number = 20;

export default function CustomerList() {
  const salon = useSalon();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  // 検索用語のデバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    results: customers,
    isLoading,
    loadMore,
    status,
  } = usePaginatedQuery(
    api.customer.core.query.listBySalonId,
    salon?.salonId
      ? {
          salonId: salon.salonId,
          searchTerm: debouncedSearchTerm,
          includeArchive: false,
          sort: 'desc',
        }
      : 'skip',
    {
      initialNumItems: numberOfItems,
    }
  );

  // フロントエンドでのフィルタリング（一時的な対応策）
  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase().trim();
    const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();

    return (
      fullName.includes(searchLower) ||
      (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
      (customer.phone && customer.phone.includes(searchLower)) ||
      (customer.lineUserName && customer.lineUserName.toLowerCase().includes(searchLower))
    );
  });

  // 予約日の書式変換
  const formatDate = useCallback((timestamp: number | null | undefined): string => {
    if (!timestamp) return '未予約';
    return new Date(timestamp * 1000).toLocaleDateString('ja-JP');
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="顧客を検索..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">顧客名</TableHead>
              <TableHead>LINE</TableHead>
              <TableHead>連絡先</TableHead>
              <TableHead className="w-[100px] text-center">来店回数</TableHead>
              <TableHead className="w-[150px]">最終来店日</TableHead>
              <TableHead>タグ</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {searchTerm ? '検索条件に一致する顧客が見つかりません' : '顧客データがありません'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer._id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {customer.firstName} {customer.lastName}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.lineUserName ? (
                      <div className="flex items-center gap-2">
                        <span>{customer.lineUserName}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">未設定</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone size={14} className="text-muted-foreground" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail size={14} className="text-muted-foreground" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{customer.useCount ?? 0}回</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-muted-foreground" />
                      {formatDate(customer.lastReservationDate_unix)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.tags && customer.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">タグなし</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>詳細を表示</DropdownMenuItem>
                        <DropdownMenuItem>編集</DropdownMenuItem>
                        <DropdownMenuItem>予約履歴</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">アーカイブ</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {status === 'CanLoadMore' && (
        <div className="flex justify-center mt-6">
          <Button onClick={() => loadMore(numberOfItems)} variant="outline" className="gap-2">
            <span>さらに表示</span>
            {isLoading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <ChevronDown size={16} />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
