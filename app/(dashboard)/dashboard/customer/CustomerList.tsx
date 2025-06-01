'use client'

import Link from 'next/link'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { Mail, Phone, Calendar, ChevronDown, Search, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository'
import type { RowType } from '@/services/supabase/SupabaseService'

// 1回のロードでより多くのアイテムを表示
const PAGE_SIZE: number = 20

// 顧客情報の型定義
type CustomerWithDetails = {
  customer: RowType<'customer'>
  customerDetail: RowType<'customer_detail'> | null
  customerPoints: RowType<'customer_points'> | null
}

export default function CustomerList() {
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [debouncedSearchTerm] = useDebounce(searchTerm, 1000)
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [selectedCustomerUid, setSelectedCustomerUid] = useState<string | null>(null)
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreData, setHasMoreData] = useState(true)

  const customerRepo = new CustomerRepository()

  // 顧客データを取得する関数
  const fetchCustomers = useCallback(
    async (page: number = 1, search: string = '', append: boolean = false) => {
      if (!tenantId || !orgId || !isLoaded) {
        return
      }

      try {
        if (!append) {
          setIsLoading(true)
        } else {
          setIsLoadingMore(true)
        }

        // 顧客リストを取得
        const { data: customerList, count } = await customerRepo.list({
          page,
          pageSize: PAGE_SIZE,
          filters: {
            tenant_id: tenantId,
            org_id: orgId,
            is_archive: false,
            ...(search &&
              {
                // 検索語がある場合、名前、電話番号、メールアドレスでフィルタリング
                // 注意: 実際のSupabaseクエリでは、より高度な検索機能が必要な場合があります
              }),
          } as Partial<RowType<'customer'>>,
        })

        // 各顧客の詳細情報とポイント情報を並行取得
        const customersWithDetails: CustomerWithDetails[] = await Promise.all(
          customerList.map(async (customer) => {
            const completeData = await customerRepo.getCompleteCustomerData(
              customer.uid,
              tenantId,
              orgId
            )
            return {
              customer,
              customerDetail: completeData.customerDetail,
              customerPoints: completeData.customerPoints,
            }
          })
        )

        // 検索フィルタリング（クライアントサイドで実施）
        const filteredCustomers = search
          ? customersWithDetails.filter((item) => {
              const searchLower = search.toLowerCase().trim()
              const customer = item.customer
              const searchableText =
                `${customer.first_name || ''} ${customer.last_name || ''} ${customer.email || ''} ${customer.phone || ''} ${customer.line_user_name || ''}`.toLowerCase()
              return searchableText.includes(searchLower)
            })
          : customersWithDetails

        if (append) {
          setCustomers((prev) => [...prev, ...filteredCustomers])
        } else {
          setCustomers(filteredCustomers)
        }

        // ページネーション制御
        const totalCustomers = search ? filteredCustomers.length : count || 0
        setHasMoreData(filteredCustomers.length === PAGE_SIZE && page * PAGE_SIZE < totalCustomers)
      } catch (error) {
        console.error('顧客データの取得に失敗しました:', error)
        toast.error('顧客データの取得に失敗しました')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [tenantId, orgId, isLoaded, customerRepo]
  )

  // 初回データ取得
  useEffect(() => {
    if (tenantId && orgId && isLoaded) {
      fetchCustomers(1, debouncedSearchTerm, false)
      setCurrentPage(1)
    }
  }, [tenantId, orgId, isLoaded, debouncedSearchTerm, fetchCustomers])

  // さらに読み込み
  const loadMore = () => {
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    fetchCustomers(nextPage, debouncedSearchTerm, true)
  }

  // 削除モーダルを表示
  const handleShowDeleteModal = (e: React.MouseEvent<HTMLButtonElement>, customerUid: string) => {
    e.preventDefault()
    setSelectedCustomerUid(customerUid)
    setShowDeleteModal(true)
  }

  // 顧客削除処理
  const handleDeleteCustomer = async (customerUid: string) => {
    try {
      await customerRepo.deleteWithRelatedData(customerUid)
      toast.success('顧客を削除しました')
      setShowDeleteModal(false)
      setSelectedCustomerUid(null)
      // リストを再取得
      fetchCustomers(1, debouncedSearchTerm, false)
      setCurrentPage(1)
    } catch (error) {
      console.error('顧客の削除に失敗しました:', error)
      toast.error('顧客の削除に失敗しました')
    }
  }

  // 予約日の書式変換
  const formatDate = useCallback((timestamp: number | null | undefined): string => {
    if (!timestamp) return '未予約'
    return new Date(timestamp * 1000).toLocaleDateString('ja-JP')
  }, [])

  if (!isLoaded || isLoading) {
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
            <TableRow className="bg-muted text-muted-foreground">
              <TableHead className="px-4 text-nowrap w-fit font-bold">
                顧客名/LINEユーザー名
              </TableHead>
              <TableHead className="px-4 text-nowrap w-fit font-bold">連絡先</TableHead>
              <TableHead className="px-4 text-nowrap w-fit font-bold">来店回数</TableHead>
              <TableHead className="px-4 text-nowrap w-fit font-bold">最終来店日</TableHead>
              <TableHead className="px-2 w-fit font-bold">タグ</TableHead>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {searchTerm ? '検索条件に一致する顧客が見つかりません' : '顧客データがありません'}
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customerData) => (
                <TableRow key={customerData.customer.uid} className="hover:bg-transparent">
                  <TableCell className="font-medium px-4">
                    <div className="flex items-center text-sm text-muted-foreground gap-4 text-nowrap">
                      <span>
                        {customerData.customer.last_name && customerData.customer.first_name
                          ? `${customerData.customer.last_name} ${customerData.customer.first_name}`
                          : '未登録'}
                      </span>
                      {customerData.customer.line_user_name && (
                        <span className="text-sm text-muted-foreground">
                          / {customerData.customer.line_user_name}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="px-4 text-sm">
                    <div className="space-y-1">
                      {customerData.customer.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-muted-foreground " />
                          <span className="tracking-wider">{customerData.customer.phone}</span>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">未登録</p>
                      )}
                      {customerData.customer.email ? (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-muted-foreground" />
                          <span className="tracking-wider">{customerData.customer.email}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-muted-foreground" />
                          <p className="text-muted-foreground">未登録</p>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge>{customerData.customer.total_reservation_count ?? 0} 回</Badge>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex items-center gap-4">
                      <Calendar size={16} className="text-muted-foreground" />
                      <span className="text-nowrap">
                        {formatDate(customerData.customer.last_reservation_date_unix)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="w-full">
                    {customerData.customer.tags && customerData.customer.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 w-full min-w-[140px]">
                        {customerData.customer.tags.map((tag: string, index: number) => (
                          <Badge key={index} className="text-xs py-1 px-1 font-light">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">タグなし</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4">
                    <Button
                      className="text-xs bg-link text-link-foreground hover:opacity-80 transition-opacity duration-300"
                      variant="ghost"
                      size="icon"
                    >
                      <Link href={`/dashboard/customer/${customerData.customer.uid}`}>詳細</Link>
                    </Button>
                  </TableCell>
                  <TableCell className="px-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-xs bg-muted text-muted-foreground hover:opacity-80 transition-opacity duration-300"
                    >
                      <Link href={`/dashboard/customer/${customerData.customer.uid}/edit`}>
                        編集
                      </Link>
                    </Button>
                  </TableCell>
                  <TableCell className="px-4">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        handleShowDeleteModal(e, customerData.customer.uid)
                      }}
                      className="text-xs hover:opacity-50 transition-opacity duration-300"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {hasMoreData && (
        <div className="flex justify-center mt-6">
          <Button onClick={loadMore} variant="outline" className="gap-2" disabled={isLoadingMore}>
            <span>さらに表示</span>
            {isLoadingMore ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <ChevronDown size={16} />
            )}
          </Button>
        </div>
      )}

      {showDeleteModal && selectedCustomerUid && (
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>顧客を削除しますか？</DialogTitle>
              <DialogDescription>
                この操作は元に戻すことができません。顧客に関連するすべてのデータが削除されます。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteCustomer(selectedCustomerUid)}
              >
                削除する
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
