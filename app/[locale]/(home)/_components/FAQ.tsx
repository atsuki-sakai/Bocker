'use client'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { motion } from 'framer-motion'
const getFaqData = (locale: string) => {
  const faqData = {
    ja: [
      {
        question: 'Bockerはどのようなサロン向けのサービスですか？',
        answer:
          'Bockerは、美容院、ネイルサロン、エステサロンなどの予約ベースのサービス業向けの最先端SaaSプラットフォームです。独自のハイブリッドデータベース構成と楽観的在庫管理システムにより、業界標準の1/2以下の運用コストで、99.9%の稼働率を実現。予約の重複を完全に防ぐ技術的優位性があり、30日間の無料トライアルでリスクなく導入いただけます。',
      },
      {
        question: 'どのような機能がありますか？',
        answer:
          '主な機能として：1) 予約管理（24時間365日オンライン予約、ダブルブッキング100%防止保証）、2) 顧客管理（360度顧客ビュー、来店履歴完全追跡）、3) スタッフ管理（シフト管理、パフォーマンス分析）、4) ポイント・クーポンシステム（Proプラン以上）、5) 決済管理（Stripe Connect統合、自動精算）、6) 分析機能（リアルタイムデータ分析）を提供しています。',
      },
      {
        question: '導入による具体的なメリットは何ですか？',
        answer:
          '1) 人件費削減：予約電話対応時間を月30時間から5時間に削減（月10万円相当の削減効果）、2) 売上向上：オンライン予約による成約率15%向上、ポイント・クーポンによるリピート率20%向上、平均客単価8%向上、3) 機会損失削減：リマインダーによるノーショー率40%減少、予約ミスのゼロ化、稼働率10%向上が期待できます。',
      },
      {
        question: '料金プランを教えてください',
        answer:
          'LITEプラン（月額8,000円/年額80,000円）はサロン運営に必要な基本機能を網羅し、予約件数は月500件、顧客登録数500人、スタッフ3人、メニュー20点、オプション15点、クーポン10点まで対応。PROプラン（月額12,000円/年額120,000円）はLITEの全機能に加え、カルテ画像4枚・音声入力、メニュー60点、スタッフ12人、オプション30点、クーポン30点、予約数・顧客数は無制限。どちらも30日間無料トライアル・解約手数料なし・いつでもプラン変更可能です。',
      },
      {
        question: '他の予約システムと比べて何が違いますか？',
        answer:
          '1) 技術的優位性：「楽観的在庫管理」によりレースコンディション下でも99.9%のダブルブッキングを防止。ハイブリッドDB構成で超高速レスポンスを実現。スマホからでもサクサク操作可能。2) 経済的優位性：明確なROIと即時の投資回収、追加費用なしの透明な料金体系。3) 充実のサポート体制：専任担当者による導入支援、初期設定代行、継続的なオンラインサポート。速さ・信頼性・サポートの3点で他社と大きく差別化しています。',
      },
      {
        question: 'セキュリティ面は安全ですか？',
        answer:
          'エンタープライズグレードのセキュリティを提供しています。TLS1.3による通信暗号化、AES-256によるデータ暗号化、定期的なセキュリティ監査を実施。また、個人情報保護法完全準拠、GDPR対応、PCI DSS準拠のカード情報保護体制を整えています。さらに、マルチリージョン冗長化による高可用性設計で、毎時自動バックアップも実施しています。',
      },
    ],
    en: [
      {
        question: 'What is Bocker and who is it for?',
        answer:
          'Bocker is a cutting-edge SaaS platform for appointment-based service businesses like beauty salons, nail salons, and aesthetic salons. With our unique hybrid database architecture and optimistic inventory management system, we achieve 99.9% uptime at half the industry-standard operating costs. We guarantee zero double bookings and offer a 30-day free trial for risk-free implementation.',
      },
      {
        question: 'What features does Bocker offer?',
        answer:
          'Key features include: 1) Reservation management (24/7 online booking, 100% double-booking prevention), 2) Customer management (360-degree customer view, complete visit tracking), 3) Staff management (shift management, performance analytics), 4) Points & coupon system (Pro plan and above), 5) Payment management (Stripe Connect integration, automatic settlement), 6) Analytics (real-time data analysis).',
      },
      {
        question: 'What are the concrete benefits of implementing Bocker?',
        answer:
          '1) Labor cost reduction: Phone reservation time reduced from 30 to 5 hours monthly (¥100,000 monthly savings), 2) Revenue increase: 15% higher booking conversion rate, 20% higher repeat rate with points/coupons, 8% higher average customer spending, 3) Loss prevention: 40% reduction in no-shows, zero booking errors, 10% improved operational efficiency.',
      },
      {
        question: 'What are your pricing plans?',
        answer:
          'LITE plan (¥8,000/month or ¥80,000/year) covers all essential salon features: up to 500 bookings/month, 500 customers, 3 staff, 20 menu items, 15 options, 10 coupons. PRO plan (¥12,000/month or ¥120,000/year) includes all LITE features plus 4 image/voice charting, up to 60 menu items, 12 staff, 30 options, 30 coupons, and unlimited bookings/customers. Both plans offer a 30-day free trial, no cancellation fees, and flexible plan changes.',
      },
      {
        question: 'How does Bocker differ from other booking systems?',
        answer:
          '1) Technical advantage: Industry-exclusive "optimistic inventory management" prevents double bookings even under race conditions. Hybrid DB architecture ensures ultra-fast response. 2) Economic advantage: Clear ROI and immediate investment recovery, fully transparent pricing with no hidden fees. 3) Comprehensive support: Dedicated onboarding, initial setup service, and ongoing online support. Bocker stands out for speed, reliability, and support.',
      },
      {
        question: 'How secure is the platform?',
        answer:
          'We provide enterprise-grade security with TLS 1.3 encryption for communications, AES-256 data encryption, and regular security audits. We are fully compliant with Personal Information Protection Law, GDPR-ready, and PCI DSS compliant for payment data. Additionally, we implement multi-region redundancy for high availability and perform hourly automatic backups.',
      },
    ],
  }
  return faqData[locale as keyof typeof faqData] || faqData.ja
}

export function FAQ({ locale }: { locale: string }) {
  const faqs = getFaqData(locale)
  const t = useTranslations('landing.faq')
  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
          >
            {t('title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
            className="mt-6 text-base/7 text-muted-foreground"
          >
            {t('subtitle')}
            <Link
              href="/contact"
              className="mx-3 font-semibold text-link-foreground hover:text-link-foreground/80"
            >
              {t('cta')}
            </Link>
          </motion.p>
        </div>
        <div className="mt-20">
          <dl className="space-y-16 sm:grid sm:grid-cols-2 sm:space-y-0 sm:gap-x-6 sm:gap-y-16 lg:gap-x-10">
            {faqs.map((faq, index) => (
              <div key={index}>
                <motion.dt
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 + index * 0.1 }}
                  className="text-base/7 font-semibold text-foreground"
                >
                  {faq.question}
                </motion.dt>
                <motion.dd
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.6 + index * 0.1 }}
                  className="mt-2 text-base/7 text-muted-foreground"
                >
                  {faq.answer}
                </motion.dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
