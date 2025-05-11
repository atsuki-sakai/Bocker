// app/page.tsx
"use client";

import Link from "next/link";
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
import { CheckIcon, MenuIcon, XIcon } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from '@/components/common'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

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
      staggerChildren: 0.2,
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

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="flex flex-col min-h-screen bg-background text-primary w-screen overflow-x-hidden">
      {/* ナビゲーション */}
      <header className="w-full py-4 px-4 sticky top-0 bg-background backdrop-blur-md z-50 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <div className="flex items-center">
              <Image
                src={
                  mounted && resolvedTheme === 'dark'
                    ? '/assets/images/logo-white.png'
                    : '/assets/images/logo-darkgreen.png'
                }
                alt="Bocker"
                width={42}
                height={42}
              />
              <h1 className="text-2xl font-bold">Bocker</h1>
            </div>
          </motion.div>

          {/* モバイルメニューボタン */}
          <div className="md:hidden flex items-center space-x-2">
            <ModeToggle />
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <XIcon /> : <MenuIcon />}
            </Button>
          </div>

          {/* デスクトップナビゲーション */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden md:flex items-center space-x-8"
          >
            <nav className="flex items-center space-x-6">
              <Link
                href="#features"
                className="text-muted-foreground hover:text-primary font-medium transition-colors"
              >
                機能
              </Link>
              <Link
                href="#pricing"
                className="text-muted-foreground hover:text-primary font-medium transition-colors"
              >
                料金
              </Link>
              <Link
                href="#testimonials"
                className="text-muted-foreground hover:text-primary font-medium transition-colors"
              >
                お客様の声
              </Link>
              <Link
                href="#faq"
                className="text-muted-foreground hover:text-primary font-medium transition-colors"
              >
                よくある質問
              </Link>
            </nav>
            <Link href="/sign-up">
              <Button>アカウントを作成</Button>
            </Link>
            <ModeToggle />
          </motion.div>

          {/* モバイルメニュー */}
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="absolute top-16 left-0 right-0 bg-background shadow-lg p-4 md:hidden"
            >
              <nav className="flex flex-col space-y-4">
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-primary font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  機能
                </Link>
                <Link
                  href="#pricing"
                  className="text-muted-foreground hover:text-primary font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  料金
                </Link>
                <Link
                  href="#testimonials"
                  className="text-muted-foreground hover:text-primary font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  お客様の声
                </Link>
                <Link
                  href="#faq"
                  className="text-muted-foreground hover:text-primary font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  よくある質問
                </Link>
                <Button>無料で始める</Button>
              </nav>
            </motion.div>
          )}
        </div>
      </header>

      <section className="w-full py-20 md:py-32 relative overflow-x-hidden">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="container px-4 md:px-6 mx-auto relative z-10"
        >
          <div className="flex flex-col items-center space-y-8 text-center max-w-4xl mx-auto">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-6"
            >
              <motion.div variants={fadeIn}>
                <Badge className="px-4 py-1.5 text-sm align-baseline font-bold rounded-full mb-6 bg-pop text-pop-foreground">
                  月額 <span className="text-lg md:text-xl font-bold mx-1">¥5,980</span>〜
                </Badge>
              </motion.div>
              <motion.h1
                variants={fadeIn}
                className="tracking-wide text-2xl md:text-6xl font-bold  bg-gradient-to-r from-gray-700 via-green-800 to-green-900 dark:from-gray-200 dark:via-green-400 dark:to-green-300 bg-clip-text text-transparent"
              >
                予約<span className="text-xl md:text-4xl">も</span>顧客
                <span className="text-xl md:text-4xl">も</span>
                売上<span className="text-xl md:text-4xl">も</span>集客
                <span className="text-xl md:text-4xl">も</span>。
                <br />
                <span className="text-pretty xl:text-nowrap">
                  サロン運営のすべてがBocker <br />
                  ひとつで完結。
                </span>
              </motion.h1>
              <motion.p
                variants={fadeIn}
                className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
              >
                メニュー予約管理システムで日々の業務を効率化し、
                <br className="hidden md:block" />
                お客様の満足度をさらに高めましょう
              </motion.p>
            </motion.div>

            <motion.div
              variants={fadeIn}
              className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full justify-center mt-8"
            >
              <Link href="/sign-up">
                <Button size="lg" className="font-bold text-xl md:text-2xl">
                  30日間無料トライアル
                </Button>
              </Link>
            </motion.div>

            <motion.div variants={fadeIn} className="text-xs text-muted-foreground mt-2">
              ご契約はキャンセル料金不要でいつでもキャンセル可能
            </motion.div>
          </div>
        </motion.div>

        {/* 装飾的な背景要素 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-200 dark:bg-cyan-700 rounded-full filter blur-3xl opacity-20 z-0"
        ></motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="absolute -bottom-32 -left-32 w-96 h-96 bg-green-300 dark:bg-green-700 rounded-full filter blur-3xl opacity-20 z-0"
        ></motion.div>
      </section>
      {/* 特徴セクション */}
      <section id="features" className="w-full py-20 md:py-32 bg-background relative">
        <div className="container px-4 md:px-6 mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeIn}
            className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
          >
            <Badge className="px-4 py-1.5 text-sm font-bold rounded-full mb-4">主な機能</Badge>
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-green-700 to-green-800 dark:from-green-300 dark:to-green-400 bg-clip-text text-transparent">
              すべての予約管理機能を一つに
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground mt-4">
              予約、顧客、売上、メニュー管理、顧客分析からマーケティングまで、サロン経営に必要なすべての機能を提供します。
            </p>
          </motion.div>

          {/* スマートフォン表示用のカルーセル */}
          <div className="md:hidden">
            <Carousel
              opts={{
                align: 'start',
                loop: true,
              }}
              className="w-full max-w-xs sm:max-w-sm mx-auto" // SP表示での幅を調整
            >
              <CarouselContent>
                {[
                  {
                    title: 'スマート予約管理',
                    description:
                      '24時間365日オンライン受付＆来店前メニュー選択でお客様の利便性を最大化。店舗側も事前に人数やメニューを把握し、準備コストと待ち時間を大幅削減。',
                    icon: '📅',
                  },
                  {
                    title: '予約枠最適化アルゴリズム',
                    description:
                      '独自の予約枠生成アルゴリズムでサロンに合わせた、最適な予約枠とシフトを自動生成。空き時間を最小化し、売上最大化と稼働率向上を同時に実現。',
                    icon: '🤖',
                  },
                  {
                    title: 'デジタルカルテ',
                    description:
                      '施術履歴や肌・髪の状態、ビフォーアフター写真を一元管理。音声入力やAI画像解析で記録負担を軽減し、スムーズな情報共有を実現。',
                    icon: '🗂️',
                  },
                  {
                    title: '業務まるごと効率化',
                    description:
                      '予約・顧客管理からスタッフ配置・ポイント・決済までオールインワン。複数ツール不要で管理工数を半減し、運営コストを大幅削減。',
                    icon: '⚡',
                  },
                  {
                    title: '美容師の使いやすさ',
                    description:
                      '直感的なシンプルUIでIT初心者でも即操作可能。実際の作業フローに沿った設計で新規スタッフの教育コストとミスを抑制。',
                    icon: '✨',
                  },
                  {
                    title: '安心のサポート体制',
                    description:
                      '紙・Excelデータの移行から初期設定、マニュアル・動画チュートリアルまで充実。チャットでの伴走型サポートで導入不安を徹底解消。',
                    icon: '💬',
                  },
                  {
                    title: '販促＆リピート促進',
                    description:
                      '顧客データを活用したパーソナライズDMと自動リマインダーで無断キャンセルを減少。ポイント＆クーポンでファン化と継続利用を加速。',
                    icon: '🎁',
                  },
                ].map((feature, index) => (
                  <CarouselItem key={index} className="basis-full">
                    {' '}
                    {/* SPでは1アイテムが全幅 */}
                    <motion.div variants={fadeIn} className="p-1">
                      <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader className="flex flex-row justify-center items-center gap-4">
                          <div className="text-2xl">{feature.icon}</div>
                          <CardTitle className="text-2xl font-bold text-primary text-center">
                            {feature.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">{feature.description}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="absolute left-[-20px] top-1/2 -translate-y-1/2" />
              <CarouselNext className="absolute right-[-20px] top-1/2 -translate-y-1/2" />
            </Carousel>
          </div>

          {/* PC表示用のグリッド */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="hidden md:grid md:grid-cols-3 gap-8" // md以上で表示
          >
            {[
              {
                title: 'スマート予約管理',
                description:
                  '24時間365日オンライン受付＆来店前メニュー選択でお客様の利便性を最大化。店舗側も事前に人数やメニューを把握し、準備コストと待ち時間を大幅削減。',
                icon: '📅',
              },
              {
                title: 'メニュー管理',
                description:
                  '季節限定や特別コースも直感的に追加・編集し、即時ウェブサイト反映。常に最新情報を発信して集客力アップとリピーター獲得を支援。',
                icon: '🍽️',
              },
              {
                title: '顧客データ分析',
                description:
                  '予約履歴や嗜好データをAI解析し、一人ひとりに最適なサービスを自動提案。パーソナライズでリピート率と客単価の同時向上を実現。',
                icon: '📊',
              },
              {
                title: 'デジタルカルテ',
                description:
                  '施術履歴や肌・髪の状態、ビフォーアフター写真を一元管理。音声入力やAI画像解析で記録負担を軽減し、スムーズな情報共有を実現。',
                icon: '🗂️',
              },
              {
                title: '業務まるごと効率化',
                description:
                  '予約・顧客管理からスタッフ配置・ポイント・決済までオールインワン。複数ツール不要で管理工数を半減し、運営コストを大幅削減。',
                icon: '⚡',
              },
              {
                title: '美容師の使いやすさ',
                description:
                  '直感的なシンプルUIでIT初心者でも即操作可能。実際の作業フローに沿った設計で新規スタッフの教育コストとミスを抑制。',
                icon: '✨',
              },
              {
                title: '安心のサポート体制',
                description:
                  '紙・Excelデータの移行から初期設定、マニュアル・動画チュートリアルまで充実。チャット・電話での伴走型サポートで導入不安を徹底解消。',
                icon: '💬',
              },
              {
                title: '販促＆リピート促進',
                description:
                  '顧客データを活用したパーソナライズDMと自動リマインダーで無断キャンセルを減少。ポイント＆クーポンでファン化と継続利用を加速。',
                icon: '🎁',
              },
              {
                title: '予約枠最適化アルゴリズム',
                description:
                  '独自AIが過去実績と需要予測を解析し、最適な予約枠とシフトを自動生成。空き時間を最小化し、売上最大化と稼働率向上を実現。',
                icon: '🤖',
              },
            ].map((feature, index) => (
              <motion.div key={index} variants={fadeIn}>
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row justify-center items-center gap-4">
                    <div className="text-2xl">{feature.icon}</div>
                    <CardTitle className="text-2xl font-bold text-primary text-center">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* 使い方セクション */}
      <section className="w-full py-20 md:py-32 bg-background relative overflow-hidden">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="container px-4 md:px-6 mx-auto relative z-10"
        >
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-green-700 to-green-800 dark:from-green-300 dark:to-green-400 bg-clip-text text-transparent">
              簡単3ステップで始める
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground mt-4">
              わずか数分で設定完了、すぐに予約の受付を開始できます
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-8"
          >
            {[
              {
                step: 1,
                title: 'アカウント登録',
                description: '簡単な情報入力でアカウントを作成し、店舗情報を設定します。',
              },
              {
                step: 2,
                title: 'メニューの設定',
                description:
                  'あなたの美容院・サロンのスタッフとメニューを入力し、予約可能な時間帯を設定します。',
              },
              {
                step: 3,
                title: '予約受付開始',
                description:
                  '予約ページのリンクをお客様に共有し、すぐに予約を受け付け開始できます。',
              },
            ].map((step, index) => (
              <motion.div
                key={index}
                variants={slideIn}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pop text-pop-foreground text-2xl font-bold mb-6 shadow-lg">
                  {step.step}
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground max-w-xs">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>
      {/* 料金セクション */}
      <section id="pricing" className="w-full py-20 md:py-32 bg-background">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="container px-4 md:px-6 mx-auto"
        >
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-green-700 to-green-800 dark:from-green-300 dark:to-green-400 bg-clip-text text-transparent">
              シンプルな料金プラン
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground mt-4">
              追加料金なし、すべての機能が使い放題
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mx-auto"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="overflow-hidden border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
                <motion.div>
                  <div className="bg-palette-5-foreground px-6 py-4">
                    <h3 className="text-xl font-bold text-white text-center">LITE</h3>
                  </div>
                  <CardHeader className="pb-0">
                    <div className="text-center flex items-center justify-center text-base">
                      <div className="text-5xl font-bold  mb-2">¥5,980</div>
                      <CardDescription className="text-muted-foreground text-lg">
                        / 月額
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 h-full">
                    <ul className="space-y-4">
                      {[
                        '予約カレンダー基本機能',
                        '最大3名までのスタッフ管理',
                        '基本的なお客様情報管理',
                        '予約管理 (予約カレンダー, スタッフスケジュール設定, 予約確認・変更・キャンセル, 24/365オンライン予約)',
                        '顧客管理（基本情報, 予約・購入履歴）',
                        'スタッフ管理 (アカウント作成, 基本的な予約・シフト管理)',
                        'メニュー設定 (サービス登録, 料金・所要時間設定)',
                        '自動リマインド・通知 (メール・SMS)',
                        'スタッフ数(3名)、メニュー数(15件)、予約数(100件/月)が無制限',
                      ].map((feature, index) => (
                        <motion.li
                          key={index}
                          className="flex items-start"
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          viewport={{ once: true }}
                        >
                          <div className="rounded-full bg-active p-1 mr-3 mt-0.5">
                            <CheckIcon className="h-4 w-4 text-active-foreground" />
                          </div>
                          <span className="text-foreground">{feature}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      size="lg"
                      className="bg-palette-5-foreground text-white hover:opacity-80 w-full"
                    >
                      今すぐ始める
                    </Button>
                  </CardFooter>
                </motion.div>
              </Card>
              <Card className="overflow-hidden border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
                <motion.div>
                  <div className="bg-palette-3-foreground px-6 py-4">
                    <h3 className="text-xl font-bold text-white text-center">PRO</h3>
                  </div>
                  <CardHeader className="pb-0">
                    <div className="text-center flex items-center justify-center text-base">
                      <div className="text-5xl font-bold  mb-2">¥9,980</div>
                      <CardDescription className="text-muted-foreground text-lg">
                        / 月額
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ul className="space-y-4">
                      {[
                        'LITEプランの全機能',
                        'カルテ管理 (施術内容の詳細記録, 画像添付機能, 薬剤使用履歴管理, カルテテンプレート機能, 施術者引継ぎ機能)',
                        'ポイント・クーポン機能 (カスタマイズ可能なポイント付与システム, クーポン管理)',
                        'スタッフ数、メニュー数、予約数が無制限',
                      ].map((feature, index) => (
                        <motion.li
                          key={index}
                          className="flex items-start"
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          viewport={{ once: true }}
                        >
                          <div className="rounded-full bg-active p-1 mr-3 mt-0.5">
                            <CheckIcon className="h-4 w-4 text-active-foreground" />
                          </div>
                          <span className="text-foreground">{feature}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      size="lg"
                      className="bg-palette-3-foreground text-white hover:opacity-80 w-full"
                    >
                      今すぐ始める
                    </Button>
                  </CardFooter>
                </motion.div>
              </Card>
            </div>
            <p className="text-center text-muted-foreground mt-4">
              いつでもキャンセル可能・30日間無料トライアル
            </p>
          </motion.div>
        </motion.div>
      </section>
      {/* お客様の声セクション */}
      <section
        id="testimonials"
        className="w-full py-20 md:py-32 bg-background relative overflow-hidden"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="container px-4 md:px-6 mx-auto relative z-10"
        >
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-green-900 to-green-800 dark:from-green-300 dark:to-green-400 bg-clip-text text-transparent">
              お客様の声
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground mt-4">
              多くの美容院・サロンオーナーに選ばれています
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {[
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
            ].map((testimonial, index) => (
              <motion.div key={index} variants={fadeIn}>
                <motion.div whileHover={{ y: -5 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-background overflow-hidden">
                    <CardContent className="p-8">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-12 w-12 border-2 border-blue-100">
                          <AvatarImage src="/api/placeholder/40/40" alt={testimonial.name} />
                          <AvatarFallback className="bg-palette-1 text-palette-1-foreground">
                            {testimonial.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className="w-5 h-5 text-yellow-400 fill-current"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" />
                              </svg>
                            ))}
                          </div>
                          <p className="text-lg font-bold text-foreground">{testimonial.name}</p>
                          <p className="text-active text-sm">{testimonial.role}</p>
                        </div>
                      </div>
                      <blockquote className="mt-6 text-muted-foreground italic">
                        &quot;{testimonial.content}&quot;
                      </blockquote>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>
      {/* FAQ セクション */}
      <section id="faq" className="w-full py-20 md:py-32 bg-background">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="container px-4 md:px-6 mx-auto"
        >
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-green-900 to-green-800 dark:from-green-300 dark:to-green-400 bg-clip-text text-transparent">
              よくある質問
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground mt-4">
              お客様からよく寄せられる質問にお答えします
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <Accordion type="multiple" className="w-full">
              {[
                {
                  question: 'Bckerはどのようなサロン向けのサービスですか？',
                  answer:
                    'Bckerは、主に美容院、ネイルサロン、エステサロンといった予約ベースのサービス業を対象としたSaaSプラットフォームです。\n小規模サロン（スタッフ3名以下）から大規模サロン（スタッフ8名以上）まで、幅広い規模のサロンに対応しています。\n特に、デジタル化（DX）を進めたいものの、システム導入にハードルを感じているサロン や、業務効率化によるコスト削減、顧客体験向上 を目指しているサロンをターゲットとしています。\n日本の美容サロン市場はDXの遅れが指摘されており、紙媒体での管理や電話予約が多い現状があるため、こうしたデジタル化の余地が大きい市場で、使いやすさと機能性を両立させたソリューションとして普及を目指しています。',
                },
                {
                  question: 'どのような機能がありますか？',
                  answer:
                    'Bckerは、美容サロンの業務効率化と顧客体験向上に貢献する多様な機能を備えており、サロン運営に関わる様々な業務をBcker一つで一元管理できます。\n予約管理:\n◦ 24時間365日、オンラインでの予約受付が可能です。\n◦ カレンダー形式の直感的なインターフェースで予約を管理できます。\n◦ 予約の確認・変更・キャンセルを一元管理できます。\n◦ 複数スタッフの予約スケジュールを調整できます。\n顧客管理:\n◦ 顧客情報をデータベース化し、連絡先、予約履歴、購入履歴などを管理できます。\n◦ 詳細な顧客プロフィール管理や顧客行動分析機能、カスタマイズ可能な顧客タグ機能などを備えています。パーソナライズされたサービス提供に役立ちます。\nスタッフ管理: スタッフアカウントの作成、権限設定、予約・シフト管理、パフォーマンス分析機能を提供します。\nカルテ管理 (Proプラン以上):\n◦ 施術内容の詳細記録、画像添付、薬剤使用履歴管理、カルテテンプレート機能など、施術に関する情報をデジタルで一元管理できます。\n◦ ペーパーレス化と情報共有を促進します。\nポイント・クーポン機能 (Proプラン以上):\n◦ カスタマイズ可能なポイント付与システムや、割引クーポンの管理により、リピート促進施策をサポートします。\n料金・決済管理: メニュー管理、予約と紐づけた売上管理、Stripe決済連携、売上レポートなどが可能です。',
                },
                {
                  question: '他の予約システムとの違いは何ですか？',
                  answer:
                    '直感的でモダンなUI/UX設計に注力しており、ITに不慣れな美容師やスタッフでも使いやすいシンプルなインターフェースを目指しています。\nスタッフ人数に応じた柔軟な料金プラン設定により、サロン規模に合わせた無駄のない費用で利用できます。\n予約、顧客管理に加え、カルテ、ポイント、クーポン、決済といったサロン運営に必要な主要機能をBckerプラットフォーム内で完結できる点が特徴です。\nリアルタイム同期により、複数端末からの同時操作でも情報がリアルタイムに同期されるため、現場での連携がスムーズです。\n日本語に完全最適化された国産SaaSとして、日本の美容業界の商慣習やニーズに合わせたシステムと質の高い日本語サポートを提供します。\n将来的には、美容業界特化のAIによる予約最適化アルゴリズム（隙間時間最小化、需要予測など）を搭載し、サロンの稼働率向上に貢献することを目指しています。',
                },
                {
                  question: 'Bckerを導入すると、サロン経営にどのような良い影響がありますか？',
                  answer:
                    '業務効率化:\n◦ 電話予約対応時間の削減（月平均30時間→5時間）や予約ミスの防止、スタッフシフト管理の効率化、ペーパーレス化による管理コスト削減 が期待できます。\n◦ 導入事例ベースでは、**月間約10万円の業務効率化効果（人件費換算）**が見込まれています。\n売上・リピート率向上:\n◦ オンライン予約導入により予約成約率が平均15%向上。\n◦ ポイント・クーポン施策により顧客リピート率が平均20%向上。\n◦ 予約リマインダー機能によりノーショー率が平均40%減少。\n顧客体験向上:\n◦ 顧客情報の一元管理やデジタルカルテにより、パーソナライズされた接客が可能になり、顧客満足度向上につながります。\nデータに基づいた経営:\n◦ 売上レポートや顧客分析機能により、データに基づいた効果的な販促施策や経営判断が可能になります。',
                },
                {
                  question: '無料トライアルはありますか？',
                  answer:
                    'はい、30日間の無料トライアル期間が全てのプランに含まれています。\nトライアル期間中、Bockerの全機能を試用できます。\n無料トライアル期間中でもいつでもキャンセルまたはプラン変更が可能です。',
                },
                {
                  question: '導入にどれくらい時間がかかりますか？',
                  answer:
                    'ウェブサイトからのサインアップとアカウント作成は約5分で完了します。\nサロン基本情報やメニュー、スタッフ設定などを進め、設定が完了すればオンラインでの予約受付を開始できます。\n導入時のオンボーディングサポート や、専任のサポートスタッフによるデータ移行のお手伝いも提供されるため、ITツールに不慣れなサロンでも安心して導入を進められます。',
                },
                {
                  question: '解約はいつでもできますか？',
                  answer:
                    'はい、30日間の無料トライアル期間中はいつでもキャンセルまたはプラン変更が可能です。\n有料プラン契約後の解約に関する具体的な違約金の有無や手続きなどはございません。',
                },
                {
                  question: 'カスタマーサポートはどのように受けられますか？',
                  answer:
                    '画面右下のチャットサポート（平日10:00-18:00）が利用できます。\n「伴走型サポート」でお客様に寄り添う体制を目指しています。',
                },

                {
                  question: 'ITに詳しくないのですが、操作は難しくないですか？',
                  answer:
                    'BckerはITに不慣れな美容師の方でも直感的に使えるよう、シンプルでモダンなUI/UXに注力しています。\n日々の作業フローに沿った画面設計で、迷うことなくスムーズに操作できることを目指しています。\n導入時のオンボーディングサポート や、使い方マニュアル、ビデオチュートリアル が充実しており、**「伴走型サポート」**でお客様に寄り添います。チャットや電話での問い合わせ対応も可能です。',
                },

                {
                  question: 'セキュリティは大丈夫ですか？',
                  answer:
                    '技術情報として、TLS暗号化、データ暗号化保存、定期的なセキュリティ監査を実施していることが示唆されています。\n顧客の肌トラブルなどセンシティブな情報を扱うため、特に高度なセキュリティ対策が必要であるという認識があります。\n予約サービスが停止するとサロン経営に直結するため、可用性(Availability)の確保が大きな課題であり、SLA(Service Level Agreement)で可用性99.9%保証などを提示することが競合優位に繋がるとされています。\nクラウド依存リスク対策や障害発生時の迅速な復旧、SNSやメールでのステータス通知といった障害対応フローの整備も重要です。\nグローバル展開を視野に入れる場合、GDPRやCCPA/CPRAといった各国の個人情報保護規制、日本では電子帳簿保存法 への対応が必要となります。ローカライズにおいて、データホスティングの地域（EU内、国内など）も考慮されます。',
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  viewport={{ once: true }}
                >
                  <AccordionItem
                    value={`item-${index}`}
                    className="border border-border rounded-lg mb-4 overflow-hidden"
                  >
                    <AccordionTrigger className="px-6 py-4 text-lg font-medium text-foreground text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-6 py-4 text-muted-foreground text-balance leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </div>
        </motion.div>
      </section>
      {/* CTA セクション */}
      <section className="w-full py-20 md:py-32 bg-pop text-pop-foreground relative overflow-hidden">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="container px-4 md:px-6 mx-auto relative z-10"
        >
          <div className="flex flex-col items-center justify-center space-y-8 text-center max-w-3xl mx-auto">
            <motion.h2 variants={fadeIn} className="text-3xl md:text-5xl font-bold ">
              あなたのビジネスを、
              <br />
              今日から変えませんか？
            </motion.h2>
            <motion.p variants={fadeIn} className="text-xl text-secondary-foreground">
              月額15,000円で、予約管理の悩みから解放されましょう
            </motion.p>
            <motion.div
              variants={fadeIn}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <Button size="lg" className="">
                30日間無料トライアル
              </Button>
            </motion.div>
            <motion.p variants={fadeIn} className="text-secondary-foreground">
              クレジットカードのみで簡単登録・いつでもキャンセル可能
            </motion.p>
          </div>
        </motion.div>

        {/* 装飾的な背景要素 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-chart-1 rounded-full"></div>
          <div className="absolute top-40 left-20 w-60 h-60 bg-chart-2 rounded-full"></div>
          <div className="absolute bottom-40 right-20 w-60 h-60 bg-chart-3 rounded-full"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-chart-4 rounded-full"></div>
        </div>
      </section>
      {/* フッター */}
      <footer className="w-full py-12 bg-background text-muted-foreground">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center">
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

                <h3 className="text-xl font-bold text-foreground">Bocker</h3>
              </div>
              <p className="text-muted-foreground text-xs">美容サロン向け運営管理システム</p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4">製品</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="#features"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    機能
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    料金
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    デモ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4">サポート</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="#faq"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    よくある質問
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    お問い合わせ
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ヘルプセンター
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4">会社情報</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    会社概要
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    プライバシーポリシー
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    利用規約
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <Separator className="my-8 bg-border" />
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-muted-foreground text-xs">© 2025 Bocker. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
