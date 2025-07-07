'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
export function CTASection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
      viewport={{ once: true, amount: 0.2 }}
      className="bg-neon-foreground"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:flex lg:items-center lg:justify-between lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          viewport={{ once: true, amount: 0.2 }}
          className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
        >
          ご利用を開始する
          <br />
          今すぐ無料トライアルを開始
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
          viewport={{ once: true, amount: 0.2 }}
          className="mt-10 flex items-center gap-x-6 lg:mt-0 lg:shrink-0"
        >
          <Link
            href="#"
            className="rounded-md bg-background border border-neon px-3.5 py-2.5 text-sm font-semibold text-neon shadow-xs hover:bg-neon-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link-foreground"
          >
            {' '}
            無料トライアルを開始{' '}
          </Link>
          <Link href="#" className="text-sm/6 font-semibold text-neon">
            詳細を見る
            <span aria-hidden="true">→</span>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}
