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
      featured: false,
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
      featured: true,
    },
  ]

  const sections = [
    {
      name: t('section.basic.title'),
      features: [
        {
          name: t('section.basic.features.0.name'),
          tiers: {
            LITE: t('section.basic.features.0.tiers.LITE'),
            PRO: t('section.basic.features.0.tiers.PRO'),
          },
        },
        {
          name: t('section.basic.features.1.name'),
          tiers: {
            LITE: t('section.basic.features.1.tiers.LITE'),
            PRO: t('section.basic.features.1.tiers.PRO'),
          },
        },
        {
          name: t('section.basic.features.2.name'),
          tiers: {
            LITE: t('section.basic.features.2.tiers.LITE'),
            PRO: t('section.basic.features.2.tiers.PRO'),
          },
        },
        {
          name: t('section.basic.features.3.name'),
          tiers: {
            LITE: t('section.basic.features.3.tiers.LITE'),
            PRO: t('section.basic.features.3.tiers.PRO'),
          },
        },
        {
          name: t('section.basic.features.4.name'),
          tiers: {
            LITE: t('section.basic.features.4.tiers.LITE'),
            PRO: t('section.basic.features.4.tiers.PRO'),
          },
        },
        {
          name: t('section.basic.features.5.name'),
          tiers: {
            LITE: t('section.basic.features.5.tiers.LITE'),
            PRO: t('section.basic.features.5.tiers.PRO'),
          },
        },
        {
          name: t('section.basic.features.6.name'),
          tiers: {
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
            LITE: t('section.customer.features.0.tiers.LITE'),
            PRO: t('section.customer.features.0.tiers.PRO'),
          },
        },
        {
          name: t('section.customer.features.1.name'),
          tiers: {
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
    <form className="group/tiers isolate overflow-hidden">
      <div className="flow-root bg-background pt-24 pb-16 sm:pt-32 lg:pb-0">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative z-10">
            <motion.h2
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
          <div className="relative mx-auto mt-10 grid max-w-md grid-cols-1 gap-y-8 lg:mx-0 lg:-mb-14 lg:max-w-none lg:grid-cols-2">
            <div
              aria-hidden="true"
              className="hidden lg:absolute lg:inset-x-px lg:top-4 lg:bottom-0 lg:block lg:rounded-t-2xl lg:bg-neon lg:ring-1 lg:ring-border"
            />
            {tiers.map((tier, idx) => (
              <motion.div
                key={tier.id}
                data-featured={tier.featured ? 'true' : undefined}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.6 + idx * 0.15 }}
                viewport={{ once: true, amount: 0.2 }}
                className={classNames(
                  tier.featured
                    ? 'z-10 bg-foreground shadow-xl ring-1 ring-accent'
                    : 'bg-accent ring-1 ring-accent lg:bg-transparent lg:pb-14 lg:ring-0',
                  'group/tier relative rounded-2xl'
                )}
              >
                <div className="p-8 lg:pt-12 xl:p-10 xl:pt-14">
                  <h3
                    id={`tier-${tier.id}`}
                    className="text-base/6 font-semibold text-neon-foreground group-data-featured/tier:text-muted-foreground"
                  >
                    {tier.name}
                  </h3>
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-stretch ">
                    <div className="mt-2 flex items-center gap-x-4">
                      {isAnnual ? (
                        <p className="text-4xl font-semibold tracking-tight text-background group-not-has-[[name=frequency][value=monthly]:checked]/tiers:hidden group-data-featured/tier:text-foreground">
                          {tier.price.annually}
                        </p>
                      ) : (
                        <p className="text-4xl font-semibold tracking-tight text-background group-not-has-[[name=frequency][value=annually]:checked]/tiers:hidden group-data-featured/tier:text-foreground">
                          {tier.price.monthly}
                        </p>
                      )}
                      <div className="text-base">
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
          {/* Feature comparison (up to lg) */}
          <section aria-labelledby="mobile-comparison-heading" className="lg:hidden">
            <h2 id="mobile-comparison-heading" className="sr-only">
              Feature comparison
            </h2>

            <div className="mx-auto max-w-2xl space-y-16">
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
                      '-mt-px w-72 border-t-2 pt-10 md:w-80'
                    )}
                  >
                    <h3
                      className={classNames(
                        tier.featured ? 'text-primary' : 'text-foreground',
                        'text-base/6 font-semibold'
                      )}
                    >
                      {tier.name}
                    </h3>
                    <p className="mt-1 text-base/6 text-muted-foreground">{tier.description}</p>
                  </div>

                  <div className="mt-10 space-y-10">
                    {sections.map((section) => (
                      <div key={section.name}>
                        <h4 className="text-base/6 font-semibold text-foreground">
                          {section.name}
                        </h4>
                        <div className="relative mt-6">
                          {/* Fake card background */}
                          <div
                            aria-hidden="true"
                            className="absolute inset-y-0 right-0 hidden w-1/2 rounded-lg bg-card shadow-xs sm:block"
                          />

                          <div
                            className={classNames(
                              tier.featured ? 'ring-2 ring-primary' : 'ring-1 ring-border',
                              'relative rounded-lg bg-card shadow-xs sm:rounded-none sm:bg-transparent sm:shadow-none sm:ring-0'
                            )}
                          >
                            <dl className=" divide-y divide-border text-base/6">
                              {section.features.map((feature) => (
                                <div
                                  key={feature.name}
                                  className="flex items-center justify-between px-4 py-3 sm:grid sm:grid-cols-2 sm:px-0"
                                >
                                  <dt className="pr-4 text-muted-foreground">{feature.name}</dt>
                                  <dd className="flex items-center justify-end sm:justify-center sm:px-4">
                                    {(() => {
                                      const tierValue =
                                        feature.tiers[tier.name as keyof typeof feature.tiers]
                                      const evaluatedValue = evaluateTierValue(tierValue)

                                      if (typeof evaluatedValue === 'string') {
                                        return (
                                          <span
                                            className={
                                              tier.featured
                                                ? 'font-semibold text-primary'
                                                : 'text-foreground'
                                            }
                                          >
                                            {evaluatedValue}
                                          </span>
                                        )
                                      } else {
                                        return (
                                          <>
                                            {evaluatedValue === true ? (
                                              <CheckIcon
                                                aria-hidden="true"
                                                className="mx-auto size-5 text-primary"
                                              />
                                            ) : (
                                              <XMarkIcon
                                                aria-hidden="true"
                                                className="mx-auto size-5 text-muted-foreground"
                                              />
                                            )}
                                            <span className="sr-only">
                                              {evaluatedValue === true ? 'Yes' : 'No'}
                                            </span>
                                          </>
                                        )
                                      }
                                    })()}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>

                          {/* Fake card border */}
                          <div
                            aria-hidden="true"
                            className={classNames(
                              tier.featured ? 'ring-2 ring-primary' : 'ring-1 ring-border',
                              'pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 rounded-lg sm:block'
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Feature comparison (lg+) */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
            viewport={{ once: true, amount: 0.2 }}
            aria-labelledby="comparison-heading"
            className="hidden lg:block"
          >
            <h2 id="comparison-heading" className="sr-only">
              Feature comparison
            </h2>

            <div className="grid grid-cols-3 gap-x-8 border-t border-border before:block">
              {tiers.map((tier) => (
                <div key={tier.id} aria-hidden="true" className="-mt-px">
                  <div
                    className={classNames(
                      tier.featured ? 'border-primary' : 'border-transparent',
                      'border-t-2 pt-10'
                    )}
                  >
                    <p
                      className={classNames(
                        tier.featured ? 'text-primary' : 'text-foreground',
                        'text-base/6 font-semibold'
                      )}
                    >
                      {tier.name}
                    </p>
                    <p className="mt-1 text-base/6 text-muted-foreground">{tier.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="-mt-6 space-y-16">
              {sections.map((section) => (
                <div key={section.name}>
                  <h3 className="text-base/6 font-semibold text-foreground">{section.name}</h3>
                  <div className="relative -mx-8 mt-10 w-full">
                    {/* Fake card backgrounds */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-8 inset-y-0 grid grid-cols-3 gap-x-8 before:block"
                    >
                      <div className="size-full rounded-lg bg-card shadow-xs" />
                      <div className="size-full rounded-lg bg-card shadow-xs" />
                      <div className="size-full rounded-lg bg-card shadow-xs" />
                    </div>

                    <table className="relative w-full border-separate border-spacing-x-8">
                      <thead>
                        <tr className="text-left">
                          <th scope="col">
                            <span className="sr-only">Feature</span>
                          </th>
                          {tiers.map((tier) => (
                            <th key={tier.id} scope="col">
                              <span className="sr-only">{tier.name} tier</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.features.map((feature, featureIdx) => (
                          <tr key={feature.name}>
                            <th
                              scope="row"
                              className="py-3 pr-4 text-left text-base/6 font-normal text-foreground"
                            >
                              {feature.name}
                              {featureIdx !== section.features.length - 1 ? (
                                <div className="absolute inset-x-8 mt-3 h-px bg-border" />
                              ) : null}
                            </th>
                            {tiers.map((tier) => (
                              <td key={tier.id} className="relative w-1/3 px-4 py-0 text-center">
                                <span className="relative size-full py-3">
                                  {(() => {
                                    const tierValue =
                                      feature.tiers[tier.name as keyof typeof feature.tiers]
                                    const evaluatedValue = evaluateTierValue(tierValue)

                                    if (typeof evaluatedValue === 'string') {
                                      return (
                                        <span
                                          className={classNames(
                                            tier.featured
                                              ? 'font-semibold text-primary'
                                              : 'text-foreground',
                                            'text-base/6'
                                          )}
                                        >
                                          {evaluatedValue}
                                        </span>
                                      )
                                    } else {
                                      return (
                                        <>
                                          {evaluatedValue === true ? (
                                            <CheckIcon
                                              aria-hidden="true"
                                              className="mx-auto size-5 text-neon"
                                            />
                                          ) : (
                                            <XMarkIcon
                                              aria-hidden="true"
                                              className="mx-auto size-5 text-muted-foreground"
                                            />
                                          )}
                                          <span className="sr-only">
                                            {evaluatedValue === true ? 'Yes' : 'No'}
                                          </span>
                                        </>
                                      )
                                    }
                                  })()}
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Fake card borders */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-8 inset-y-0 grid grid-cols-3 gap-x-8 before:block"
                    >
                      {tiers.map((tier) => (
                        <div
                          key={tier.id}
                          className={classNames(
                            tier.featured ? 'ring-2 ring-primary' : 'ring-1 ring-border',
                            'rounded-lg'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
    </form>
  )
}
