'use server'

import { getTranslations } from 'next-intl/server'
import { ContactPageClient } from './ContactPageClient'

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contactPage' })

  const translations = {
    title: t('title'),
    subtitle: t('subtitle'),
    form: {
      title: t('form.title'),
      fields: {
        name: t('form.fields.name'),
        email: t('form.fields.email'),
        company: t('form.fields.company'),
        phone: t('form.fields.phone'),
        subject: t('form.fields.subject'),
        message: t('form.fields.message'),
      },
      placeholders: {
        name: t('form.placeholders.name'),
        email: t('form.placeholders.email'),
        company: t('form.placeholders.company'),
        phone: t('form.placeholders.phone'),
        subject: t('form.placeholders.subject'),
        message: t('form.placeholders.message'),
      },
      submit: t('form.submit'),
      submitting: t('form.submitting'),
      success: t('form.success'),
      error: t('form.error'),
    },
    info: {
      title: t('info.title'),
      items: {
        email: {
          label: t('info.items.email.label'),
          value: t('info.items.email.value'),
        },
        hours: {
          label: t('info.items.hours.label'),
          value: t('info.items.hours.value'),
        },
        response: {
          label: t('info.items.response.label'),
          value: t('info.items.response.value'),
        },
      },
    },
    faq: {
      title: t('faq.title'),
      cta: t('faq.cta'),
    },
  }

  return <ContactPageClient translations={translations} />
}