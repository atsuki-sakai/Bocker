'use client';

import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useSalon } from '@/hooks/useSalon';

export default function DashboardPage() {
  const { salonId } = useSalon();
  const referral = useQuery(
    api.salon.referral.query.findBySalonId,
    salonId
      ? {
          salonId: salonId,
        }
      : 'skip'
  );
  return (
    <div>
      <h1>Dashboard</h1>
      <br />
      <p>招待コード: {referral?.referralCode}</p>
    </div>
  );
}
