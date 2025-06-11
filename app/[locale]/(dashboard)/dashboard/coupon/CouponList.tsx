'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { api } from '@/convex/_generated/api'
import { usePaginatedQuery, useMutation } from 'convex/react'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { Loading } from '@/components/common'
import { Id } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'
import { Doc } from '@/convex/_generated/dataModel'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export default function CouponList() {
  const { tenantId, orgId } = useTenantAndOrganization()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCouponId, setSelectedCouponId] = useState<Id<'coupon'> | null>(null)
  const deleteCoupon = useMutation(api.coupon.mutation.killRelatedTables)

  const { results, loadMore, status, isLoading } = usePaginatedQuery(
    api.coupon.query.list,
    tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
        }
      : 'skip',
    { initialNumItems: 10 }
  )

  const showDialog = (id: Id<'coupon'>) => {
    setSelectedCouponId(id)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: Id<'coupon'>) => {
    deleteCoupon({ couponId: id })
    toast.success('クーポンを削除しました。')
    setIsDialogOpen(false)
  }

  if (!tenantId || !orgId || isLoading) {
    return <Loading />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          予約時にクーポンコードを入力することでメニュー毎に独自の割引を適用できるようになります。
          <br />
          リピート率を上げる効果的な方法としてご活用ください。
        </p>
      </div>
      <div className="pt-2 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8 px-4 md:px-0">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden border border-border rounded-lg">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted text-nowrap px-2">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left  text-sm  font-semibold text-primary sm:pl-6"
                    >
                      ステータス
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left  text-sm  font-semibold text-primary sm:pl-6"
                    >
                      クーポン名
                    </th>

                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left  text-sm  font-semibold text-primary"
                    >
                      割引タイプ
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left  text-sm  font-semibold text-primary"
                    >
                      割引額
                    </th>

                    <th scope="col" className="relative py-3.5 pr-4 pl-3 sm:pr-6">
                      <span className="sr-only">編集</span>
                    </th>
                    <th scope="col" className="relative py-3.5 pr-4 pl-3 sm:pr-6">
                      <span className="sr-only">削除</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background text-nowrap">
                  {results.length > 0 ? (
                    results?.map((coupon: Doc<'coupon'>, index: number) => (
                      <tr key={`${coupon._id.slice(0, 4)}-${index}`}>
                        <td
                          className={`py-4 pr-3 pl-4  text-sm  font-medium whitespace-nowrap text-muted-foreground sm:pl-6 `}
                        >
                          <span
                            className={`font-bold text-xs ${coupon.is_active ? 'bg-active text-white' : 'bg-muted-foreground text-white'} px-2 py-1 rounded-md`}
                          >
                            {coupon.is_active ? '有効' : '無効'}
                          </span>
                        </td>
                        <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-muted-foreground sm:pl-6">
                          {coupon.name?.slice(0, 20)}
                          <br />
                          <span className="text-xs text-muted-foreground">{coupon.coupon_uid}</span>
                        </td>

                        <td className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                          {coupon.discount_type === 'percentage' ? '割引' : '固定割引'}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.percentage_discount_value}%`
                            : `${coupon.fixed_discount_value}円`}
                        </td>

                        <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                          <Link href={`/dashboard/coupon/edit/${coupon._id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-link-foreground bg-link hover:opacity-80"
                            >
                              編集<span className="sr-only">, {coupon.name}</span>
                            </Button>
                          </Link>
                        </td>
                        <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                          <Button
                            variant="destructive"
                            className="text-destructive-foreground hover:opacity-80"
                            size="sm"
                            onClick={() => showDialog(coupon._id)}
                          >
                            削除<span className="sr-only">, {coupon.name}</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="text-muted-foreground text-sm text-center py-6">
                        クーポンがまだありません。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        {results?.length > 10 && status === 'CanLoadMore' && (
          <Button onClick={() => loadMore(10)}>もっと見る</Button>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>クーポンを削除しますか？</DialogTitle>
            <DialogDescription>この操作は元に戻すことができません。</DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedCouponId && handleDelete(selectedCouponId)}
              >
                削除する
              </Button>
            </DialogFooter>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}
