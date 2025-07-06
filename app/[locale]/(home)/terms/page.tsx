import { getTranslations } from 'next-intl/server'
import { TermsPageClient } from './TermsPageClient'

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'termsPage' })

  const translations = {
    title: t('title'),
    lastUpdated: t('lastUpdated'),
    sections: Array.from({ length: 10 }, (_, i) => ({
      title: t(`sections.${i}.title`),
      content: t(`sections.${i}.content`),
    })),
  }

  return <TermsPageClient translations={translations} />
}
