'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Loading } from '@/components/common';
import { DashboardSection } from '@/components/common';

export default function ReservationPage() {
  const { reservation_id } = useParams();

  const reservation = useQuery(api.reservation.query.getById, {
    reservationId: reservation_id as Id<'reservation'>,
  });

  if (!reservation) return <Loading />;

  return (
    <DashboardSection
      title="予約詳細"
      backLink="/dashboard/reservation"
      backLinkTitle="予約一覧に戻る"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{reservation.status}</h1>
          <p className="text-sm text-gray-500">{reservation.staffName}</p>
          <p className="text-sm text-gray-500">
            {
              new Date(reservation.startTime_unix! * 1000 - 9 * 60 * 60 * 1000)
                .toLocaleString()
                .split(' ')[1]
            }
          </p>
          <p className="text-sm text-gray-500">
            {
              new Date(reservation.endTime_unix! * 1000 - 9 * 60 * 60 * 1000)
                .toLocaleString()
                .split(' ')[1]
            }
          </p>
          <p className="text-sm text-gray-500">¥{reservation?.totalPrice?.toLocaleString()}</p>
          <p className="text-sm text-gray-500">{reservation?.notes}</p>
          <p className="text-sm text-gray-500">{reservation?.paymentMethod}</p>
        </div>
      </div>
    </DashboardSection>
  );
}
