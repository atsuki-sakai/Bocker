'use client'

import { Switch } from '@/components/ui/switch'
import { CheckIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false)
  const t = useTranslations('landing.pricing')

  const tiers = [
    {
      id: 'micro',
      name: t('subscription.micro.title'),
      description: t('subscription.micro.description'),
      price: {
        monthly: t('subscription.micro.price.monthly'),
        annually: t('subscription.micro.price.annually'),
      },
      highlights: [
        t('subscription.micro.features.1'),
        t('subscription.micro.features.2'),
        t('subscription.micro.features.3'),
        t('subscription.micro.features.4'),
        t('subscription.micro.features.5'),
        t('subscription.micro.features.6'),
        t('subscription.micro.features.7'),
        t('subscription.micro.features.8'),
        t('subscription.micro.features.9'),
      ],
      featured: false,
    },
    {
      id: 'lite',
      name: t('subscription.lite.title'),
      description: t('subscription.lite.description'),
      price: {
        monthly: t('subscription.lite.price.monthly'),
        annually: t('subscription.lite.price.annually'),
      },
      highlights: [
        t('subscription.lite.features.1'),
        t('subscription.lite.features.2'),
        t('subscription.lite.features.3'),
        t('subscription.lite.features.4'),
        t('subscription.lite.features.5'),
        t('subscription.lite.features.6'),
        t('subscription.lite.features.7'),
        t('subscription.lite.features.8'),
        t('subscription.lite.features.9'),
      ],
      featured: true,
    },
    {
      id: 'pro',
      name: t('subscription.pro.title'),
      description: t('subscription.pro.description'),
      price: {
        monthly: t('subscription.pro.price.monthly'),
        annually: t('subscription.pro.price.annually'),
      },
      highlights: [
        t('subscription.pro.features.1'),
        t('subscription.pro.features.2'),
        t('subscription.pro.features.3'),
        t('subscription.pro.features.4'),
      ],
      featured: false,
    },
  ]

  const sections = [
    {
      name: t('section.basic.title'),
      features: [
        {
          name: t('section.basic.features.0.name'),
          tiers: {
            MICRO: t('section.basic.features.0.tiers.MICRO'),
            LITE: t('section.basic.features.0.tiers.LITE'),
            PRO: t('section.basic.features.0.tiers.PRO'),
          },
        },
        {
          name: t('section.basic.features.1.name'),
          tiers: {
            MICRO: t('section.basic.features.1.tiers.MICRO'),
            LITE: t('section.basic.features.1.tiers.LITE'),
            PRO: t('section.basic.features.1.tiers.PRO'),
          },
        },
        {
          name: t('section.basic.features.2.name'),
          tiers: {
            MICRO: t('section.basic.features.2.tiers.MICRO'),
            LITE: t('section.basic.features.2.tiers.LITE'),
            PRO: t('section.basic.features.2.tiers.PRO'),
          },
        },
        {
          name: t('section.basic.features.3.name'),
          tiers: {
            MICRO: t('section.basic.features.3.tiers.MICRO'),
            LITE: t('section.basic.features.3.tiers.LITE'),
            PRO: t('section.basic.features.3.tiers.PRO'),
          },
        },
        {
          name: t('section.basic.features.4.name'),
          tiers: {
            MICRO: t('section.basic.features.4.tiers.MICRO'),
            LITE: t('section.basic.features.4.tiers.LITE'),
            PRO: t('section.basic.features.4.tiers.PRO'),
          },
        },
        {
          name: t('section.basic.features.5.name'),
          tiers: {
            MICRO: t('section.basic.features.5.tiers.MICRO'),
            LITE: t('section.basic.features.5.tiers.LITE'),
            PRO: t('section.basic.features.5.tiers.PRO'),
          },
        },
        {
          name: t('section.basic.features.6.name'),
          tiers: {
            MICRO: t('section.basic.features.6.tiers.MICRO'),
            LITE: t('section.basic.features.6.tiers.LITE'),
            PRO: t('section.basic.features.6.tiers.PRO'),
          },
        },
      ],
    },
    {
      name: t('section.customer.title'),
      features: [
        {
          name: t('section.customer.features.0.name'),
          tiers: {
            MICRO: t('section.customer.features.0.tiers.MICRO'),
            LITE: t('section.customer.features.0.tiers.LITE'),
            PRO: t('section.customer.features.0.tiers.PRO'),
          },
        },
        {
          name: t('section.customer.features.1.name'),
          tiers: {
            MICRO: t('section.customer.features.1.tiers.MICRO'),
            LITE: t('section.customer.features.1.tiers.LITE'),
            PRO: t('section.customer.features.1.tiers.PRO'),
          },
        },
      ],
    },
    {
      name: t('section.support.title'),
      features: [
        {
          name: t('section.support.features.0.name'),
          tiers: {
            MICRO: t('section.support.features.0.tiers.MICRO'),
            LITE: t('section.support.features.0.tiers.LITE'),
            PRO: t('section.support.features.0.tiers.PRO'),
          },
        },
      ],
    },
  ]

  // tiersの値を適切に評価するヘルパー関数
  const evaluateTierValue = (value: string) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  }

  return (
    <form data-testid="pricing" className="group/tiers isolate overflow-hidden">
      <div className="flow-root bg-background pt-24 pb-16 sm:pt-32 lg:pb-0">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative z-10">
            <motion.h2
              role="heading"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
              viewport={{ once: true, amount: 0.2 }}
              className="mx-auto max-w-4xl text-center text-5xl font-semibold tracking-tight text-balance text-primary sm:text-5xl"
            >
              {t('title')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
              viewport={{ once: true, amount: 0.2 }}
              className="mx-auto mt-6 max-w-2xl text-center text-lg font-medium text-pretty  sm:text-xl/8"
            >
              {t('subtitle')}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
              viewport={{ once: true, amount: 0.2 }}
              className="mx-auto mt-6 max-w-2xl text-center text-base font-medium text-pretty text-muted-foreground sm:text-base"
            >
              {t('disclaimer')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.5 }}
              viewport={{ once: true, amount: 0.2 }}
              className="mt-16 flex justify-end"
            >
              <fieldset aria-label="Payment frequency" className="transition-all duration-300">
                <div className="flex items-center gap-8">
                  <span
                    className={
                      !isAnnual
                        ? 'font-bold text-base text-primary border-b-2 border-primary'
                        : 'text-muted-foreground'
                    }
                  >
                    {t('type.monthly')}
                  </span>
                  <Switch
                    role="checkbox"
                    id="frequency"
                    name="frequency"
                    value="monthly"
                    checked={isAnnual}
                    className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-accent scale-110"
                    onCheckedChange={setIsAnnual}
                  />
                  <span
                    className={
                      isAnnual
                        ? 'font-bold text-base text-primary border-b-2 border-primary'
                        : 'text-muted-foreground'
                    }
                  >
                    {t('type.annually')}
                  </span>
                </div>
              </fieldset>
            </motion.div>
          </div>
          <div className="relative mx-auto mt-10 grid max-w-md grid-cols-1 gap-y-8 sm:max-w-2xl sm:grid-cols-2 sm:gap-x-6 lg:mx-0 lg:-mb-14 lg:max-w-none lg:grid-cols-3 lg:gap-x-8">
            <div
              aria-hidden="true"
              className="hidden lg:absolute lg:inset-x-px lg:top-4 lg:bottom-0 lg:block lg:rounded-t-2xl lg:bg-neon lg:ring-1 lg:ring-border"
            />
            {tiers.map((tier, idx) => (
              <motion.div
                key={tier.id}
                role="plan"
                data-testid={`plan-${tier.id}`}
                data-featured={tier.featured ? 'true' : undefined}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.6 + idx * 0.15 }}
                viewport={{ once: true, amount: 0.2 }}
                className={classNames(
                  tier.featured
                    ? 'z-10 bg-foreground shadow-xl ring-1 ring-accent'
                    : 'bg-accent ring-1 ring-accent lg:bg-transparent lg:pb-14 lg:ring-0',
                  'group/tier relative rounded-2xl sm:col-span-1 lg:col-span-1'
                )}
              >
                <div className="p-8 lg:pt-12 xl:p-10 xl:pt-14">
                  <h3
                    id={`tier-${tier.id}`}
                    className="text-base/6 font-semibold text-neon-foreground group-data-featured/tier:text-muted-foreground"
                  >
                    {tier.name}
                  </h3>
                  <div className="flex flex-col gap-6 sm:flex-col sm:items-stretch lg:flex-col lg:items-stretch">
                    <div className="mt-2 flex flex-col items-start gap-2 sm:flex-col lg:flex-row lg:items-center lg:gap-x-4">
                      {isAnnual ? (
                        <p className="text-3xl font-semibold tracking-tight text-background group-not-has-[[name=frequency][value=monthly]:checked]/tiers:hidden group-data-featured/tier:text-foreground sm:text-4xl">
                          {tier.price.annually}
                        </p>
                      ) : (
                        <p className="text-3xl font-semibold tracking-tight text-background group-not-has-[[name=frequency][value=annually]:checked]/tiers:hidden group-data-featured/tier:text-foreground sm:text-4xl">
                          {tier.price.monthly}
                        </p>
                      )}
                      <div className="text-sm sm:text-base">
                        <p className="text-primary-foreground group-data-featured/tier:text-foreground">
                          {t('subscription.title')}
                        </p>
                        {isAnnual ? (
                          <p className="text-muted font-bold group-not-has-[[name=frequency][value=monthly]:checked]/tiers:hidden group-data-featured/tier:text-muted-foreground">
                            {t('type.annually')}
                          </p>
                        ) : (
                          <p className="text-muted font-bold group-not-has-[[name=frequency][value=annually]:checked]/tiers:hidden group-data-featured/tier:text-muted-foreground">
                            {t('type.monthly')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 flow-root sm:mt-10">
                    <ul
                      role="list"
                      className="-my-2 divide-y divide-border border-t border-border text-sm text-primary-foreground group-data-featured/tier:divide-border group-data-featured/tier:border-border group-data-featured/tier:text-muted-foreground lg:border-t-0"
                    >
                      {tier.highlights.map((mainFeature: string) => (
                        <li key={mainFeature} className="flex gap-x-3 py-2">
                          <CheckIcon
                            data-testid="check-icon"
                            aria-hidden="true"
                            className="h-6 w-5 flex-none text-muted-foreground group-data-featured/tier:text-primary"
                          />
                          {mainFeature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <div className="relative bg-background lg:pt-14">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <section>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 md:gap-x-8">
              <div className="col-span-1 space-y-0">
                <div className="-mt-px w-full border-t-2 border-transparent pt-10">
                  <h3 className="text-xs md:text-sm font-semibold text-foreground">
                    {t('section.feature.title')}
                  </h3>
                  <p className="mt-1 text-xs md:text-sm text-muted-foreground text-nowrap">
                    {t('section.feature.description')}
                  </p>
                </div>
                {sections.map((section) => (
                  <div key={section.name} className="w-full">
                    <div className="border-t border-border pt-8 pb-2">
                      <h4 className="text-xs md:text-sm font-semibold text-foreground mb-6">
                        {section.name}
                      </h4>
                    </div>
                    <div className="space-y-0">
                      {section.features.map((feature) => (
                        <div key={feature.name} className="w-full py-3 border-b border-border/30">
                          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                            {feature.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {tiers.map((tier, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.6 + index * 0.15 }}
                  viewport={{ once: true, amount: 0.2 }}
                  key={tier.id}
                  className="border-t border-border"
                >
                  <div
                    className={classNames(
                      tier.featured ? 'border-primary' : 'border-transparent',
                      '-mt-px w-full border-t-2 pt-10'
                    )}
                  >
                    <h3
                      className={classNames(
                        tier.featured ? 'text-primary' : 'text-foreground',
                        'text-xs md:text-sm font-semibold'
                      )}
                    >
                      {tier.name}
                    </h3>
                    <p className="mt-1 text-xs md:text-sm text-muted-foreground text-nowrap">
                      {tier.description}
                    </p>
                  </div>
                  <div className="mt-0 space-y-0">
                    {sections.map((section) => (
                      <div key={section.name}>
                        <div className="border-t border-border pt-8 pb-2">
                          <h4 className="text-xs md:text-sm font-semibold text-foreground opacity-0 mb-6">
                            {section.name}
                          </h4>
                        </div>
                        <div className="space-y-0">
                          {section.features.map((feature) => {
                            const tierKey = tier.id.toUpperCase() as keyof typeof feature.tiers
                            const value = feature.tiers[tierKey]
                            const evaluatedValue = evaluateTierValue(value)

                            return (
                              <div
                                key={feature.name}
                                className="flex items-center justify-center py-3 border-b border-border/30"
                              >
                                <div className="flex items-center justify-center w-full">
                                  {typeof evaluatedValue === 'boolean' ? (
                                    evaluatedValue ? (
                                      <CheckIcon className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <XMarkIcon className="h-5 w-5 text-red-500" />
                                    )
                                  ) : (
                                    <span
                                      className={classNames(
                                        'text-xs md:text-sm text-center text-nowrap',
                                        tier.featured
                                          ? 'font-semibold text-primary'
                                          : 'text-foreground'
                                      )}
                                    >
                                      {evaluatedValue}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </form>
  )
}
