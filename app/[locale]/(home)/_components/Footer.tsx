'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Instagram } from 'lucide-react'

export function Footer() {
    const t = useTranslations('landing.footer')
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    return (
      <footer data-id="footer" className="py-12 bg-background border-t">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Image
                  src={
                    mounted && resolvedTheme === 'dark'
                      ? '/assets/images/logo-white.png'
                      : '/assets/images/logo-darkgreen.png'
                  }
                  alt="Bocker"
                  width={32}
                  height={32}
                />
                <span className="text-lg font-bold">Bocker</span>
              </div>
              <p className="text-sm text-muted-foreground">{t('tagline')}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">{t('sections.product')}</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/features"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {t('links.features')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {t('links.pricing')}
                  </Link>
                </li>
                <li>
                  {/* FIXME: デモページを作成する */}
                  <Link
                    href="https://bocker-project.vercel.app/ja/reservation/v5799kb53q14k5tyf4y0kj636d7jhz8p"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {t('links.demo')}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">{t('sections.support')}</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground">
                    {t('links.faq')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {t('links.contact')}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">{t('sections.company')}</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/about"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {t('links.about')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {t('links.privacyPolicy')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {t('links.termsOfUse')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <Separator className="mb-8" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{t('copyright')}</p>
            <div className="flex items-center gap-4">
              <Link
                href="https://www.instagram.com/bocker_fujimoto"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Instagram"
              >
                <Instagram className="size-5 text-pink-500" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    )
}