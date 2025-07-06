'use client'

import { useEffect } from 'react'
import {
  HeroSection,
  FeatureSection,
  Pricing,
  PopupBar,
  HeaderSection,
  ContentSection,
  CTASection,
  FAQ,
} from './_components'
export function LandingPageClient({ locale }: { locale: string }) {
  // Fix for scroll issue - prevent overflow on body
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground">
      <HeroSection />
      <FeatureSection />
      <Pricing />
      <ContentSection />
      <CTASection />
      <FAQ locale={locale} />
      <HeaderSection />
      <PopupBar />
    </main>
  )
}
