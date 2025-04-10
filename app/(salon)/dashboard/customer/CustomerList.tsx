"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { api } from '@/convex/_generated/api';
import { useStablePaginatedQuery } from '@/hooks/useStablePaginatedQuery';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  UserCircle,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Id } from "@/convex/_generated/dataModel";
import { Loading } from "@/components/common";
import { timestampToJSTISO } from "@/lib/utils";
// SortIndicator コンポーネント（サーバー側でも問題なく動作します）
const SortIndicator = ({
  field,
  currentSortField,
  currentSortDirection,
}: {
  field: string;
  currentSortField: string;
  currentSortDirection: string;
}) => {
  if (currentSortField !== field) return null;
  return currentSortDirection === "asc" ? (
    <ChevronUp className="ml-1 h-4 w-4" />
  ) : (
    <ChevronDown className="ml-1 h-4 w-4" />
  );
};

interface CustomerListProps {
  id: string;
  searchParams: {
    search?: string;
    sortField?: string;
    sortDirection?: string;
  };
}

export default function CustomerList({ id, searchParams }: CustomerListProps) {
  const router = useRouter();
  const searchTerm = searchParams.search || "";
  const sortField = searchParams.sortField || "lastName";
  const sortDirection = searchParams.sortDirection || "asc";
  // サーバー側で顧客データを取得
  const {
    results: customers,
    loadMore,
    status,
  } = useStablePaginatedQuery(
    api.customer.core.customersBySalonId,
    {
      salonId: id as Id<'salon'>,
      sort: sortDirection as 'asc' | 'desc',
    },
    { initialNumItems: 10 }
  );
  const filteredCustomers = useMemo(() => {
    return customers
      ? customers
          .filter(
            (customer) =>
              customer.firstName
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              customer.lastName
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase())
          )
          .sort((a, b) => {
            const fieldA = a[sortField as keyof typeof a] || "";
            const fieldB = b[sortField as keyof typeof b] || "";
            if (sortDirection === "asc") {
              return fieldA > fieldB ? 1 : -1;
            } else {
              return fieldA < fieldB ? 1 : -1;
            }
          })
      : [];
  }, [customers, searchTerm, sortField, sortDirection]);

  if (
    (status === "LoadingFirstPage" || status === "LoadingMore") &&
    filteredCustomers.length === 0
  ) {
    return <Loading />;
  }

  return (
    <div className="w-full">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">顧客一覧</CardTitle>
          <CardDescription>
            {filteredCustomers.length}人の顧客がサロンに登録されています
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 検索フォーム（GET メソッドでサーバー再レンダリング） */}
          <form
            method="get"
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 max-w-[300px]"
          >
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="顧客を検索..."
                defaultValue={searchTerm}
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="default" className="ml-auto">
              検索
            </Button>
          </form>
          {/* 顧客テーブル */}
          <div className="rounded-md border">
            <Table>
              {filteredCustomers.length === 0 && (
                <TableCaption>登録された顧客はありません</TableCaption>
              )}
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">
                    <Link
                      href={`?search=${encodeURIComponent(searchTerm)}&sortField=lineUserName&sortDirection=${sortField === "lineUserName" && sortDirection === "asc" ? "desc" : "asc"}`}
                    >
                      <div className="flex items-center cursor-pointer">
                        <UserCircle className="mr-2 h-4 w-4" />
                        氏名
                        <SortIndicator
                          field="lastName"
                          currentSortField={sortField}
                          currentSortDirection={sortDirection}
                        />
                      </div>
                    </Link>
                  </TableHead>

                  <TableHead className="hidden sm:table-cell">
                    <Link
                      href={`?search=${encodeURIComponent(searchTerm)}&sortField=phone&sortDirection=${sortField === "phone" && sortDirection === "asc" ? "desc" : "asc"}`}
                    >
                      <div className="flex items-center cursor-pointer">
                        <Phone className="mr-2 h-4 w-4" />
                        電話番号
                        <SortIndicator
                          field="phone"
                          currentSortField={sortField}
                          currentSortDirection={sortDirection}
                        />
                      </div>
                    </Link>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Link
                      href={`?search=${encodeURIComponent(searchTerm)}&sortField=email&sortDirection=${sortField === "email" && sortDirection === "asc" ? "desc" : "asc"}`}
                    >
                      <div className="flex items-center cursor-pointer">
                        <Mail className="mr-2 h-4 w-4" />
                        メール
                        <SortIndicator
                          field="email"
                          currentSortField={sortField}
                          currentSortDirection={sortDirection}
                        />
                      </div>
                    </Link>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <Link
                      href={`?search=${encodeURIComponent(searchTerm)}&sortField=lastReservationDate&sortDirection=${sortField === "lastReservationDate" && sortDirection === "asc" ? "desc" : "asc"}`}
                    >
                      <div className="flex items-center cursor-pointer">
                        <Calendar className="mr-2 h-4 w-4" />
                        最終予約日
                        <SortIndicator
                          field="lastReservationDate"
                          currentSortField={sortField}
                          currentSortDirection={sortDirection}
                        />
                      </div>
                    </Link>
                  </TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer._id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div>{customer.lineUserName}</div>
                      {customer.tags && customer.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {customer.tags.map((tag: string) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {customer.phone}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="cursor-default">
                            <span className="truncate max-w-[200px] block">
                              {customer.email}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{customer.email}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {customer.lastReservationDate_unix ? timestampToJSTISO(customer.lastReservationDate_unix) : "予約なし"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/dashboard/${id}/customer/${customer._id}/detail`
                              )
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            <span>詳細</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/dashboard/${id}/customer/${customer._id}/edit`
                              )
                            }
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            <span>編集</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredCustomers.length > 0 && status !== "Exhausted" && (
            <div className="mt-8 flex justify-center">
              <Button
                onClick={() => loadMore(10)}
                disabled={status === "LoadingMore"}
                variant="outline"
                className="flex items-center gap-2"
              >
                {status === "LoadingMore" ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></span>
                    読み込み中...
                  </>
                ) : (
                  <>さらに表示する</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
