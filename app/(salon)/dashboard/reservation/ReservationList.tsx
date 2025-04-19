'use client';

import { api } from '@/convex/_generated/api';
import { useSalon } from '@/hooks/useSalon';
import { usePaginatedQuery } from 'convex/react';
import { Loading } from '@/components/common';
import { formatJpTime, convertUnixTimeToDateString } from '@/lib/schedule';
import Link from 'next/link';

const statusMap = {
  pending: {
    color: 'bg-yellow-500',
    text: '未確認',
  },
  confirmed: {
    color: 'bg-green-500',
    text: '確認済み',
  },
  cancelled: {
    color: 'bg-red-500',
    text: 'キャンセル',
  },
  completed: {
    color: 'bg-blue-500',
    text: '完了',
  },
  refunded: {
    color: 'bg-gray-500',
    text: '返金',
  },
};

export default function ReservationList() {
  const { salonId } = useSalon();

  const { results: reservations, isLoading } = usePaginatedQuery(
    api.reservation.query.findBySalonId,
    salonId
      ? {
          salonId,
        }
      : 'skip',
    {
      initialNumItems: 10,
    }
  );

  if (isLoading) return <Loading />;
  console.log(reservations);

  return (
    <div className="w-full flex flex-col gap-4 my-4">
      {reservations
        .sort((a, b) => b.startTime_unix! - a.startTime_unix!)
        .map((reservation) => (
          <Link href={`/dashboard/reservation/${reservation._id}`} key={reservation._id}>
            <div
              key={reservation._id}
              className="flex flex-col gap-1 border-b border-gray-200 pb-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold">
                <p
                  className={`${statusMap[reservation.status!].color} text-white px-2 py-1 rounded-md`}
                >
                  {statusMap[reservation.status!].text}
                </p>
                <p>{reservation.staffName ?? '未設定'}</p>
              </div>
              <p>{}</p>
              <span className="text-sm text-slate-500">
                {convertUnixTimeToDateString(reservation.startTime_unix!)}
              </span>
              <div className="flex gap-2 text-xs font-bold tracking-wide text-indigo-500 animate-pulse">
                <p>
                  {reservation.startTime_unix ? formatJpTime(reservation.startTime_unix) : 'ERROR'}
                </p>
                {' ~ '}
                <p>{reservation.endTime_unix ? formatJpTime(reservation.endTime_unix) : 'ERROR'}</p>
              </div>
            </div>
          </Link>
        ))}
    </div>
  );
}
