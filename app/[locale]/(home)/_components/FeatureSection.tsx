import {
    ArrowPathIcon,
    ServerIcon,
    ClipboardDocumentListIcon,
    CalculatorIcon,
    PencilSquareIcon,
    ScissorsIcon
  } from '@heroicons/react/20/solid'
  import Image from 'next/image'
  import { motion } from 'framer-motion'
  import { useTranslations } from 'next-intl'

  export function FeatureSection() {
    const t = useTranslations('landing.features')
    const features = [
      {
        name: t('items.smartReservation.title'),
        description: t('items.smartReservation.description'),
        icon: ClipboardDocumentListIcon,
      },
      {
        name: t('items.optimizationAlgorithm.title'),
        description: t('items.optimizationAlgorithm.description'),
        icon: CalculatorIcon,
      },
      {
        name: t('items.digitalCarte.title'),
        description: t('items.digitalCarte.description'),
        icon: PencilSquareIcon,
      },
      {
        name: t('items.allInOne.title'),
        description: t('items.allInOne.description'),
        icon: ArrowPathIcon,
      },
      {
        name: t('items.userFriendly.title'),
        description: t('items.userFriendly.description'),
        icon: ScissorsIcon,
      },
      {
        name: t('items.support.title'),
        description: t('items.support.description'),
        icon: ServerIcon,
      },
    ]
    return (
      <div className="bg-background py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl sm:text-center">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
              className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-foreground sm:text-5xl sm:text-balance"
            >
              {t('title')}
            </motion.p>
            <motion.p className="mt-6 text-base md:text-lg text-muted-foreground">
              {t('subtitle')}
            </motion.p>
          </div>
        </div>
        <div className="relative overflow-hidden pt-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Image
              alt="App screenshot"
              src="/assets/mockup/pc/dashboard.png"
              width={2432}
              height={1442}
              className="mb-[-12%] rounded-xl shadow-2xl ring-1 ring-border"
            />

            <div aria-hidden="true" className="relative">
              <div className="absolute -inset-x-20 bottom-0 bg-linear-to-t from-background pt-[7%]" />
            </div>
          </div>
        </div>
        <div className="mx-auto mt-16 max-w-7xl px-6 sm:mt-20 md:mt-24 lg:px-8">
          <dl className="mx-auto grid max-w-2xl grid-cols-1 gap-x-6 gap-y-10 text-base text-muted-foreground sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-9">
                <dt className="inline font-semibold text-foreground">
                  <feature.icon
                    aria-hidden="true"
                    className="absolute top-1 left-1 size-5 text-primary"
                  />
                  {feature.name}
                </dt>
                <br />
                <dd className="inline">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    )
  }
  