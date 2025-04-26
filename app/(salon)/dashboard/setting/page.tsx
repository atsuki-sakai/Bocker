'use client';

import { useSalon } from '@/hooks/useSalon';
import { Loading } from '@/components/common';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import SalonConfigForm from './_components/SalonConfigForm';
import SalonApiConfigForm from './_components/SalonApiConfigForm';
import SalonScheduleForm from './_components/SalonScheduleForm';
import WeekHourSchedule from './_components/WeekHourSchedule';
import SalonExceptionScheduleForm from './_components/SalonExceptionScheduleForm';
import StripeConnectStatus from './_components/StripeConnectStatus';

export default function SettingPage() {
  const { salonId } = useSalon();
  const [currentTab, setCurrentTab] = useState('basic');
  if (!salonId) {
    return <Loading />;
  }

  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab}>
      <TabsList className="flex flex-wrap justify-start h-auto w-fit gap-2 p-2 mb-6">
        <TabsTrigger value="basic">基本設定</TabsTrigger>
        <TabsTrigger value="api">外部サービス連携</TabsTrigger>
        <TabsTrigger value="reservation-setting">予約受付設定</TabsTrigger>
        <TabsTrigger value="week-schedule">営業日設定</TabsTrigger>
        <TabsTrigger value="exception-schedule">休業日設定</TabsTrigger>
        <TabsTrigger value="payment">決済設定</TabsTrigger>
      </TabsList>

      <TabsContent value="basic">
        <SalonConfigForm />
      </TabsContent>
      <TabsContent value="api">
        <SalonApiConfigForm />
      </TabsContent>
      <TabsContent value="reservation-setting">
        <SalonScheduleForm />
      </TabsContent>
      <TabsContent value="week-schedule">
        <WeekHourSchedule />
      </TabsContent>
      <TabsContent value="exception-schedule">
        <SalonExceptionScheduleForm />
      </TabsContent>
      <TabsContent value="payment">
        <StripeConnectStatus />
      </TabsContent>
    </Tabs>
  );
}
