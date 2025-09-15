'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

export function CTASection() {
  const t = useTranslations('landing.cta')
  return (
    <motion.div
      data-testid="cta-section"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
      viewport={{ once: true, amount: 0.2 }}
      className=""
    >
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:flex lg:items-center lg:justify-between lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          viewport={{ once: true, amount: 0.2 }}
          className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl"
        >
          {t('title')}
          <br />
          {t('title2')}
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
          viewport={{ once: true, amount: 0.2 }}
          className="mt-10 flex items-center gap-x-6 lg:mt-0 lg:shrink-0"
        >
          <Link
            href="/sign-up"
            role="button"
            className="rounded-md  bg-primary text-primary-foreground  px-3.5 py-2.5 text-sm font-semibold  shadow-xs hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link-foreground"
          >
            {' '}
            {t('button')}
          </Link>
          <Link href="/features" className="text-sm/6 font-semibold">
            {t('button2')}
            <span aria-hidden="true">→</span>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}
