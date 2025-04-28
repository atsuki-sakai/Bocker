'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { api } from '@/convex/_generated/api';
import { usePaginatedQuery, useMutation } from 'convex/react';
import { useSalon } from '@/hooks/useSalon';
import { Loading } from '@/components/common';
import { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { Doc } from '@/convex/_generated/dataModel';
import { useState } from 'react';
import { Dialog } from '@/components/common';

export default function CouponList() {
  const { salon } = useSalon();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<Id<'coupon'> | null>(null);
  const deleteCoupon = useMutation(api.coupon.core.mutation.killRelatedTables);

  const { results, loadMore, status, isLoading } = usePaginatedQuery(
    api.coupon.core.query.list,
    salon ? { salonId: salon._id as Id<'salon'> } : 'skip',
    { initialNumItems: 10 }
  );

  const showDialog = (id: Id<'coupon'>) => {
    setSelectedCouponId(id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: Id<'coupon'>) => {
    deleteCoupon({ couponId: id });
    toast.success('クーポンを削除しました。');
    setIsDialogOpen(false);
  };

  if (!salon || isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-500">
          予約時にクーポンコードを入力することでメニュー毎に独自の割引を適用できるようになります。
          <br />
          リピート率を上げる効果的な方法としてご活用ください。
        </p>
      </div>
      <div className="pt-2 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8 px-4 md:px-0">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50 text-nowrap px-2">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left  text-xs  font-semibold text-gray-900 sm:pl-6"
                    >
                      ステータス
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left  text-xs  font-semibold text-gray-900 sm:pl-6"
                    >
                      クーポン名
                    </th>

                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left  text-xs  font-semibold text-gray-900"
                    >
                      割引タイプ
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left  text-xs  font-semibold text-gray-900"
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
                <tbody className="divide-y divide-gray-200 bg-white text-nowrap">
                  {results.length > 0 ? (
                    results?.map((coupon: Doc<'coupon'>, index: number) => (
                      <tr key={`${coupon._id.slice(0, 4)}-${index}`}>
                        <td
                          className={`py-4 pr-3 pl-4  text-sm  font-medium whitespace-nowrap text-gray-900 sm:pl-6 `}
                        >
                          <span
                            className={`font-bold text-xs ${coupon.isActive ? 'bg-green-600' : 'bg-gray-400'} text-white px-2 py-1 rounded-md`}
                          >
                            {coupon.isActive ? '有効' : '無効'}
                          </span>
                        </td>
                        <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6">
                          {coupon.name?.slice(0, 20)}
                          <br />
                          <span className="text-xs text-gray-500">{coupon.couponUid}</span>
                        </td>

                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                          {coupon.discountType === 'percentage' ? '割引' : '固定割引'}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                          {coupon.discountType === 'percentage'
                            ? `${coupon.percentageDiscountValue}%`
                            : `${coupon.fixedDiscountValue}円`}
                        </td>

                        <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                          <Link
                            href={`/dashboard/coupon/edit/${coupon._id}`}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <Button variant="ghost" size="sm">
                              編集<span className="sr-only">, {coupon.name}</span>
                            </Button>
                          </Link>
                        </td>
                        <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                          <Button
                            variant="ghost"
                            className="text-red-600 hover:text-red-800"
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
                      <td colSpan={10} className="text-gray-400 text-sm text-center py-6">
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
      <Dialog
        title="クーポンを削除しますか？"
        description="この操作は元に戻すことができません。"
        confirmTitle="削除する"
        cancelTitle="キャンセル"
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConfirmAction={() => selectedCouponId && handleDelete(selectedCouponId)}
      />
    </div>
  );
}
