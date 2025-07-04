'use client'

import ReferralCard from '@/components/common/ReferralCard'
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
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { LinkList } from '@/components/common/LinkList'

function SettingPage() {
  const t = useTranslations('settings')
  const [currentTab, setCurrentTab] = useState('basic')

  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab}>
      <div className="overflow-x-scroll">
        <TabsList className="flex w-fit gap-2 mb-6">
          <TabsTrigger value="basic">{t('organizationSettings')}</TabsTrigger>
          <TabsTrigger value="api">{t('apiSettings')}</TabsTrigger>
          <TabsTrigger value="reservation-setting">{t('reservationSettings')}</TabsTrigger>
          <TabsTrigger value="week-schedule">{t('businessHours.title')}</TabsTrigger>
          <TabsTrigger value="exception-schedule">{t('specialHolidays')}</TabsTrigger>
          <TabsTrigger value="payment">{t('paymentSettings')}</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="basic">
        <Accordion type="single" collapsible className="mb-4">
          <AccordionItem value="referral">
            <AccordionTrigger>
              <p className="text-sm font-bold text-accent-2">
                友達紹介で特典ゲット！最大2,4000円お得
              </p>
            </AccordionTrigger>
            <AccordionContent>
              <ReferralCard />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <OrgConfigForm />
      </TabsContent>
      <TabsContent value="api">
        <OrgApiConfigForm />
      </TabsContent>
      <TabsContent value="reservation-setting">
        <LinkList />
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
