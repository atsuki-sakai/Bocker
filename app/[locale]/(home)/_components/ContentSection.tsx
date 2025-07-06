import { CloudArrowUpIcon, LockClosedIcon, ServerIcon } from '@heroicons/react/20/solid'
import { useTranslations } from 'next-intl'
import Image from 'next/image'

export function ContentSection() {
  const t = useTranslations('landing.content')
  return (
    <div className="relative isolate overflow-hidden bg-background px-6 py-24 sm:py-32 lg:overflow-visible lg:px-0">
      <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-start lg:gap-y-10">
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:mx-auto lg:grid lg:w-full lg:max-w-7xl lg:grid-cols-2 lg:gap-x-8 lg:px-8">
          <div className="lg:pr-4">
            <div className="lg:max-w-lg">
              <p className="text-base/7 font-semibold text-link-foreground">{t('tagline')}</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-foreground sm:text-5xl">
                {t('title')}
              </h1>
              <p className="mt-6 text-base md:text-lg text-muted-foreground">
                {t('mainDescription')}
              </p>
            </div>
          </div>
        </div>
        <div className="-mt-12 -ml-12 p-12 lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:overflow-hidden">
          <Image
            alt=""
            src="/assets/mockup/pc/dashboard.png"
            width={1000}
            height={1000}
            className="w-3xl max-w-none rounded-xl bg-foreground shadow-xl ring-1 ring-border sm:w-228"
          />
        </div>
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:mx-auto lg:grid lg:w-full lg:max-w-7xl lg:grid-cols-2 lg:gap-x-8 lg:px-8">
          <div className="lg:pr-4">
            <div className="max-w-xl text-base/7 text-foreground lg:max-w-lg">
              <p>{t('industryProblem')}</p>
              <ul role="list" className="mt-8 space-y-8 text-foreground">
                <li className="flex gap-x-3">
                  <CloudArrowUpIcon
                    aria-hidden="true"
                    className="mt-1 size-5 flex-none text-link-foreground"
                  />
                  <span className="text-primary">
                    <strong className="font-semibold ">{t('benefits.sales.title')}</strong>{' '}
                    {t('benefits.sales.description')}
                  </span>
                </li>
                <li className="flex gap-x-3">
                  <LockClosedIcon
                    aria-hidden="true"
                    className="mt-1 size-5 flex-none text-link-foreground"
                  />
                  <span className="text-primary">
                    <strong className="font-semibold ">{t('benefits.mistakes.title')}</strong>{' '}
                    {t('benefits.mistakes.description')}
                  </span>
                </li>
                <li className="flex gap-x-3">
                  <ServerIcon
                    aria-hidden="true"
                    className="mt-1 size-5 flex-none text-link-foreground"
                  />
                  <span className="text-primary">
                    <strong className="font-semibold ">{t('benefits.efficiency.title')}</strong>{' '}
                    {t('benefits.efficiency.description')}
                  </span>
                </li>
              </ul>
              <p className="mt-8 text-muted-foreground">{t('averageResults')}</p>
              <h2 className="mt-16 text-2xl font-bold tracking-tight text-primary">
                {t('roi.title')}
              </h2>
              <p className="mt-6 text-muted-foreground">{t('roi.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
