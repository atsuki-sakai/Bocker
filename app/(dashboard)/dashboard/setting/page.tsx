'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'
import OrgConfigForm from './_components/OrgConfigForm'
import OrgApiConfigForm from './_components/OrgApiConfigForm'
import OrgReservationConfigForm from './_components/OrgReservationConfigForm'
import OrgExceptionScheduleForm from './_components/OrgExceptionScheduleForm'
import OrgStripeConnectStatus from './_components/OrgStripeConnectStatus'
import OrgWeekHourSchedule from './_components/OrgWeekHourSchedule'

export default function SettingPage() {
  const [currentTab, setCurrentTab] = useState('basic')

  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab}>
      <div className="overflow-x-scroll">
        <TabsList className="flex w-fit gap-2 mb-6">
          <TabsTrigger value="basic">基本設定</TabsTrigger>
          <TabsTrigger value="api">外部サービス連携</TabsTrigger>
          <TabsTrigger value="reservation-setting">予約受付設定</TabsTrigger>
          <TabsTrigger value="week-schedule">営業日設定</TabsTrigger>
          <TabsTrigger value="exception-schedule">休業日設定</TabsTrigger>
          <TabsTrigger value="payment">決済設定</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="basic">
        <OrgConfigForm />
      </TabsContent>
      <TabsContent value="api">
        <OrgApiConfigForm />
      </TabsContent>
      <TabsContent value="reservation-setting">
        <OrgReservationConfigForm />
      </TabsContent>
      <TabsContent value="week-schedule">
        <OrgWeekHourSchedule />
      </TabsContent>
      <TabsContent value="exception-schedule">
        <OrgExceptionScheduleForm />
      </TabsContent>
      <TabsContent value="payment">
        <OrgStripeConnectStatus />
      </TabsContent>
    </Tabs>
  )
}
