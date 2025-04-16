// app/page.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, ArrowRightIcon, MenuIcon, XIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { useState } from "react";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const staggerContainer = {
hidden: { opacity: 0 },
visible: {
  opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const slideIn = {
  hidden: { x: -60, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      {/* ナビゲーション */}
      <header className="w-full py-4 px-4 sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Bcker
              </h1>
              <p className="text-xs text-gray-500">美容サロンの予約管理システム</p>
            </div>
          </motion.div>

          {/* モバイルメニューボタン */}
          <div className="md:hidden">
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
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
              >
                機能
              </Link>
              <Link
                href="#pricing"
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
              >
                料金
              </Link>
              <Link
                href="#testimonials"
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
              >
                お客様の声
              </Link>
              <Link
                href="#faq"
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
              >
                よくある質問
              </Link>
            </nav>
            <Link href="/sign-up">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md">
                アカウントを作成
              </Button>
            </Link>
          </motion.div>

          {/* モバイルメニュー */}
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="absolute top-16 left-0 right-0 bg-white shadow-lg p-4 md:hidden"
            >
              <nav className="flex flex-col space-y-4">
                <a
                  href="#features"
                  className="text-gray-600 hover:text-blue-600 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  機能
                </a>
                <a
                  href="#pricing"
                  className="text-gray-600 hover:text-blue-600 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  料金
                </a>
                <a
                  href="#testimonials"
                  className="text-gray-600 hover:text-blue-600 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  お客様の声
                </a>
                <a
                  href="#faq"
                  className="text-gray-600 hover:text-blue-600 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  よくある質問
                </a>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 w-full">
                  無料で始める
                </Button>
              </nav>
            </motion.div>
          )}
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="w-full py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 z-0"></div>
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
                <Badge className="px-4 py-1.5 text-sm font-medium bg-blue-100 text-blue-800 rounded-full mb-6">
                  月額15,000円から
                </Badge>
              </motion.div>
              <motion.h1
                variants={fadeIn}
                className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-700 bg-clip-text text-transparent"
              >
                美容院の予約管理を、
                <br className="hidden md:block" />
                もっとスマートに
              </motion.h1>
              <motion.p
                variants={fadeIn}
                className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed"
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
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                >
                  30日間無料トライアル
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  alert('相談する。：ここで公式ラインなどで質問を受け付ける');
                }}
                className="text-base px-8 py-6 border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                導入の相談をする
              </Button>
            </motion.div>

            <motion.div variants={fadeIn} className="text-sm text-gray-500 mt-6">
              ご契約はキャンセル料金不要でいつでもキャンセル可能
            </motion.div>
          </div>
        </motion.div>

        {/* 装飾的な背景要素 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl opacity-20 z-0"
        ></motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-400 rounded-full filter blur-3xl opacity-20 z-0"
        ></motion.div>
      </section>

      {/* 特徴セクション */}
      <section id="features" className="w-full py-20 md:py-32 bg-white">
        <div className="container px-4 md:px-6 mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeIn}
            className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
          >
            <Badge className="px-4 py-1.5 text-sm font-medium bg-blue-100 text-blue-800 rounded-full mb-4">
              主な機能
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
              すべての予約管理機能を一つに
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 mt-4">
              予約からメニュー管理、顧客分析まで、飲食店経営に必要なすべての機能を提供します
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              {
                title: 'スマート予約管理',
                description:
                  '24時間自動でお客様の予約を受け付け。来店前のメニュー選択も可能で、準備の効率化につながります。',
                icon: '📅',
              },
              {
                title: 'メニュー管理',
                description:
                  '季節のメニューや特別コースも簡単に追加・編集。リアルタイムでウェブサイトに反映されます。',
                icon: '🍽️',
              },
              {
                title: '顧客データ分析',
                description:
                  '予約履歴や好みのメニューを分析し、パーソナライズされたサービスを提供できます。',
                icon: '📊',
              },
            ].map((feature, index) => (
              <motion.div key={index} variants={fadeIn}>
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader>
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mt-20 text-center"
          >
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              全ての機能を見る <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 使い方セクション */}
      <section className="w-full py-20 md:py-32 bg-gray-50 relative overflow-hidden">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="container px-4 md:px-6 mx-auto relative z-10"
        >
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
              簡単3ステップで始める
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 mt-4">
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
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-2xl font-bold mb-6 shadow-lg">
                  {step.step}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 max-w-xs">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* 装飾的な背景要素 */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50 to-transparent opacity-70 z-0"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-full bg-gradient-to-r from-indigo-50 to-transparent opacity-70 z-0"></div>
      </section>

      {/* 料金セクション */}
      <section id="pricing" className="w-full py-20 md:py-32 bg-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="container px-4 md:px-6 mx-auto"
        >
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
              シンプルな料金プラン
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 mt-4">
              追加料金なし、すべての機能が使い放題
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mx-auto max-w-md"
          >
            <Card className="overflow-hidden border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white">プロプラン</h3>
                </div>
                <CardHeader className="pb-0">
                  <div className="text-center">
                    <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                      ¥15,000
                    </div>
                    <CardDescription className="text-gray-500 text-lg">月額</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-4">
                    {[
                      '無制限の予約受付',
                      'メニュー管理機能',
                      'リマインド機能',
                      '顧客データ分析',
                      'メール・SMS通知',
                      '24時間カスタマーサポート',
                    ].map((feature, index) => (
                      <motion.li
                        key={index}
                        className="flex items-start"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        viewport={{ once: true }}
                      >
                        <div className="rounded-full bg-blue-100 p-1 mr-3 mt-0.5">
                          <CheckIcon className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-gray-700">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
                    今すぐ始める
                  </Button>
                </CardFooter>
              </motion.div>
            </Card>
            <p className="text-center text-gray-500 mt-4">
              クレジットカード不要・30日間無料トライアル
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* お客様の声セクション */}
      <section
        id="testimonials"
        className="w-full py-20 md:py-32 bg-gray-50 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-blue-50 z-0"></div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="container px-4 md:px-6 mx-auto relative z-10"
        >
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
              お客様の声
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 mt-4">
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
                name: '田中 健太',
                role: '美容院オーナー',
                content:
                  '導入前は電話予約の管理に追われていましたが、今ではスタッフの負担が大幅に減り、お客様の満足度も向上しました。特にメニュー管理機能が便利です。',
                initials: 'TK',
              },
              {
                name: '山田 美子',
                role: 'ネイルサロンオーナー',
                content:
                  '顧客データ分析機能で常連のお客様の好みを把握できるようになり、よりパーソナライズされたサービスを提供できるようになりました。売上も20%アップしています。',
                initials: 'YM',
              },
            ].map((testimonial, index) => (
              <motion.div key={index} variants={fadeIn}>
                <motion.div whileHover={{ y: -5 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden">
                    <CardContent className="p-8">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-12 w-12 border-2 border-blue-100">
                          <AvatarImage src="/api/placeholder/40/40" alt={testimonial.name} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
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
                          <p className="text-lg font-bold text-gray-900">{testimonial.name}</p>
                          <p className="text-blue-600 text-sm">{testimonial.role}</p>
                        </div>
                      </div>
                      <blockquote className="mt-6 text-gray-700 italic">
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
      <section id="faq" className="w-full py-20 md:py-32 bg-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="container px-4 md:px-6 mx-auto"
        >
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
              よくある質問
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 mt-4">
              お客様からよく寄せられる質問にお答えします
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              {[
                {
                  question: '無料トライアルはありますか？',
                  answer:
                    'はい、30日間の無料トライアルをご用意しています。クレジットカード情報なしで、すべての機能をお試しいただけます。',
                },
                {
                  question: '導入にどれくらい時間がかかりますか？',
                  answer:
                    '基本的な設定は約15分で完了します。メニューの登録など、詳細な設定も含めても1時間程度で導入できます。専任のサポートスタッフがセットアップをお手伝いします。',
                },
                // {
                //   question: "既存の予約システムからデータを移行できますか？",
                //   answer:
                //     "はい、CSVファイルでのインポートに対応しています。また、専任のサポートスタッフがデータ移行のお手伝いをいたします。既存システムからの移行もスムーズに行えます。",
                // },
                {
                  question: '解約はいつでもできますか？',
                  answer:
                    'はい、いつでも解約可能です。解約時の違約金や追加料金は一切ありません。解約はアカウント設定画面から簡単に行えます。',
                },
                {
                  question: 'カスタマーサポートはどのように受けられますか？',
                  answer:
                    'メール、チャット、電話でのサポートを平日9時から18時まで提供しています。緊急の場合は24時間対応のホットラインもご利用いただけます。導入後もしっかりとサポートいたします。',
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
                    className="border border-gray-200 rounded-lg mb-4 overflow-hidden"
                  >
                    <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 text-lg font-medium text-gray-900 text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-6 py-4 text-gray-700">
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
      <section className="w-full py-20 md:py-32 bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative overflow-hidden">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="container px-4 md:px-6 mx-auto relative z-10"
        >
          <div className="flex flex-col items-center justify-center space-y-8 text-center max-w-3xl mx-auto">
            <motion.h2 variants={fadeIn} className="text-3xl md:text-5xl font-bold text-white">
              あなたのビジネスを、
              <br />
              今日から変えませんか？
            </motion.h2>
            <motion.p variants={fadeIn} className="text-xl text-blue-100">
              月額15,000円で、予約管理の悩みから解放されましょう
            </motion.p>
            <motion.div
              variants={fadeIn}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-6 shadow-xl"
              >
                30日間無料トライアル
              </Button>
            </motion.div>
            <motion.p variants={fadeIn} className="text-blue-100">
              クレジットカード情報不要・いつでもキャンセル可能
            </motion.p>
          </div>
        </motion.div>

        {/* 装飾的な背景要素 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300 rounded-full"></div>
          <div className="absolute top-40 left-20 w-60 h-60 bg-indigo-300 rounded-full"></div>
          <div className="absolute bottom-40 right-20 w-60 h-60 bg-blue-300 rounded-full"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 rounded-full"></div>
        </div>
      </section>

      {/* フッター */}
      <footer className="w-full py-12 bg-gray-900 text-gray-300">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Bcker</h3>
              <p className="text-gray-400 text-sm">
                美容院・サロン向け予約管理
                <br />
                SaaSサービス
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-4">製品</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-gray-400 hover:text-white transition-colors">
                    機能
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">
                    料金
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    デモ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-4">サポート</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#faq" className="text-gray-400 hover:text-white transition-colors">
                    よくある質問
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    お問い合わせ
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    ヘルプセンター
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-4">会社情報</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    会社概要
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    プライバシーポリシー
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    利用規約
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <Separator className="my-8 bg-gray-800" />
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-gray-500">© 2025 Bcker. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
