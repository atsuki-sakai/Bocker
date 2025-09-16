'use client'

import { Button } from '@/components/ui/button'
import { Loading } from '@/components/common'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { useLocale, useTranslations } from 'next-intl'

export const LinkList = () => {
  const { orgId, ready } = useTenantAndOrganization()
  const t = useTranslations('common.tutorial')
  const locale = useLocale()

  const getOrganizationUrl = (type: 'reservation' | 'customer') => {
    if (!orgId) return ''
    if (type === 'reservation') {
      return `${window.location.origin}/${locale}/reservation/${orgId}`
    } else if (type === 'customer') {
      return `${window.location.origin}/${locale}/customer/${orgId}/auth/login`
    } else {
      return ''
    }
  }

  const copyOrganizationUrl = (type: 'reservation' | 'customer') => {
    const url = getOrganizationUrl(type)
    navigator.clipboard.writeText(url)
    toast.success(t('urlCopied'))
  }

  if (!ready) {
    return <Loading />
  }

  return (
    <div className="my-4 space-y-2 ">
      <p className="text-sm font-medium text-neon">
        以下のリンクをお客様に共有して予約の受付を開始してください
      </p>
      <div className="p-2 bg-muted rounded-lg border border-border ">
        <label className="text-sm font-medium">{t('completion.reservationUrlLabel')}</label>
        <div className="flex items-center gap-2 mt-2">
          <input
            value={getOrganizationUrl('reservation')}
            readOnly
            className="flex h-9 w-full rounded-md border bg-background text-foreground px-3 py-1 text-sm font-mono focus:outline-none"
          />
          <Button size="icon" variant="outline" onClick={() => copyOrganizationUrl('reservation')}>
            <Copy className="h-4 w-4 hover:text-foreground" />
          </Button>
          <Button size="icon" variant="outline" asChild>
            <a href={getOrganizationUrl('reservation')} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 hover:text-foreground" />
            </a>
          </Button>
        </div>
      </div>
      <div className="p-2 bg-muted rounded-lg border border-border">
        <label className="text-sm font-medium">{t('completion.customerUrlLabel')}</label>
        <div className="flex items-center gap-2 mt-2">
          <input
            value={getOrganizationUrl('customer')}
            readOnly
            className="flex h-9 w-full rounded-md border bg-background text-foreground px-3 py-1 text-sm font-mono focus:outline-none"
          />
          <Button size="icon" variant="outline" onClick={() => copyOrganizationUrl('customer')}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" asChild>
            <a href={getOrganizationUrl('customer')} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 hover:text-foreground" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
