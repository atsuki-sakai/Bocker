'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'
import { withOwnerAccess } from '@/components/common'
import { useTranslations } from 'next-intl'
import OrgConfigForm from './_components/OrgConfigForm'
import OrgApiConfigForm from './_components/OrgApiConfigForm'
import OrgReservationConfigForm from './_components/OrgReservationConfigForm'
import OrgExceptionScheduleForm from './_components/OrgExceptionScheduleForm'
import OrgStripeConnectStatus from './_components/OrgStripeConnectStatus'
import OrgWeekHourSchedule from './_components/OrgWeekHourSchedule'

function SettingPage() {
  const t = useTranslations('settings.tabs')
  const [currentTab, setCurrentTab] = useState('basic')

  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab}>
      <div className="overflow-x-scroll">
        <TabsList className="flex w-fit gap-2 mb-6">
          <TabsTrigger value="basic">{t('basic')}</TabsTrigger>
          <TabsTrigger value="api">{t('api')}</TabsTrigger>
          <TabsTrigger value="reservation-setting">{t('reservationSetting')}</TabsTrigger>
          <TabsTrigger value="week-schedule">{t('weekSchedule')}</TabsTrigger>
          <TabsTrigger value="exception-schedule">{t('exceptionSchedule')}</TabsTrigger>
          <TabsTrigger value="payment">{t('payment')}</TabsTrigger>
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

export default withOwnerAccess(SettingPage);
