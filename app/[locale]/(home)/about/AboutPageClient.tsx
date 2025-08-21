'use client'

import { useTranslations } from 'next-intl'
import { CTASection } from '../_components/CTASection'
import Image from 'next/image'
// import { TeamSection } from '../_components/TeamSection'
import { motion } from 'framer-motion'
import { Header } from '../_components/Header'
import { Footer } from '../_components/Footer'

export function AboutPageClient() {
  const t = useTranslations('aboutPage')

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  }

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
    <>
      <Header />
      <div className="min-h-screen bg-background">
        {/* Our Story */}
        <section>
          <div className="bg-background py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
                <motion.p
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  className="text-base/7 font-semibold text-link-foreground"
                >
                  {t('subtitle')}
                </motion.p>
                <motion.h1
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-primary sm:text-5xl"
                >
                  {t('story.title')}
                </motion.h1>
                <motion.div
                  className="mt-10 grid max-w-xl grid-cols-1 gap-8 text-base/7 text-primary lg:max-w-none lg:grid-cols-2"
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  {story.map((item, index) => (
                    <motion.div key={index}>
                      <p className="text-2xl font-bold">{item.title}</p>
                      <p className="mt-8 text-sm text-muted-foreground">{item.description}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
            <div className="relative overflow-hidden pt-16 lg:pt-20">
              <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                >
                  <Image
                    width={1000}
                    height={1000}
                    alt=""
                    src="/assets/mockup/pc/dashboard.png"
                    className="mb-[-12%] rounded-xl shadow-2xl ring-1 ring-border"
                  />
                </motion.div>
                <div aria-hidden="true" className="relative">
                  <div className="absolute -inset-x-20 bottom-0 bg-linear-to-t from-background pt-[7%]" />
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Team Section */}
        {/* <TeamSection /> */}

        {/* CTA Section */}
        <CTASection />
      </div>
      <Footer />
    </>
  )
}
