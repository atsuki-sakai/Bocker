'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'
import { getLocaleMetadata } from '@/i18n/config'

const speechErrorKeys: Record<string, string> = {
  network: 'errors.network',
  'not-allowed': 'errors.notAllowed',
  'no-speech': 'errors.noSpeech',
  'audio-capture': 'errors.audioCapture',
  'service-not-allowed': 'errors.serviceNotAllowed',
}

interface VoiceInputButtonProps {
  onResult: (transcript: string) => void
  disabled?: boolean
  className?: string
}

export const VoiceInputButton = ({
  onResult,
  disabled = false,
  className,
}: VoiceInputButtonProps) => {
  const locale = useLocale()
  const t = useTranslations('voiceInput')
  // 音声認識の結果を処理
  const handleVoiceResult = (transcript: string) => {
    // 結果をテキストエリアに追加
    onResult(transcript)
    // toastは手動停止時にのみ表示するため、ここでは表示しない
  }

  // 音声認識のエラーを処理
  const handleVoiceError = (error: string) => {
    const key = speechErrorKeys[error] ?? 'errors.unknown'
    toast.error(t(key, { error }))
  }

  // 音声認識hook
  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    onResult: handleVoiceResult,
    onError: handleVoiceError,
    language: getLocaleMetadata(locale).speechRecognitionLang,
    continuous: true,
  })

  // ボタンクリック時の処理
  const handleClick = () => {
    if (!isSupported) {
      toast.error(t('unsupported'))
      return
    }

    if (isListening) {
      stopListening()
      toast.success(t('stopped'))
    } else {
      startListening()
      toast.info(t('started'))
    }
  }

  // ブラウザがサポートしていない場合は表示しない
  if (!isSupported) {
    return null
  }

  return (
    <Button
      size={'sm'}
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'transition-all duration-200',
        isListening &&
          'duration-1000 bg-destructive hover:bg-opacity-80 text-destructive-foreground shadow-lg ring-2 ring-destructive animate-pulse',
        className
      )}
      title={isListening ? t('stopTitle') : t('startTitle')}
    >
      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      <span className="ml-2">{isListening ? t('stop') : t('label')}</span>
    </Button>
  )
}
