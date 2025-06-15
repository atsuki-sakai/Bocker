'use server'

import { getTranslations } from 'next-intl/server'
import { AboutPageClient } from './AboutPageClient'

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'aboutPage' })

  const translations = {
    title: t('title'),
    subtitle: t('subtitle'),
    mission: {
      title: t('mission.title'),
      description: t('mission.description'),
      values: Array.from({ length: 3 }, (_, i) => ({
        title: t(`mission.values.${i}.title`),
        description: t(`mission.values.${i}.description`),
      })),
    },
    team: {
      title: t('team.title'),
      description: t('team.description'),
    },
    achievements: {
      title: t('achievements.title'),
      items: Array.from({ length: 4 }, (_, i) => ({
        value: t(`achievements.items.${i}.value`),
        label: t(`achievements.items.${i}.label`),
      })),
    },
    story: {
      title: t('story.title'),
      content: Array.from({ length: 3 }, (_, i) => t(`story.content.${i}`)),
    },
    cta: {
      title: t('cta.title'),
      subtitle: t('cta.subtitle'),
      button: t('cta.button'),
    },
  }

  return <AboutPageClient translations={translations} />
}