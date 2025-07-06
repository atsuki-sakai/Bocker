'use client'

import { useTranslations } from 'next-intl'
import { CTASection } from '../_components/CTASection'
import Image from 'next/image'
import { TeamSection } from '../_components/TeamSection'

export function AboutPageClient() {
  const t = useTranslations('aboutPage')

  const story = [
    {
      title: t('story.content.0.title'),
      description: t('story.content.0.description'),
    },
    {
      title: t('story.content.1.title'),
      description: t('story.content.1.description'),
    },

    {
      title: t('story.content.2.title'),
      description: t('story.content.2.description'),
    },
    {
      title: t('story.content.3.title'),
      description: t('story.content.3.description'),
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Our Story */}
      <section>
        <div className="bg-background py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
              <p className="text-base/7 font-semibold text-link-foreground">{t('subtitle')}</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-primary sm:text-5xl">
                {t('story.title')}
              </h1>
              <div className="mt-10 grid max-w-xl grid-cols-1 gap-8 text-base/7 text-primary lg:max-w-none lg:grid-cols-2">
                <div>
                  <p className="text-2xl font-bold">{story[0].title}</p>
                  <p className="mt-8 text-sm text-muted-foreground">{story[0].description}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{story[1].title}</p>
                  <p className="mt-8 text-sm text-muted-foreground">{story[1].description}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{story[2].title}</p>
                  <p className="mt-8 text-sm text-muted-foreground">{story[2].description}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{story[3].title}</p>
                  <p className="mt-8 text-sm text-muted-foreground">{story[3].description}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden pt-16 lg:pt-20">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <Image
                width={1000}
                height={1000}
                alt=""
                src="/assets/mockup/pc/dashboard.png"
                className="mb-[-12%] rounded-xl shadow-2xl ring-1 ring-border"
              />
              <div aria-hidden="true" className="relative">
                <div className="absolute -inset-x-20 bottom-0 bg-linear-to-t from-background pt-[7%]" />
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Team Section */}
      <TeamSection />

      {/* CTA Section */}
      <CTASection />
    </div>
  )
}
