'use server'

import { LandingPageClient } from './LandingPageClient'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { locale } = await params
  const searchParamsData = await searchParams
  
  // LINE認証のコールバックをチェック
  if (searchParamsData['liff.state'] && searchParamsData.code && searchParamsData.state) {
    console.log('[Home] LINE OAuth callback detected')
    console.log('[Home] All search params:', searchParamsData)
    
    // liff.stateから実際のリダイレクト先を抽出
    const liffState = searchParamsData['liff.state'] as string
    console.log('[Home] liff.state:', liffState)
    
    if (liffState.includes('/reservation')) {
      // LINE認証のコールバックを予約ページにリダイレクト
      const redirectPath = `/${locale}/reservation`
      const queryParams = new URLSearchParams({
        state: searchParamsData.state as string,
        code: searchParamsData.code as string,
        liffClientId: searchParamsData.liffClientId as string || '',
        liffRedirectUri: searchParamsData.liffRedirectUri as string || '',
      })
      
      console.log('[Home] Redirecting to:', `${redirectPath}?${queryParams.toString()}`)
      redirect(`${redirectPath}?${queryParams.toString()}`)
    }
  }
  
  const t = await getTranslations({ locale, namespace: 'landing' })

  // Prepare all translations for client component
  const translations = {
    nav: {
      features: t('nav.features'),
      pricing: t('nav.pricing'),
      testimonials: t('nav.testimonials'),
      faq: t('nav.faq'),
      demo: t('nav.demo'),
      signUp: t('nav.signUp'),
      startFreeTrial: t('nav.startFreeTrial'),
    },
    hero: {
      badge: t('hero.badge'),
      title: t('hero.title'),
      titleBreak: t('hero.titleBreak'),
      subtitle: t('hero.subtitle'),
      tagline: t('hero.tagline'),
      cta: {
        demo: t('hero.cta.demo'),
        trial: t('hero.cta.trial'),
        disclaimer: t('hero.cta.disclaimer'),
      },
    },
    features: {
      badge: t('features.badge'),
      title: t('features.title'),
      subtitle: t('features.subtitle'),
      items: {
        smartReservation: {
          title: t('features.items.smartReservation.title'),
          description: t('features.items.smartReservation.description'),
        },
        optimizationAlgorithm: {
          title: t('features.items.optimizationAlgorithm.title'),
          description: t('features.items.optimizationAlgorithm.description'),
        },
        digitalCarte: {
          title: t('features.items.digitalCarte.title'),
          description: t('features.items.digitalCarte.description'),
        },
        allInOne: {
          title: t('features.items.allInOne.title'),
          description: t('features.items.allInOne.description'),
        },
        userFriendly: {
          title: t('features.items.userFriendly.title'),
          description: t('features.items.userFriendly.description'),
        },
        support: {
          title: t('features.items.support.title'),
          description: t('features.items.support.description'),
        },
        marketing: {
          title: t('features.items.marketing.title'),
          description: t('features.items.marketing.description'),
        },
        menuManagement: {
          title: t('features.items.menuManagement.title'),
          description: t('features.items.menuManagement.description'),
        },
        dataAnalytics: {
          title: t('features.items.dataAnalytics.title'),
          description: t('features.items.dataAnalytics.description'),
        },
      },
    },
    howItWorks: {
      title: t('howItWorks.title'),
      subtitle: t('howItWorks.subtitle'),
      steps: {
        register: {
          title: t('howItWorks.steps.register.title'),
          description: t('howItWorks.steps.register.description'),
        },
        setup: {
          title: t('howItWorks.steps.setup.title'),
          description: t('howItWorks.steps.setup.description'),
        },
        start: {
          title: t('howItWorks.steps.start.title'),
          description: t('howItWorks.steps.start.description'),
        },
      },
    },
    pricing: {
      title: t('pricing.title'),
      subtitle: t('pricing.subtitle'),
      disclaimer: t('pricing.disclaimer'),
    },
    testimonials: {
      title: t('testimonials.title'),
      subtitle: t('testimonials.subtitle'),
    },
    cta: {
      title: t('cta.title'),
      titleBreak: t('cta.titleBreak'),
      subtitle: t('cta.subtitle'),
      button: t('cta.button'),
      disclaimer: t('cta.disclaimer'),
    },
    footer: {
      tagline: t('footer.tagline'),
      sections: {
        product: t('footer.sections.product'),
        support: t('footer.sections.support'),
        company: t('footer.sections.company'),
      },
      links: {
        features: t('footer.links.features'),
        pricing: t('footer.links.pricing'),
        demo: t('footer.links.demo'),
        faq: t('footer.links.faq'),
        contact: t('footer.links.contact'),
        helpCenter: t('footer.links.helpCenter'),
        about: t('footer.links.about'),
        privacyPolicy: t('footer.links.privacyPolicy'),
        termsOfUse: t('footer.links.termsOfUse'),
      },
      copyright: t('footer.copyright'),
    },
  }

  // Get subscription translations
  const subscriptionT = await getTranslations({ locale, namespace: 'subscription' })
  const subscriptionTranslations = {
    litePlan: subscriptionT('litePlan'),
    litePlanDescription: subscriptionT('litePlanDescription'),
    proPlan: subscriptionT('proPlan'),
    proPlanDescription: subscriptionT('proPlanDescription'),
    perMonth: subscriptionT('perMonth'),
    startNow: subscriptionT('planAction.startNow'),
    features: {
      lite: Array.from({ length: 8 }, (_, i) => subscriptionT(`features.lite.${i + 1}`)),
      pro: Array.from({ length: 3 }, (_, i) => subscriptionT(`features.pro.${i + 1}`)),
    },
  }

  return (
    <LandingPageClient
      translations={translations}
      subscriptionTranslations={subscriptionTranslations}
      locale={locale}
    />
  )
}