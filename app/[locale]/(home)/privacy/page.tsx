'use server'

import { getTranslations } from 'next-intl/server'
import { PrivacyPageClient } from './PrivacyPageClient'

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacyPage' })

  const translations = {
    title: t('title'),
    lastUpdated: t('lastUpdated'),
    sections: Array.from({ length: 8 }, (_, i) => ({
      title: t(`sections.${i}.title`),
      content: t(`sections.${i}.content`),
    })),
  }

  return <PrivacyPageClient translations={translations} />
}