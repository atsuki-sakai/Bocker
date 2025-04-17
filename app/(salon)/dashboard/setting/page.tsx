'use client';

import { useSalon } from '@/hooks/useSalon';
import { DashboardSection, Loading } from '@/components/common';
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
    <DashboardSection title="設定" backLink="/dashboard" backLinkTitle="ダッシュボードに戻る">
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="flex flex-wrap justify-start h-auto w-fit gap-2 p-2 mb-2">
          <TabsTrigger
            value="basic"
            className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300"
          >
            基本設定
          </TabsTrigger>
          <TabsTrigger
            value="api"
            className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300"
          >
            API設定
          </TabsTrigger>
          <TabsTrigger
            value="reservation-setting"
            className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300"
          >
            予約設定
          </TabsTrigger>
          <TabsTrigger
            value="week-schedule"
            className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300"
          >
            営業日設定
          </TabsTrigger>
          <TabsTrigger
            value="exception-schedule"
            className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300"
          >
            休業日設定
          </TabsTrigger>
          <TabsTrigger
            value="payment"
            className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300"
          >
            決済設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-0">
          <SalonConfigForm />
        </TabsContent>
        <TabsContent value="api" className="mt-0">
          <SalonApiConfigForm />
        </TabsContent>
        <TabsContent value="reservation-setting" className="mt-0">
          <SalonScheduleForm />
        </TabsContent>
        <TabsContent value="week-schedule" className="mt-0">
          <WeekHourSchedule />
        </TabsContent>
        <TabsContent value="exception-schedule" className="mt-0">
          <SalonExceptionScheduleForm />
        </TabsContent>
        <TabsContent value="payment" className="mt-0">
          <StripeConnectStatus />
        </TabsContent>
      </Tabs>
    </DashboardSection>
  );
}
