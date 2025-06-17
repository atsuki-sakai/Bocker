'use client'

import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckIcon,
  MenuIcon,
  XIcon,
  ChevronRight,
  Sparkles,
  Users,
  TrendingUp,
  Shield,
  Zap,
  MessageCircle,
  BarChart3,
  Calendar,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from '@/components/common'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { LanguageSwitcher } from '@/components/common'

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const slideIn = {
  hidden: { x: -60, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

const scaleIn = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.5 },
  },
}

// Type definitions
type TranslationType = {
  nav: {
    features: string
    pricing: string
    testimonials: string
    faq: string
    demo: string
    signUp: string
    startFreeTrial: string
  }
  hero: {
    badge: string
    title: string
    titleBreak: string
    subtitle: string
    tagline: string
    cta: {
      demo: string
      trial: string
      disclaimer: string
    }
  }
  features: {
    badge: string
    title: string
    subtitle: string
    items: Record<string, { title: string; description: string }>
  }
  howItWorks: {
    title: string
    subtitle: string
    steps: Record<string, { title: string; description: string }>
  }
  pricing: {
    title: string
    subtitle: string
    disclaimer: string
  }
  testimonials: {
    title: string
    subtitle: string
  }
  cta: {
    title: string
    titleBreak: string
    subtitle: string
    button: string
    disclaimer: string
  }
  footer: {
    tagline: string
    sections: {
      product: string
      support: string
      company: string
    }
    links: Record<string, string>
    copyright: string
  }
}

type SubscriptionTranslationType = {
  litePlan: string
  litePlanDescription: string
  proPlan: string
  proPlanDescription: string
  perMonth: string
  startNow: string
  features: {
    lite: string[]
    pro: string[]
  }
}

// FAQ data with translations
const getFaqData = (locale: string) => {
  const faqData = {
    ja: [
      {
        question: 'Bockerはどのようなサロン向けのサービスですか？',
        answer:
          'Bockerは、主に美容院、ネイルサロン、エステサロンといった予約ベースのサービス業を対象としたSaaSプラットフォームです。小規模サロン（スタッフ3名以下）から大規模サロン（スタッフ8名以上）まで、幅広い規模のサロンに対応しています。',
      },
      {
        question: 'どのような機能がありますか？',
        answer:
          '予約管理（24時間365日オンライン予約受付）、顧客管理（顧客情報データベース化）、スタッフ管理、カルテ管理（Proプラン以上）、ポイント・クーポン機能（Proプラン以上）、料金・決済管理など、サロン運営に必要な主要機能をBockerプラットフォーム内で完結できます。',
      },
      {
        question: '他の予約システムとの違いは何ですか？',
        answer:
          '直感的でモダンなUI/UX設計、スタッフ人数に応じた柔軟な料金プラン、予約から決済まで完結するオールインワン機能、リアルタイム同期、日本語に完全最適化された国産SaaS、美容業界特化のAI予約最適化アルゴリズムが主な差別化ポイントです。',
      },
      {
        question: 'Bockerを導入すると、サロン経営にどのような良い影響がありますか？',
        answer:
          '業務効率化により電話予約対応時間を月30時間から5時間に削減。オンライン予約導入で予約成約率が平均15%向上。ポイント・クーポン施策により顧客リピート率が平均20%向上。データに基づいた効果的な販促施策や経営判断が可能になります。',
      },
      {
        question: '無料トライアルはありますか？',
        answer:
          'はい、30日間の無料トライアル期間が全てのプランに含まれています。トライアル期間中、Bockerの全機能を試用でき、いつでもキャンセルまたはプラン変更が可能です。',
      },
      {
        question: 'ITに詳しくないのですが、操作は難しくないですか？',
        answer:
          'BockerはITに不慣れな美容師の方でも直感的に使えるよう、シンプルでモダンなUI/UXに注力しています。導入時のオンボーディングサポートや、使い方マニュアル、ビデオチュートリアルが充実しており、「伴走型サポート」でお客様に寄り添います。',
      },
    ],
    en: [
      {
        question: 'What type of salons is Bocker designed for?',
        answer:
          'Bocker is a SaaS platform primarily designed for appointment-based service businesses such as beauty salons, nail salons, and aesthetic salons. It accommodates salons of all sizes, from small (3 staff or less) to large (8+ staff).',
      },
      {
        question: 'What features are included?',
        answer:
          'Reservation management (24/7 online booking), customer management (customer database), staff management, client records (Pro plan and above), points & coupon features (Pro plan and above), and payment management - all essential salon operations can be completed within the Bocker platform.',
      },
      {
        question: 'What makes Bocker different from other booking systems?',
        answer:
          'Intuitive modern UI/UX design, flexible pricing based on staff count, all-in-one functionality from booking to payment, real-time synchronization, fully Japanese-optimized domestic SaaS, and AI-powered booking optimization algorithms specifically for the beauty industry.',
      },
      {
        question: 'How will Bocker benefit my salon business?',
        answer:
          'Reduce phone reservation time from 30 hours to 5 hours per month. Increase booking conversion rate by 15% on average with online reservations. Improve customer repeat rate by 20% on average with points and coupon strategies. Make data-driven marketing and business decisions.',
      },
      {
        question: 'Is there a free trial?',
        answer:
          'Yes, all plans include a 30-day free trial period. During the trial, you can test all Bocker features and cancel or change plans anytime.',
      },
      {
        question: "I'm not tech-savvy. Is it difficult to use?",
        answer:
          'Bocker is designed with simple, modern UI/UX that\'s intuitive even for beauty professionals who are not familiar with IT. We provide comprehensive onboarding support, user manuals, video tutorials, and "companion support" to guide you every step of the way.',
      },
    ],
  }
  return faqData[locale as keyof typeof faqData] || faqData.ja
}

