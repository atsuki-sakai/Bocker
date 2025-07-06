'use client'

import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'

export function HeroSection() {
  const t = useTranslations('landing.hero')

  return (
    <div className="bg-background">
      <div className="relative isolate">
        <svg
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-256 w-full mask-[radial-gradient(32rem_32rem_at_center,white,transparent)] stroke-border"
        >
          <defs>
            <pattern
              x="50%"
              y={-1}
              id="1f932ae7-37de-4c0a-a8b0-a6e3b4d44b84"
              width={200}
              height={200}
              patternUnits="userSpaceOnUse"
            >
              <path d="M.5 200V.5H200" fill="none" />
            </pattern>
          </defs>
          <svg x="50%" y={-1} className="overflow-visible fill-background">
            <path
              d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
              strokeWidth={0}
            />
          </svg>
          <rect
            fill="url(#1f932ae7-37de-4c0a-a8b0-a6e3b4d44b84)"
            width="100%"
            height="100%"
            strokeWidth={0}
          />
        </svg>
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 left-1/2 -z-10 -ml-24 transform-gpu overflow-hidden blur-3xl lg:ml-24 xl:ml-48"
        >
          <div
            style={{
              clipPath:
                'polygon(63.1% 29.5%, 100% 17.1%, 76.6% 3%, 48.4% 0%, 44.6% 4.7%, 54.5% 25.3%, 59.8% 49%, 55.2% 57.8%, 44.4% 57.2%, 27.8% 47.9%, 35.1% 81.5%, 0% 97.7%, 39.2% 100%, 35.2% 81.4%, 97.2% 52.8%, 63.1% 29.5%)',
            }}
            className="aspect-801/1036 w-200.25 bg-linear-to-tr from-[neon] to-[accent-2] opacity-30"
          />
        </div>
        <div className="overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 pt-36  sm:pt-60 lg:px-8 lg:pt-32">
            <div className="mx-auto max-w-2xl gap-x-14 lg:mx-0 lg:flex lg:max-w-none lg:items-center">
              <div className="relative w-full lg:max-w-xl lg:shrink-0 xl:max-w-2xl">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="text-5xl font-semibold tracking-tight  text-links-foreground sm:text-7xl"
                >
                  {t('title')}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  className="mt-8 text- text-pretty text-muted-foreground sm:max-w-md sm:text-xl/8 lg:max-w-none"
                >
                  {t('subtitle')}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                  className="mt-10 flex items-center gap-x-6"
                >
                  <Link
                    href="#"
                    className="rounded-md bg-accent-foreground border border-accent px-3.5 py-2.5 text-sm font-semibold text-accent shadow-xs hover:bg-link-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link-foreground"
                  >
                    {t('cta.demo')}
                  </Link>
                  <Link
                    href="#"
                    className="text-sm/6 font-semibold text-foreground underline underline-offset-4 tracking-wide"
                  >
                    {t('cta.trial')} <span aria-hidden="true">→</span>
                  </Link>
                </motion.div>
              </div>
              <div className="mt-14 flex justify-end gap-8 sm:-mt-44 sm:justify-start sm:pl-20 lg:mt-0 lg:pl-0">
                <div className="ml-auto w-44 flex-none space-y-8 pt-32 sm:ml-0 sm:pt-80 lg:order-last lg:pt-36 xl:order-0 xl:pt-80">
                  <motion.div
                    className="relative"
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: [0, -15, 0],
                      rotate: [0, 5, 0],
                      transition: {
                        delay: 1,
                        duration: 4,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        repeatType: 'loop' as const,
                      },
                    }}
                  >
                    <Image
                      alt=""
                      width={300}
                      height={300}
                      src="/assets/mockup/pc/square.jpg"
                      className="aspect-2/3 w-full rounded-xl bg-foreground/5 object-cover shadow-lg"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-border ring-inset" />
                  </motion.div>
                </div>
                <div className="mr-auto w-44 flex-none space-y-8 sm:mr-0 sm:pt-52 lg:pt-36">
                  <motion.div
                    className="relative"
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: [0, -20, 0],
                      rotate: [0, -5, 0],
                      transition: {
                        delay: 0.2,
                        duration: 4.5,
                        ease: 'easeInOut',
                        repeat: Infinity,
                      },
                    }}
                  >
                    <Image
                      alt=""
                      width={300}
                      height={300}
                      src="/assets/mockup/pc/menu.png"
                      className="aspect-2/3 w-full rounded-xl bg-foreground/5 object-cover shadow-lg"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-border ring-inset" />
                  </motion.div>
                  <motion.div
                    className="relative"
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: [0, -10, 0],
                      rotate: [0, 8, 0],
                      transition: {
                        delay: 0.4,
                        duration: 4.2,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        repeatType: 'loop' as const,
                      },
                    }}
                  >
                    <Image
                      alt=""
                      width={300}
                      height={300}
                      src="/assets/mockup/sp/staff_list.jpg"
                      className="aspect-2/3 w-full rounded-xl bg-foreground/5 object-cover shadow-lg"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-border ring-inset" />
                  </motion.div>
                </div>
                <div className="w-44 flex-none space-y-8 pt-32 sm:pt-0">
                  <motion.div
                    className="relative"
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: [0, -18, 0],
                      rotate: [0, -7, 0],
                      transition: {
                        delay: 0.8,
                        duration: 4.8,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        repeatType: 'loop' as const,
                      },
                    }}
                  >
                    <Image
                      alt=""
                      width={300}
                      height={300}
                      src="/assets/mockup/sp/dashboard.jpg"
                      className="aspect-2/3 w-full rounded-xl bg-foreground/5 object-cover shadow-lg"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-border ring-inset" />
                  </motion.div>
                  <motion.div
                    className="relative"
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: [0, -12, 0],
                      rotate: [0, 6, 0],
                      transition: {
                        delay: 1,
                        duration: 4.6,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        repeatType: 'loop' as const,
                      },
                    }}
                  >
                    <Image
                      alt=""
                      width={300}
                      height={300}
                      src="/assets/mockup/sp/coupon.jpg"
                      className="aspect-2/3 w-full rounded-xl bg-foreground/5 object-cover shadow-lg hidden sm:block"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-border ring-inset" />
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


