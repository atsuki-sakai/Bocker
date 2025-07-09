'use client'

import { useEffect, useState } from 'react'
import {
  HeroSection,
  FeatureSection,
  Pricing,
  HeaderSection,
  ContentSection,
  CTASection,
  FAQ,
  SplashScreen,
} from './_components'

export function LandingPageClient({ locale }: { locale: string }) {
  const [showSplash, setShowSplash] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // ハイドレーション完了を検知
  useEffect(() => {
    setIsHydrated(true)

    // 1時間でリフレッシュする初回表示制御
    const lastShown = localStorage.getItem('bockerLastSplash')
    const now = Date.now()
    const oneHour = 60 * 60 * 1000

    if (!lastShown || now - parseInt(lastShown) > oneHour) {
      setShowSplash(true)
      localStorage.setItem('bockerLastSplash', now.toString())
      // 初期表示時にスクロールを無効化
      document.body.style.overflow = 'hidden'
    }
  }, [])

  // Fix for scroll issue - prevent overflow on body
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // スプラッシュスクリーン表示中はスクロールを防ぐ
  useEffect(() => {
    if (showSplash) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [showSplash])

  const handleSplashComplete = () => {
    setShowSplash(false)
  }

  // ハイドレーション前は何も表示しない
  if (!isHydrated) {
    return <div className="fixed inset-0 z-50 bg-background" />
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <div
        style={{
          display: showSplash ? 'none' : 'block',
          visibility: showSplash ? 'hidden' : 'visible',
        }}
      >
        <main className="flex flex-col min-h-screen bg-background text-foreground">
          <HeroSection />
          <FeatureSection />
          <Pricing />
          <ContentSection />
          <CTASection />
          <FAQ locale={locale} />
          <HeaderSection />
        </main>
      </div>
    </>
  )
}
