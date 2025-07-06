'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { MenuIcon, XIcon } from 'lucide-react'
import { ModeToggle } from '@/components/common'
import { LanguageSwitcher } from '@/components/common'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'

export function Header() {

    const t = useTranslations('landing')
    const [menuOpen, setMenuOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const { resolvedTheme } = useTheme()

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background">
        <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 w-fit"
          >
            <Link href="/" className="flex flex-col items-start space-x-2">
              <div className="flex items-center">
                <Image
                  src={
                    mounted && resolvedTheme === 'dark'
                      ? '/assets/images/logo-white.png'
                      : '/assets/images/logo-darkgreen.png'
                  }
                  alt="Bocker"
                  width={40}
                  height={40}
                  className="h-10 w-10"
                />

                <span className="text-xl font-bold">Bocker</span>
              </div>
              <span className="text-xs text-muted-foreground -mt-1 scale-75 text-nowrap -translate-x-5">
                {t('hero.tagline')}
              </span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden md:flex items-center gap-6"
          >
            <Link
              href="/features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {t('nav.features')}
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {t('nav.pricing')}
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {t('nav.about')}
            </Link>
            <Link
              href="/faq"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {t('nav.faq')}
            </Link>
            <LanguageSwitcher />
            <ModeToggle />
            <Link href="/sign-up">
              <Button size="sm">{t('nav.signUp')}</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">{t('nav.login')}</Button>
            </Link>
          </motion.nav>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <ModeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t md:hidden"
            >
              <div className="flex items-center justify-end p-2">
                <LanguageSwitcher />
              </div>
              <nav className="container py-4 px-4 space-y-3">
                <Link
                  href="#features"
                  className="block text-sm font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('nav.features')}
                </Link>
                <Link
                  href="#pricing"
                  className="block text-sm font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('nav.pricing')}
                </Link>
                <Link
                  href="/about"
                  className="block text-sm font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('nav.about')}
                </Link>
                <Link
                  href="/faq"
                  className="block text-sm font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('nav.faq')}
                </Link>
                <Link
                  className="inline-block w-full mt-4"
                  href="/sign-up"
                  onClick={() => setMenuOpen(false)}
                >
                  <Button className="w-full" size="sm">
                    {t('nav.startFreeTrial')}
                  </Button>
                </Link>
                <Link
                  className="inline-block w-full mt-4"
                  href="/sign-up"
                  onClick={() => setMenuOpen(false)}
                >
                  <Button className="w-full" size="sm">
                    {t('nav.login')}
                  </Button>
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    )
}