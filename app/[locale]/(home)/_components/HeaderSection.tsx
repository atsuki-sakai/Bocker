'use client'

import { LifebuoyIcon, PhoneIcon } from '@heroicons/react/20/solid'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
export function HeaderSection() {
  const t = useTranslations('landing.headerSection')
  const cards = [
    {
      name: t('cards.contact.title'),
      description: t('cards.contact.description'),
      icon: PhoneIcon,
    },
    {
      name: t('cards.support.title'),
      description: t('cards.support.description'),
      icon: LifebuoyIcon,
    },
  ]

  return (
    <div className="relative isolate overflow-hidden bg-background py-24 sm:py-32">
      <Image
        alt=""
        width={1920}
        height={1080}
        src="/assets/images/salon-bg.jpg"
        className="absolute inset-0 blur-md opacity-50 -z-10 size-full object-cover object-right md:object-center"
      />
      <div className="hidden sm:absolute sm:-top-10 sm:right-1/2 sm:-z-10 sm:mr-10 sm:block sm:transform-gpu sm:blur-3xl">
        <div
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
          className="aspect-1097/845 w-274.25 bg-background opacity-20"
        />
      </div>
      <div className="absolute -top-52 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl sm:top-[-28rem] sm:ml-16 sm:translate-x-0 sm:transform-gpu">
        <div
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
          className="aspect-1097/845 w-274.25 bg-background opacity-20"
        />
      </div>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-2xl font-bold tracking-tight text-primary sm:text-5xl text-nowrap">
            {t('title')}
          </h2>
          <p className="mt-8 text-sm md:text-base font-medium text-pretty text-primary sm:text-lg">
            {t('description')}
          </p>
          <div className="mt-8">
            <Link
              href="/contact"
              className="rounded-md bg-background border border-neon px-8 py-2 text-sm font-semibold text-neon shadow-xs hover:bg-neon-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link-foreground"
            >
              {t('cards.contact.title')}
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-8">
          {cards.map((card) => (
            <div
              key={card.name}
              className="flex gap-x-4 rounded-xl bg-background p-6 inset-ring inset-ring-white/5 backdrop-blur-sm"
            >
              <card.icon aria-hidden="true" className="h-7 w-5 flex-none text-neon" />
              <div className="text-base/7">
                <h3 className="font-semibold text-sm md:text-base">{card.name}</h3>
                <p className="mt-2 text-muted-foreground text-sm md:text-base">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
