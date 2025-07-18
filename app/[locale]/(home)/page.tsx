'use server'

import { LandingPageClient } from './LandingPageClient'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo' })
  
  const title = t('meta.title')
  const description = t('meta.description')
  const keywords = t('meta.keywords')
  const siteName = t('meta.siteName')
  const ogTitle = t('ogp.title')
  const ogDescription = t('ogp.description')
  const ogImageAlt = t('ogp.imageAlt')
  const twitterTitle = t('twitter.title')
  const twitterDescription = t('twitter.description')
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bocker.jp'
  const ogImage = `${baseUrl}/opengraph-image`
  
  return {
    title,
    description,
    keywords,
    authors: [{ name: 'Bocker Team' }],
    creator: 'Bocker',
    publisher: 'Bocker',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: locale === 'ja' ? '/' : `/${locale}/`,
      languages: {
        'ja-JP': '/',
        'en-US': '/en/',
      },
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: 'website',
      url: locale === 'ja' ? '/' : `/${locale}/`,
      siteName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
      locale: locale === 'ja' ? 'ja_JP' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: twitterTitle,
      description: twitterDescription,
      images: [ogImage],
      creator: '@bocker_jp',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || '',
    },
  }
}

// 構造化データをServer Componentで生成
async function generateStructuredData(locale: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bocker.jp'
  const t = await getTranslations({ locale, namespace: 'seo' })
  
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: t('structuredData.organization.name'),
    alternateName: t('structuredData.organization.alternateName'),
    url: baseUrl,
    logo: `${baseUrl}/assets/images/logo.png`,
    description: t('structuredData.organization.description'),
    foundingDate: '2024',
    industry: 'Software as a Service (SaaS)',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'JP',
      addressLocality: t('structuredData.organization.address.locality'),
      addressRegion: t('structuredData.organization.address.region'),
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@bocker.jp',
      url: `${baseUrl}/contact`,
    },
    sameAs: [
      'https://twitter.com/bocker_jp',
    ],
  }

  const softwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: t('structuredData.application.name'),
    description: t('structuredData.application.description'),
    url: baseUrl,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web-based',
    offers: [
      {
        '@type': 'Offer',
        name: t('structuredData.application.offers.lite.name'),
        description: t('structuredData.application.offers.lite.description'),
        price: '6000',
        priceCurrency: 'JPY',
        priceValidUntil: '2025-12-31',
        availability: 'https://schema.org/InStock',
        validFrom: '2024-01-01',
        category: 'monthly subscription',
      },
      {
        '@type': 'Offer',
        name: t('structuredData.application.offers.pro.name'),
        description: t('structuredData.application.offers.pro.description'),
        price: '10000',
        priceCurrency: 'JPY',
        priceValidUntil: '2025-12-31',
        availability: 'https://schema.org/InStock',
        validFrom: '2024-01-01',
        category: 'monthly subscription',
      },
    ],
    creator: {
      '@type': 'Organization',
      name: 'Bocker Team',
    },
    datePublished: '2024-01-01',
    dateModified: new Date().toISOString().split('T')[0],
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: t('structuredData.website.name'),
    description: t('structuredData.website.description'),
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Bocker Team',
    },
    inLanguage: locale === 'ja' ? 'ja-JP' : 'en-US',
  }

  return [organizationSchema, softwareApplicationSchema, websiteSchema]
}

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
        liffClientId: (searchParamsData.liffClientId as string) || '',
        liffRedirectUri: (searchParamsData.liffRedirectUri as string) || '',
      })

      console.log('[Home] Redirecting to:', `${redirectPath}?${queryParams.toString()}`)
      redirect(`${redirectPath}?${queryParams.toString()}`)
    }
  }

  // 構造化データを生成
  const structuredData = await generateStructuredData(locale)

  return (
    <>
      {/* Server-side構造化データ */}
      {structuredData.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema),
          }}
        />
      ))}
      <LandingPageClient locale={locale} />
    </>
  )
}