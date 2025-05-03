'use client';

import Link from 'next/link'
import { api } from '@/convex/_generated/api'
import { usePaginatedQuery } from 'convex/react'
import { useSalon } from '@/hooks/useSalon'
import { Mail, Phone, Calendar, ChevronDown, Search, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/common'
import { useDebounce } from 'use-debounce'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { handleErrorToMsg } from '@/lib/error'
import { useMutation } from 'convex/react'
import { Id } from '@/convex/_generated/dataModel'

// 1回のロードでより多くのアイテムを表示
const numberOfItems: number = 20

export default function CustomerList() {
  const salon = useSalon()
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [debouncedSearchTerm] = useDebounce(searchTerm, 1500)
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<Id<'customer'> | null>(null)

  const deleteCustomer = useMutation(api.customer.core.mutation.killRelatedTables)

  const handleShowDeleteModal = (
    e: React.MouseEvent<HTMLButtonElement>,
    customerId: Id<'customer'>
  ) => {
    e.preventDefault()
    setSelectedCustomerId(customerId)
    setShowDeleteModal(true)
  }

  const handleDeleteCustomer = async (customerId: Id<'customer'>) => {
    try {
      await deleteCustomer({ customerId })
      toast.success('顧客を削除しました')
      setShowDeleteModal(false)
    } catch (error) {
      toast.error(handleErrorToMsg(error))
    }
  }
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
  )

  // フロントエンドでのフィルタリング（一時的な対応策）
  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase().trim()
    const searchbleText =
      `${customer.firstName} ${customer.lastName} ${customer.email} ${customer.phone} ${customer.lineUserName}`.toLowerCase()

    return (
      searchbleText.includes(searchLower) ||
      (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
      (customer.phone && customer.phone.includes(searchLower)) ||
      (customer.lineUserName && customer.lineUserName.toLowerCase().includes(searchLower)) ||
      (customer.lastName && customer.lastName.toLowerCase().includes(searchLower)) ||
      (customer.firstName && customer.firstName.toLowerCase().includes(searchLower))
    )
  })

  // 予約日の書式変換
  const formatDate = useCallback((timestamp: number | null | undefined): string => {
    if (!timestamp) return '未予約'
    return new Date(timestamp * 1000).toLocaleDateString('ja-JP')
  }, [])

  if (isLoading) {
    return <Loading />
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

      <div className="rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 text-slate-700">
              <TableHead className="w-[250px] px-2">顧客名/LINEユーザー名</TableHead>
              <TableHead className="px-2">連絡先</TableHead>
              <TableHead className="w-[100px] text-center px-2">来店回数</TableHead>
              <TableHead className="w-[150px] px-2">最終来店日</TableHead>
              <TableHead className="px-2">タグ</TableHead>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[50px]"></TableHead>
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
                <TableRow key={customer._id} className="hover:bg-transparent">
                  <TableCell className="font-medium px-2">
                    <div className="flex items-center text-xs text-muted-foreground gap-2 text-nowrap">
                      <span>
                        {customer.lastName && customer.firstName
                          ? `${customer.lastName} ${customer.firstName}`
                          : '未登録'}
                      </span>
                      {customer.lineUserName && (
                        <span className="text-xs text-muted-foreground">
                          / {customer.lineUserName}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="px-2 text-xs">
                    <div className="space-y-1">
                      {customer.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-muted-foreground" />
                          <span>{customer.phone}</span>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">未登録</p>
                      )}
                      {customer.email ? (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-muted-foreground" />
                          <span>{customer.email}</span>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">未登録</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{customer.useCount ?? 0}回</Badge>
                  </TableCell>
                  <TableCell className="px-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-muted-foreground" />
                      {formatDate(customer.lastReservationDate_unix)}
                    </div>
                  </TableCell>
                  <TableCell className="w-full">
                    {customer.tags && customer.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 w-full min-w-[140px]">
                        {customer.tags.map((tag: string, index: number) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs py-1 px-1 font-light"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">タグなし</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-xs text-purple-600 hover:text-purple-800"
                    >
                      <Link href={`/dashboard/customer/${customer._id}`}>詳細</Link>
                    </Button>
                  </TableCell>
                  <TableCell className="px-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      <Link href={`/dashboard/customer/${customer._id}/edit`}>編集</Link>
                    </Button>
                  </TableCell>
                  <TableCell className="px-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        handleShowDeleteModal(e, customer._id)
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      削除
                    </Button>
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

      {showDeleteModal && selectedCustomerId && (
        <Dialog
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          title="顧客を削除しますか？"
          description="この操作は元に戻すことができません。"
          onConfirmAction={() => {
            handleDeleteCustomer(selectedCustomerId)
          }}
        />
      )}
    </div>
  )
}
