'use client'

import { LifebuoyIcon, PhoneIcon } from '@heroicons/react/20/solid'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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
    <motion.div
      data-id="header-section"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
      viewport={{ once: true, amount: 0.2 }}
      className="relative isolate overflow-hidden bg-background py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            viewport={{ once: true, amount: 0.2 }}
            className="text-2xl font-bold tracking-tight  sm:text-5xl text-nowrap"
          >
            {t('title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
            viewport={{ once: true, amount: 0.2 }}
            className="mt-8 text-sm md:text-base font-medium text-pretty sm:text-lg"
          >
            {t('description')}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
            viewport={{ once: true, amount: 0.2 }}
            className="mt-8"
          >
            <Link href="/contact">
              <Button size="lg" className="w-full text-lg font-bold">
                {t('cards.contact.title')}
              </Button>
            </Link>
          </motion.div>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-8">
          {cards.map((card, index) => (
            <motion.div
              key={card.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.5 + index * 0.1 }}
              viewport={{ once: true, amount: 0.2 }}
              className="flex gap-x-4 rounded-xl bg-background p-6 inset-ring inset-ring-white/5 backdrop-blur-sm"
            >
              <card.icon aria-hidden="true" className="h-7 w-5 flex-none text-neon" />
              <div className="text-base/7">
                <h3 className="font-semibold text-sm md:text-base">{card.name}</h3>
                <p className="mt-2 text-muted-foreground text-xs md:text-sm">{card.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
