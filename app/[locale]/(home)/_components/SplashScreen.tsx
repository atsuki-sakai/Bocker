'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onComplete, 500) // フェードアウト完了後にコールバック実行
    }, 2000) // 2秒表示

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
          }}
        >
          {/* 中央のロゴとアニメーション */}
          <div className="relative flex flex-col items-center justify-center">
            {/* ロゴコンテナ */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.8,
                ease: [0.25, 0.46, 0.45, 0.94],
                delay: 0.2,
              }}
              className="relative mb-8"
            >
              {/* ロゴの外側のリング */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  duration: 1.2,
                  ease: 'easeOut',
                  delay: 0.5,
                }}
                className="absolute inset-0 w-32 h-32 border-2 border-accent rounded-full"
              />

              {/* 実際のロゴ画像 */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.6,
                  ease: 'easeOut',
                  delay: 0.8,
                }}
                className="relative z-10 w-28 h-28 flex items-center justify-center border-2 border-accent rounded-full p-4 shadow-lg"
              >
                <Image
                  src="/assets/images/logo-darkgreen.png"
                  alt="Bocker Logo"
                  width={80}
                  height={80}
                  className="w-full h-full object-contain"
                />
              </motion.div>
            </motion.div>

            {/* ブランド名 */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.6,
                ease: 'easeOut',
                delay: 1.2,
              }}
              className="text-center"
            >
              <h1 className="text-2xl font-bold text-foreground mb-2">Bocker</h1>
            </motion.div>

            {/* ローディングインジケーター */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{
                duration: 2,
                ease: 'easeInOut',
                delay: 1.5,
              }}
              className="mt-8 w-32 h-0.5 bg-primary/20 rounded-full overflow-hidden"
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  duration: 1.5,
                  ease: 'easeInOut',
                  delay: 1.5,
                }}
                className="h-full bg-primary rounded-full"
              />
            </motion.div>

            {/* パルス効果 */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [0.8, 1.2, 0.8],
                opacity: [0, 0.3, 0],
              }}
              transition={{
                duration: 2,
                ease: 'easeInOut',
                repeat: Infinity,
                delay: 1,
              }}
              className="absolute w-32 h-32 border border-primary/10 rounded-full"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [0.8, 1.4, 0.8],
                opacity: [0, 0.2, 0],
              }}
              transition={{
                duration: 2,
                ease: 'easeInOut',
                repeat: Infinity,
                delay: 1.3,
              }}
              className="absolute w-40 h-40 border border-primary/5 rounded-full"
            />
          </div>

          {/* 背景のパーティクル効果 */}
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                opacity: 0,
                scale: 0,
                x: Math.random() * 400 - 200,
                y: Math.random() * 400 - 200,
              }}
              animate={{
                opacity: [0, 0.5, 0],
                scale: [0, 1, 0],
                y: [0, -50, -100],
              }}
              transition={{
                duration: 3,
                ease: 'easeOut',
                delay: 1 + i * 0.3,
                repeat: Infinity,
                repeatDelay: 2,
              }}
              className="absolute w-1 h-1 bg-primary/30 rounded-full"
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}