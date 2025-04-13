'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useStablePaginatedQuery } from '@/hooks/useStablePaginatedQuery';
import { api } from '@/convex/_generated/api';
import { useSalon } from '@/hooks/useSalon';
import { Loading } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Doc } from '@/convex/_generated/dataModel';

const numberOfStaffs = 10;
export default function StaffList() {
  const { salon } = useSalon();
  const {
    results: staffs,
    isLoading,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.staff.core.getStaffListBySalonId,
    salon ? { salonId: salon._id } : 'skip',
    {
      initialNumItems: numberOfStaffs,
    }
  );

  if (!staffs || isLoading) {
    return <Loading />;
  }

  return (
    <div className="mt-8 flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden ring-1 shadow-sm ring-black/5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                  >
                    ステータス
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                  >
                    画像
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                  >
                    名前
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    年齢
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    メールアドレス
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    性別
                  </th>
                  <th scope="col" className="relative py-3.5 pr-4 pl-3 sm:pr-6">
                    <span className="sr-only">詳細</span>
                  </th>
                  <th scope="col" className="relative py-3.5 pr-4 pl-3 sm:pr-6">
                    <span className="sr-only">編集</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {staffs && staffs.length > 0 ? (
                  staffs.map((staff: Doc<'staff'>, index: number) => (
                    <tr key={index}>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6">
                        {staff.isActive ? (
                          <Badge variant="outline" className="bg-green-600 text-white">
                            有効
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500 text-white">
                            無効
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {staff.imgPath ? (
                          <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                            <Image
                              src={staff.imgPath}
                              alt={staff.name ?? ''}
                              width={100}
                              height={100}
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10  bg-gray-200 rounded-full text-center flex items-center justify-center ">
                            <span className="uppercase font-bold text-gray-500">
                              {staff.name?.charAt(0)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {staff.name ?? '未設定'}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {staff.age ? `${staff.age}歳` : '未設定 '}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {staff.email ?? '未設定'}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {staff.gender === 'unselected'
                          ? '未選択'
                          : staff.gender === 'male'
                            ? '男性'
                            : '女性'}
                      </td>
                      <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                        <Link
                          href={`/dashboard/staff/${staff._id}`}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          　詳細<span className="sr-only">, {staff.name}</span>
                        </Link>
                      </td>
                      <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                        <Link
                          href={`/dashboard/staff/${staff._id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          編集<span className="sr-only">, {staff.name}</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="h-24 text-center">
                    <td colSpan={12} className="text-sm text-gray-500">
                      スタッフが見つかりません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {staffs && staffs.length > 0 && status === 'CanLoadMore' && (
              <div className="flex justify-center items-center py-4">
                <Button onClick={() => loadMore(numberOfStaffs)} variant="outline">
                  スタッフをさらに読み込む
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