// Testimonial data with translations
const getTestimonialData = (locale: string) => {
  const testimonialData = {
    ja: [
      {
        name: '佐藤 大輝',
        role: '美容院オーナー',
        content:
          '導入前は電話予約の管理に追われていましたが、今ではスタッフの負担が大幅に減り、お客様の満足度も向上しました。特にメニュー管理機能が便利です。',
        initials: 'ST',
      },
      {
        name: '鈴木 結菜',
        role: 'ネイルサロンオーナー',
        content:
          '顧客データ分析機能で常連のお客様の好みを把握できるようになり、よりパーソナライズされたサービスを提供できるようになりました。売上も20%アップしています。',
        initials: 'SY',
      },
      {
        name: '高橋 陽葵',
        role: 'エステサロン オーナー',
        content:
          '操作が直感的で、ITに不慣れなスタッフもすぐに使いこなせました。サポート体制も充実しており、安心して導入できました。',
        initials: 'TH',
      },
      {
        name: '伊藤 蓮',
        role: 'ヘアサロン マネージャー',
        content:
          '予約管理だけでなく、顧客情報も一元管理できるので、お客様への提案がスムーズになりました。リピート率も上がってきています。',
        initials: 'IR',
      },
    ],
    en: [
      {
        name: 'Daiki Sato',
        role: 'Beauty Salon Owner',
        content:
          'Before implementation, we were overwhelmed with phone reservations. Now, staff workload has significantly decreased and customer satisfaction has improved. The menu management feature is particularly convenient.',
        initials: 'DS',
      },
      {
        name: 'Yuna Suzuki',
        role: 'Nail Salon Owner',
        content:
          "The customer data analytics feature helps us understand regular customers' preferences, enabling more personalized service. Our sales have increased by 20%.",
        initials: 'YS',
      },
      {
        name: 'Haruki Takahashi',
        role: 'Spa Owner',
        content:
          'The interface is intuitive, and even staff unfamiliar with IT could use it immediately. The support system is comprehensive, giving us confidence in our implementation.',
        initials: 'HT',
      },
      {
        name: 'Ren Ito',
        role: 'Hair Salon Manager',
        content:
          'Not only reservation management but also centralized customer information makes proposals to customers smoother. Our repeat rate is increasing.',
        initials: 'RI',
      },
    ],
  }
  return testimonialData[locale as keyof typeof testimonialData] || testimonialData.ja
}

// Feature icons mapping
const featureIcons = {
  smartReservation: Calendar,
  optimizationAlgorithm: TrendingUp,
  digitalCarte: BarChart3,
  allInOne: Zap,
  userFriendly: Sparkles,
  support: MessageCircle,
  marketing: Users,
  menuManagement: Shield,
  dataAnalytics: BarChart3,
}

