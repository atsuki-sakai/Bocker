import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bocker.jp'
  const currentDate = new Date()
  
  const staticPages = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 1,
      alternates: {
        languages: {
          ja: baseUrl,
          en: `${baseUrl}/en`,
        },
      },
    },
    {
      url: `${baseUrl}/en`,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    // 認証関連ページ
    {
      url: `${baseUrl}/sign-up`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      alternates: {
        languages: {
          ja: `${baseUrl}/sign-up`,
          en: `${baseUrl}/en/sign-up`,
        },
      },
    },
    {
      url: `${baseUrl}/en/sign-up`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      alternates: {
        languages: {
          ja: `${baseUrl}/sign-in`,
          en: `${baseUrl}/en/sign-in`,
        },
      },
    },
    {
      url: `${baseUrl}/en/sign-in`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    // メインコンテンツページ
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      alternates: {
        languages: {
          ja: `${baseUrl}/about`,
          en: `${baseUrl}/en/about`,
        },
      },
    },
    {
      url: `${baseUrl}/en/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
      alternates: {
        languages: {
          ja: `${baseUrl}/features`,
          en: `${baseUrl}/en/features`,
        },
      },
    },
    {
      url: `${baseUrl}/en/features`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
      alternates: {
        languages: {
          ja: `${baseUrl}/pricing`,
          en: `${baseUrl}/en/pricing`,
        },
      },
    },
    {
      url: `${baseUrl}/en/pricing`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      alternates: {
        languages: {
          ja: `${baseUrl}/contact`,
          en: `${baseUrl}/en/contact`,
        },
      },
    },
    {
      url: `${baseUrl}/en/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      alternates: {
        languages: {
          ja: `${baseUrl}/faq`,
          en: `${baseUrl}/en/faq`,
        },
      },
    },
    {
      url: `${baseUrl}/en/faq`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    // 法的ページ
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'yearly' as const,
      priority: 0.5,
      alternates: {
        languages: {
          ja: `${baseUrl}/privacy`,
          en: `${baseUrl}/en/privacy`,
        },
      },
    },
    {
      url: `${baseUrl}/en/privacy`,
      lastModified: currentDate,
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'yearly' as const,
      priority: 0.5,
      alternates: {
        languages: {
          ja: `${baseUrl}/terms`,
          en: `${baseUrl}/en/terms`,
        },
      },
    },
    {
      url: `${baseUrl}/en/terms`,
      lastModified: currentDate,
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    },
  ]

  return staticPages
}