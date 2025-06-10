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
import { useState, useCallback, useEffect, useMemo } from 'react'
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
  // 通常リスト用と検索結果用で状態を分離
  const [allCustomers, setAllCustomers] = useState<CustomerWithDetails[]>([]) // 通常リスト
  const [searchResults, setSearchResults] = useState<CustomerWithDetails[]>([]) // 検索結果
  const [isSearchMode, setIsSearchMode] = useState(false) // 検索モード判定

  // ローディング状態の細分化
  const [isLoadingAll, setIsLoadingAll] = useState(true) // 通常リスト
  const [isLoadingSearch, setIsLoadingSearch] = useState(false) // 検索
  const [isLoadingMoreAll, setIsLoadingMoreAll] = useState(false) // 通常リスト追加読み込み
  const [isLoadingMoreSearch, setIsLoadingMoreSearch] = useState(false) // 検索結果追加読み込み

  // ページネーション状態の分離
  const [currentAllPage, setCurrentAllPage] = useState(1) // 通常リスト用
  const [currentSearchPage, setCurrentSearchPage] = useState(1) // 検索結果用
  const [hasMoreAll, setHasMoreAll] = useState(true) // 通常リスト用
  const [hasMoreSearch, setHasMoreSearch] = useState(true) // 検索結果用

  // CustomerRepositoryのインスタンスをメモ化
  const customerRepo = useMemo(() => new CustomerRepository(), [])

  // 検索結果のキャッシュ
  const [searchCache, setSearchCache] = useState<Map<string, CustomerWithDetails[]>>(new Map())

  // キャッシュされた検索結果を取得
  const getCachedResults = useCallback((searchTerm: string): CustomerWithDetails[] | null => {
    return searchCache.get(searchTerm.toLowerCase().trim()) || null
  }, [searchCache])

  // 詳細データ取得の最適化（バッチ処理）
  const getCustomersWithDetails = useCallback(async (customers: RowType<'customer'>[]): Promise<CustomerWithDetails[]> => {
    const BATCH_SIZE = 10
    const results: CustomerWithDetails[] = []
    
    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(async (customer) => {
          const completeData = await customerRepo.getCompleteCustomerData(
            customer.uid,
            tenantId!,
            orgId!
          )
          return {
            customer,
            customerDetail: completeData.customerDetail,
            customerPoints: completeData.customerPoints,
          }
        })
      )
      results.push(...batchResults)
    }
    
    return results
  }, [customerRepo, tenantId, orgId])

  // 表示用データを動的に切り替え
  const displayCustomers = isSearchMode ? searchResults : allCustomers
  const isLoading = isSearchMode ? isLoadingSearch : isLoadingAll
  const isLoadingMore = isSearchMode ? isLoadingMoreSearch : isLoadingMoreAll
  const hasMoreData = isSearchMode ? hasMoreSearch : hasMoreAll

  // 通常リスト取得関数（検索モードでない場合のみ実行）
  const fetchAllCustomers = useCallback(
    async (page: number = 1, append: boolean = false) => {
      // 検索モードでない場合のみ実行
      if (!tenantId || !orgId || !isLoaded || isSearchMode) {
        return
      }

      try {
        if (!append) {
          setIsLoadingAll(true)
        } else {
          setIsLoadingMoreAll(true)
        }

        // 顧客リストを取得（検索フィルタリングなし）
        const { data: customerList, count } = await customerRepo.list({
          page,
          pageSize: PAGE_SIZE,
          filters: {
            tenant_id: tenantId,
            org_id: orgId,
            is_archive: false,
          } as Partial<RowType<'customer'>>,
        })

        // バッチ処理で詳細データを効率的に取得
        const customersWithDetails = await getCustomersWithDetails(customerList)

        if (append) {
          setAllCustomers((prev) => [...prev, ...customersWithDetails])
        } else {
          setAllCustomers(customersWithDetails)
        }

        // ページネーション制御
        setHasMoreAll(customersWithDetails.length === PAGE_SIZE && page * PAGE_SIZE < (count || 0))
      } catch (error) {
        console.error('顧客データの取得に失敗しました:', error)
        toast.error('顧客データの取得に失敗しました')
      } finally {
        setIsLoadingAll(false)
        setIsLoadingMoreAll(false)
      }
    },
    [tenantId, orgId, isLoaded, isSearchMode, customerRepo, getCustomersWithDetails]
  )

  // 検索専用関数（Supabaseサーバーサイド検索を使用 + キャッシュ対応）
  const searchCustomers = useCallback(
    async (searchTerm: string, page: number = 1, append: boolean = false) => {
      if (!tenantId || !orgId || !searchTerm.trim()) {
        setIsSearchMode(false)
        return
      }

      const cacheKey = searchTerm.toLowerCase().trim()

      // 初回検索でキャッシュチェック
      if (page === 1 && !append) {
        const cachedResults = getCachedResults(searchTerm)
        if (cachedResults) {
          setIsSearchMode(true)
          setSearchResults(cachedResults)
          setHasMoreSearch(false) // キャッシュされた結果は完全なものとして扱う
          return
        }
      }

      try {
        setIsSearchMode(true)
        if (!append) {
          setIsLoadingSearch(true)
        } else {
          setIsLoadingMoreSearch(true)
        }

        // Supabaseのサーバーサイド検索を使用
        const result = await customerRepo.findBySearchableText(tenantId, orgId, searchTerm.trim(), {
          page,
          pageSize: PAGE_SIZE,
        })

        // バッチ処理で詳細データを効率的に取得
        const customersWithDetails = await getCustomersWithDetails(result.data)

        if (append) {
          setSearchResults((prev) => [...prev, ...customersWithDetails])
        } else {
          setSearchResults(customersWithDetails)
          // 初回検索結果をキャッシュ（小さな結果のみ）
          if (customersWithDetails.length <= 20) {
            setSearchCache(prev => new Map(prev).set(cacheKey, customersWithDetails))
          }
        }

        // ページネーション制御
        setHasMoreSearch(result.hasMore)
      } catch (error) {
        console.error('顧客検索に失敗しました:', error)
        toast.error('顧客検索に失敗しました')
        setSearchResults([])
      } finally {
        setIsLoadingSearch(false)
        setIsLoadingMoreSearch(false)
      }
    },
    [tenantId, orgId, customerRepo, getCachedResults, getCustomersWithDetails]
  )

  // 初回データ取得（通常リスト）
  useEffect(() => {
    if (tenantId && orgId && isLoaded && !isSearchMode) {
      fetchAllCustomers(1, false)
      setCurrentAllPage(1)
    }
  }, [tenantId, orgId, isLoaded, isSearchMode, fetchAllCustomers])

  // デバウンス検索処理
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      searchCustomers(debouncedSearchTerm, 1, false)
      setCurrentSearchPage(1)
    } else {
      // 検索語が空の場合は通常モードに戻る
      setIsSearchMode(false)
      setSearchResults([])
      // 通常リストがない場合は取得
      if (allCustomers.length === 0) {
        fetchAllCustomers(1, false)
        setCurrentAllPage(1)
      }
    }
  }, [debouncedSearchTerm, searchCustomers, fetchAllCustomers, allCustomers.length])

  // さらに読み込み（検索モードと通常モードに対応）
  const loadMore = () => {
    if (isSearchMode) {
      const nextPage = currentSearchPage + 1
      setCurrentSearchPage(nextPage)
      searchCustomers(debouncedSearchTerm, nextPage, true)
    } else {
      const nextPage = currentAllPage + 1
      setCurrentAllPage(nextPage)
      fetchAllCustomers(nextPage, true)
    }
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
      // 適切なリストを再取得
      if (isSearchMode) {
        searchCustomers(debouncedSearchTerm, 1, false)
        setCurrentSearchPage(1)
      } else {
        fetchAllCustomers(1, false)
        setCurrentAllPage(1)
      }
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
      <div className="flex flex-col gap-4">
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

        {/* 検索状態の可視化 */}
        {isSearchMode && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded-md">
            <Search size={16} />
            <span>「{debouncedSearchTerm}」の検索結果</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setIsSearchMode(false)
                setSearchResults([])
              }}
              className="ml-auto"
            >
              クリア
            </Button>
          </div>
        )}
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
              <TableHead className="px-2 text-nowrap w-fit font-bold">タグ</TableHead>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {searchTerm ? '検索条件に一致する顧客が見つかりません' : '顧客データがありません'}
                </TableCell>
              </TableRow>
            ) : (
              displayCustomers.map((customerData) => (
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
                      <div className="flex flex-wrap gap-1 w-full min-w-[140px] text-nowrap">
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