export function LandingPageClient({
  translations,
  subscriptionTranslations,
  locale,
}: {
  translations: TranslationType
  subscriptionTranslations: SubscriptionTranslationType
  locale: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get dynamic data based on locale
  const faqData = getFaqData(locale)
  const testimonialData = getTestimonialData(locale)

  // Fix for scroll issue - prevent overflow on body
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [menuOpen])

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Navigation - Fixed header with proper z-index */}
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
                {translations.hero.tagline}
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
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {translations.nav.features}
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {translations.nav.pricing}
            </Link>
            <Link
              href="#testimonials"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {translations.nav.testimonials}
            </Link>
            <Link
              href="#faq"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {translations.nav.faq}
            </Link>
            <LanguageSwitcher />
            <ModeToggle />
            <Link href="/sign-up">
              <Button size="sm">{translations.nav.signUp}</Button>
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
                  {translations.nav.features}
                </Link>
                <Link
                  href="#pricing"
                  className="block text-sm font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setMenuOpen(false)}
                >
                  {translations.nav.pricing}
                </Link>
                <Link
                  href="#testimonials"
                  className="block text-sm font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setMenuOpen(false)}
                >
                  {translations.nav.testimonials}
                </Link>
                <Link
                  href="#faq"
                  className="block text-sm font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setMenuOpen(false)}
                >
                  {translations.nav.faq}
                </Link>
                <Link
                  className="inline-block w-full mt-4"
                  href="/sign-up"
                  onClick={() => setMenuOpen(false)}
                >
                  <Button className="w-full" size="sm">
                    {translations.nav.startFreeTrial}
                  </Button>
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section - Improved design with better value proposition */}
      <section className="relative py-20 md:py-32 lg:py-40 overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="mx-auto max-w-4xl text-center space-y-8"
          >
            {/* Badge */}
            <motion.div variants={fadeIn}>
              <Badge className="px-4 py-1.5 text-sm font-semibold bg-primary text-primary-foreground">
                {translations.hero.badge}
              </Badge>
            </motion.div>

            {/* Main headline with gradient */}
            <motion.h1
              variants={fadeIn}
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight"
            >
              <span className="bg-gradient-to-r from-primary via-primary to-primary bg-clip-text text-transparent">
                {translations.hero.title}
              </span>
              <br />
              <span className="text-foreground">{translations.hero.titleBreak}</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeIn}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
            >
              {translations.hero.subtitle}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeIn}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/sign-up">
                <Button size="lg" className="min-w-[200px]">
                  {translations.hero.cta.trial}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="min-w-[200px]">
                  {translations.hero.cta.demo}
                </Button>
              </Link>
            </motion.div>

            {/* Disclaimer */}
            <motion.p variants={fadeIn} className="text-sm text-muted-foreground">
              {translations.hero.cta.disclaimer}
            </motion.p>
          </motion.div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary rounded-full blur-3xl" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary rounded-full blur-3xl" />
        </div>
      </section>

      {/* Features Section - Grid layout with icons */}
      <section id="features" className="py-20 md:py-32 bg-muted">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeIn}
            className="text-center space-y-4 mb-16"
          >
            <Badge className="px-4 py-1.5 text-sm font-semibold">
              {translations.features.badge}
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold">{translations.features.title}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {translations.features.subtitle}
            </p>
          </motion.div>

          {/* Desktop Grid */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="hidden md:grid md:grid-cols-3 gap-6"
          >
            {Object.entries(translations.features.items).map(([key, feature]) => {
              const Icon = featureIcons[key as keyof typeof featureIcons]
              return (
                <motion.div key={key} variants={scaleIn}>
                  <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-muted">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary">
                          <Icon className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <CardTitle className="text-xl">{feature.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Mobile Carousel */}
          <div className="md:hidden overflow-hidden">
            <Carousel
              opts={{
                align: 'start',
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent>
                {Object.entries(translations.features.items).map(([key, feature]) => {
                  const Icon = featureIcons[key as keyof typeof featureIcons]
                  return (
                    <CarouselItem key={key} className="basis-full">
                      <motion.div variants={fadeIn} className="p-1">
                        <Card className="h-full">
                          <CardHeader>
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 rounded-lg bg-primary">
                                <Icon className="h-6 w-6 text-primary-foreground" />
                              </div>
                              <CardTitle className="text-xl">{feature.title}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground">{feature.description}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </CarouselItem>
                  )
                })}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold">{translations.howItWorks.title}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {translations.howItWorks.subtitle}
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12"
          >
            {Object.entries(translations.howItWorks.steps).map(([key, step], index) => (
              <motion.div key={key} variants={slideIn} className="relative text-center">
                {/* Step number */}
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold shadow-lg">
                  {index + 1}
                </div>

                {/* Connection line (desktop only) */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full h-[2px] bg-gradient-to-r from-primary to-primary" />
                )}

                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section - Improved cards */}
      <section id="pricing" className="py-20 md:py-32 bg-muted">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold">{translations.pricing.title}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {translations.pricing.subtitle}
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
          >
            {/* LITE Plan */}
            <motion.div variants={scaleIn}>
              <Card className="relative h-full overflow-hidden border-2 hover:border-primary transition-colors">
                <div className="absolute top-0 left-0 right-0 h-2 bg-palette-3-foreground" />
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">
                    {subscriptionTranslations.litePlan}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {subscriptionTranslations.litePlanDescription}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">¥6,000</span>
                    <span className="text-muted-foreground">
                      {subscriptionTranslations.perMonth}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {subscriptionTranslations.features.lite.slice(0, 5).map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/sign-up" className="w-full">
                    <Button className="w-full" size="lg">
                      {subscriptionTranslations.startNow}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>

            {/* PRO Plan */}
            <motion.div variants={scaleIn}>
              <Card className="relative h-full overflow-hidden  transition-colors">
                <div className="absolute top-0 left-0 right-0 h-2 bg-palette-1-foreground" />
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">
                    {subscriptionTranslations.proPlan}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {subscriptionTranslations.proPlanDescription}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">¥9,980</span>
                    <span className="text-muted-foreground">
                      {subscriptionTranslations.perMonth}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {subscriptionTranslations.features.pro.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/sign-up" className="w-full">
                    <Button className="w-full" size="lg" variant="default">
                      {subscriptionTranslations.startNow}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          </motion.div>

          <motion.p variants={fadeIn} className="text-center text-sm text-muted-foreground mt-8">
            {translations.pricing.disclaimer}
          </motion.p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold">{translations.testimonials.title}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {translations.testimonials.subtitle}
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto"
          >
            {testimonialData.map((testimonial, index) => (
              <motion.div key={index} variants={scaleIn}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {testimonial.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 text-yellow-500 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" />
                        </svg>
                      ))}
                    </div>
                    <blockquote className="text-muted-foreground italic">
                      &ldquo;{testimonial.content}&rdquo;
                    </blockquote>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 md:py-32 bg-muted">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold">{translations.nav.faq}</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="max-w-3xl mx-auto"
          >
            <Accordion type="single" collapsible className="w-full">
              {faqData.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  viewport={{ once: true }}
                >
                  <AccordionItem value={`item-${index}`} className="border rounded-lg px-4 mb-4">
                    <AccordionTrigger className="text-left hover:no-underline py-4">
                      <span className="font-medium">{item.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center space-y-6 max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-5xl font-bold">
              {translations.cta.title}
              <br />
              {translations.cta.titleBreak}
            </h2>
            <p className="text-lg opacity-90">{translations.cta.subtitle}</p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/sign-up">
                <Button size="lg" variant="secondary" className="min-w-[250px]">
                  {translations.cta.button}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
            <p className="text-sm opacity-75">{translations.cta.disclaimer}</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background border-t">
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
              <p className="text-sm text-muted-foreground">{translations.footer.tagline}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">{translations.footer.sections.product}</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="#features"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {translations.footer.links.features}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {translations.footer.links.pricing}
                  </Link>
                </li>
                <li>
                  {/* FIXME: デモページを作成する */}
                  <Link href="/#" className="text-sm text-muted-foreground hover:text-foreground">
                    {translations.footer.links.demo}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">{translations.footer.sections.support}</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground">
                    {translations.footer.links.faq}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {translations.footer.links.contact}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">{translations.footer.sections.company}</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/about"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {translations.footer.links.about}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {translations.footer.links.privacyPolicy}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {translations.footer.links.termsOfUse}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <Separator className="mb-8" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{translations.footer.copyright}</p>
            <div className="flex items-center gap-4">
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Instagram"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
