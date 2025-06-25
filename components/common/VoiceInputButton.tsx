'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
  // 音声認識の結果を処理
  const handleVoiceResult = (transcript: string) => {
    // 結果をテキストエリアに追加
    onResult(transcript)
    // toastは手動停止時にのみ表示するため、ここでは表示しない
  }

  // 音声認識のエラーを処理
  const handleVoiceError = (error: string) => {
    toast.error(error)
  }

  // 音声認識hook
  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    onResult: handleVoiceResult,
    onError: handleVoiceError,
    language: 'ja-JP', // FIXME: 言語を選択できるようにする
    continuous: true,
  })

  // ボタンクリック時の処理
  const handleClick = () => {
    if (!isSupported) {
      toast.error('お使いのブラウザは音声入力に対応していません')
      return
    }

    if (isListening) {
      stopListening()
      toast.success('音声入力を停止しました')
    } else {
      startListening()
      toast.info('音声入力を開始しました。話してください')
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
      title={isListening ? '音声入力を停止' : '音声入力を開始'}
    >
      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      <span className="ml-2">{isListening ? '停止' : '音声入力'}</span>
    </Button>
  )
}
