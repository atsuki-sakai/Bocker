'use client'

import { CloudArrowUpIcon, LockClosedIcon, ServerIcon } from '@heroicons/react/20/solid'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, when: 'beforeChildren' },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

const imageVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

export function ContentSection() {
  const t = useTranslations('landing.content')
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
      className="relative isolate overflow-hidden bg-background px-6 py-24 sm:py-32 lg:overflow-visible lg:px-0"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-start lg:gap-y-10">
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:mx-auto lg:grid lg:w-full lg:max-w-7xl lg:grid-cols-2 lg:gap-x-8 lg:px-8">
          <div className="lg:pr-4">
            <motion.div className="lg:max-w-lg" variants={containerVariants}>
              <motion.p className="text-base/7 font-semibold text-link">{t('tagline')}</motion.p>
              <motion.h1
                className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-foreground sm:text-5xl"
                variants={itemVariants}
              >
                {t('title')}
              </motion.h1>
              <motion.p
                className="mt-6 text-base md:text-lg text-muted-foreground"
                variants={itemVariants}
              >
                {t('mainDescription')}
              </motion.p>
            </motion.div>
          </div>
        </div>
        <motion.div
          className="-mt-12 -ml-12 p-12 lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:overflow-hidden"
          variants={imageVariants}
        >
          <Image
            alt=""
            src="/assets/mockup/pc/dashboard.png"
            width={1000}
            height={1000}
            className="w-3xl max-w-none rounded-xl bg-foreground shadow-xl ring-1 ring-border sm:w-228"
          />
        </motion.div>
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:mx-auto lg:grid lg:w-full lg:max-w-7xl lg:grid-cols-2 lg:gap-x-8 lg:px-8">
          <div className="lg:pr-4">
            <motion.div
              className="max-w-xl text-base/7 text-foreground lg:max-w-lg"
              variants={containerVariants}
            >
              <motion.p variants={itemVariants}>{t('industryProblem')}</motion.p>
              <motion.ul
                role="list"
                className="mt-8 space-y-8 text-foreground"
                variants={containerVariants}
              >
                <motion.li className="flex gap-x-3" variants={itemVariants}>
                  <CloudArrowUpIcon
                    aria-hidden="true"
                    className="mt-1 size-5 flex-none text-link-foreground"
                  />
                  <span className="text-primary">
                    <strong className="font-semibold ">{t('benefits.sales.title')}</strong>{' '}
                    {t('benefits.sales.description')}
                  </span>
                </motion.li>
                <motion.li className="flex gap-x-3" variants={itemVariants}>
                  <LockClosedIcon
                    aria-hidden="true"
                    className="mt-1 size-5 flex-none text-link-foreground"
                  />
                  <span className="text-primary">
                    <strong className="font-semibold ">{t('benefits.mistakes.title')}</strong>{' '}
                    {t('benefits.mistakes.description')}
                  </span>
                </motion.li>
                <motion.li className="flex gap-x-3" variants={itemVariants}>
                  <ServerIcon
                    aria-hidden="true"
                    className="mt-1 size-5 flex-none text-link-foreground"
                  />
                  <span className="text-primary">
                    <strong className="font-semibold ">{t('benefits.efficiency.title')}</strong>{' '}
                    {t('benefits.efficiency.description')}
                  </span>
                </motion.li>
              </motion.ul>
              <motion.p className="mt-8 text-muted-foreground" variants={itemVariants}>
                {t('averageResults')}
              </motion.p>
              <motion.h2
                className="mt-16 text-2xl font-bold tracking-tight text-primary"
                variants={itemVariants}
              >
                {t('roi.title')}
              </motion.h2>
              <motion.p className="mt-6 text-muted-foreground" variants={itemVariants}>
                {t('roi.description')}
              </motion.p>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
