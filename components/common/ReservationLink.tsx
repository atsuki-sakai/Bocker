'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { Loading } from '@/components/common'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { CopyIcon } from 'lucide-react'
import { BASE_URL } from '@/lib/constants'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { TRACKING_CODE_VALUES, TrackingCode } from '@/convex/types'

export default function ReservationLink() {
  const t = useTranslations('reservationLink')
  const { tenantId, orgId } = useTenantAndOrganization()
  const [selectedTrackingType, setSelectedTrackingType] = useState<TrackingCode>('web')
  const apiConfig = useQuery(
    api.organization.api_config.query.findByTenantAndOrg,
    tenantId && orgId ? { tenant_id: tenantId, org_id: orgId } : 'skip'
  )

  if (!tenantId || !orgId || apiConfig === undefined) {
    return <Loading />
  }

  return (
    <div>
      {apiConfig &&
      apiConfig?.liff_id &&
      apiConfig?.line_channel_secret &&
      apiConfig?.line_access_token ? (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Select
              value={selectedTrackingType}
              onValueChange={(value) => setSelectedTrackingType(value as TrackingCode)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectLinkDestination')} />
              </SelectTrigger>
              <SelectContent>
                {TRACKING_CODE_VALUES.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${BASE_URL}/reservation/${orgId}/?code=${selectedTrackingType}`
                )
              }}
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
          </div>

          <a
            className="text-sm text-link-foreground truncate"
            href={`${BASE_URL}/reservation/${orgId}/?code=${selectedTrackingType}`}
          >{`${BASE_URL}/reservation/${orgId}/?code=${selectedTrackingType}`}</a>
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>
                <p className="text-primary">{t('aboutReservationLink')}</p>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm tracking-normal leading-7 bg-muted rounded-md p-2">
                <p className="mb-2">
                  {t('trackingDescription')}
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <strong>LINE</strong>:
                    {t('lineDescription')}
                  </li>
                  <li>
                    <strong>Web</strong>:
                    {t('webDescription')}
                  </li>
                  <li>
                    <strong>Instagram</strong>:
                    {t('instagramDescription')}
                  </li>
                  <li>
                    <strong>X (Twitter)</strong>:
                    {t('twitterDescription')}
                  </li>
                  <li>
                    <strong>Facebook</strong>:
                    {t('facebookDescription')}
                  </li>
                  <li>
                    <strong>YouTube</strong>:
                    {t('youtubeDescription')}
                  </li>
                  <li>
                    <strong>Tiktok</strong>:
                    {t('tiktokDescription')}
                  </li>
                  <li>
                    <strong>GoogleMap</strong>:
                    {t('googleMapDescription')}
                  </li>
                </ul>
                <p className="mt-2">
                  {t('copyInstruction')}
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-base font-bold text-primary">{t('lineConnectionRequired')}</p>
          <span className="text-sm text-muted-foreground">
            {t('lineConnectionDescription')}
          </span>
          <Link href={`${BASE_URL}/dashboard/setting`}>
            <Button>{t('connectWithLine')}</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
