'use client'

import { useEffect, useState } from 'react'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'


export default function ControlledProgressBar() {
  const [progress, setProgress] = useState<number>(0)
  const t = useTranslations('common.uploader')

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev: number) => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + 2
      })
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = () => {
    return (
      <div className="relative">
        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-accent-2 to-accent-2 flex items-center justify-center">
          <Upload className="w-3 h-3 text-accent-2-foreground" />
        </div>
        <div className="absolute inset-0 bg-accent-2 rounded-full animate-ping opacity-20" />
      </div>
    )
  }

  const getProgressColor = (): string => {
    if (progress === 80) return 'from-green-400 to-emerald-500'
    if (progress > 60) return 'from-blue-400 to-purple-500'
    if (progress > 30) return 'from-cyan-400 to-blue-500'
    return 'from-indigo-400 to-cyan-500'
  }

  return (
    <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black/30 backdrop-blur-sm z-50">
      <div className="w-full mx-auto mt-8 p-6 max-w-md">
        {/* メインカード */}
        <div className="bg-background backdrop-blur-sm rounded-2xl shadow-2xl border border-border p-6 space-y-6">
          {/* ヘッダー部分 */}
          <div className="flex items-start justify-center gap-4">
            {getStatusIcon()}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {progress !== 100 ? t('uploading') : t('uploadComplete')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {progress === 100 ? t('processingComplete') : t('progressPercent', { progress })}
              </p>
            </div>
          </div>

          {/* プログレスバー */}
          <div className="space-y-3">
            <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getProgressColor()} rounded-full transition-all duration-300 ease-out`}
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-accent-2 animate-pulse rounded-full" />
                {/* グリッター効果 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-2 to-transparent animate-shimmer" />
              </div>
            </div>

            {/* 進捗テキスト */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('start')}</span>
              <span className="font-medium">{progress}%</span>
              <span>{t('complete')}</span>
            </div>
          </div>

          {/* 警告メッセージ */}
          {progress !== 100 && (
            <div className="flex items-start gap-3 p-3 bg-destructive border border-destructive-foreground rounded-xl">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-xs text-destructive-foreground">
                <p className="text-destructive-foreground font-bold">{t('importantNote')}</p>
                <p className="text-destructive-foreground mt-1">
                  {t('navigationWarning')}
                </p>
              </div>
            </div>
          )}

          {/* 完了メッセージ */}
          {progress === 100 && (
            <div className="text-center p-4 bg-accent-2-foreground border border-accent-2 rounded-xl">
              <div className="flex items-center justify-center gap-2 text-accent-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium text-sm">{t('uploadSuccess')}</span>
              </div>
            </div>
          )}
        </div>

        {/* 浮遊パーティクル効果 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i: number) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-accent-2 rounded-full animate-float opacity-60"
              style={{
                left: `${20 + i * 15}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + (i % 2)}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
