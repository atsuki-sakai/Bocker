'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { api } from '@/convex/_generated/api'
import { usePaginatedQuery, useMutation } from 'convex/react'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { Loading } from '@/components/common'
import { Id } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'
import { Doc } from '@/convex/_generated/dataModel'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export default function CouponList() {
  const t = useTranslations('coupon')
  const tCommon = useTranslations('common')
  const router = useRouter()
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
    toast.success(t('couponDeleted'))
    setIsDialogOpen(false)
  }

  if (!tenantId || !orgId || isLoading) {
    return <Loading />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {t('description.list')}
          <br />
          {t('description.listSecondary')}
        </p>
      </div>
      <div className="pt-2 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8 px-4 md:px-0">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden border border-border rounded-lg">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-neon-foreground text-nowrap px-2">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left  text-sm  font-semibold text-neon sm:pl-6"
                    >
                      {t('status')}
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left  text-sm  font-semibold text-neon sm:pl-6"
                    >
                      {t('couponName')}
                    </th>

                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left  text-sm  font-semibold text-neon"
                    >
                      {t('discountType')}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left  text-sm  font-semibold text-neon"
                    >
                      {t('discountValue')}
                    </th>
                    <th scope="col" className="relative py-3.5 pr-4 pl-3 sm:pr-6">
                      <span className="sr-only">{tCommon('delete')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background text-nowrap">
                  {results.length > 0 ? (
                    results?.map((coupon: Doc<'coupon'>, index: number) => (
                      <tr
                        key={`${coupon._id.slice(0, 4)}-${index}`}
                        className="cursor-pointer hover:bg-secondary"
                        onClick={() => router.push(`/dashboard/coupon/edit/${coupon._id}`)}
                      >
                        <td
                          className={`py-4 pr-3 pl-4  text-sm  font-medium whitespace-nowrap text-muted-foreground sm:pl-6 `}
                        >
                          <span
                            className={`font-bold text-xs ${coupon.is_active ? 'bg-accent-2-foreground text-accent-2' : 'bg-muted-foreground text-background'} px-2 py-1 rounded-md`}
                          >
                            {coupon.is_active ? t('active') : t('inactive')}
                          </span>
                        </td>
                        <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-muted-foreground sm:pl-6">
                          {coupon.name?.slice(0, 20)}
                          <br />
                          <span className="text-xs text-muted-foreground">{coupon.coupon_uid}</span>
                        </td>

                        <td className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                          {coupon.discount_type === 'percentage' ? t('percentage') : t('fixed')}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.percentage_discount_value}%`
                            : `${tCommon('currencySymbol')}${coupon.fixed_discount_value?.toLocaleString()}`}
                        </td>
                        <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                          <Button
                            variant="ghost"
                            className="text-destructive bg-destructive-foreground hover:opacity-80"
                            size="sm"
                            onClick={() => showDialog(coupon._id)}
                          >
                            {tCommon('delete')}
                            <span className="sr-only">, {coupon.name}</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="text-muted-foreground text-sm text-center py-6">
                        {t('noCoupons')}
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
          <Button onClick={() => loadMore(10)}>{tCommon('showMore')}</Button>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDelete')}</DialogTitle>
            <DialogDescription>{t('deleteWarning')}</DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedCouponId && handleDelete(selectedCouponId)}
              >
                {tCommon('delete')}
              </Button>
            </DialogFooter>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}
