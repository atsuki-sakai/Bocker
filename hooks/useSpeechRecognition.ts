'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// 音声認識のブラウザサポート状況を確認
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic
    webkitSpeechRecognition: SpeechRecognitionStatic
  }
}

interface UseSpeechRecognitionProps {
  onResult: (transcript: string) => void
  onError?: (error: string) => void
  language?: string
  continuous?: boolean
}

export const useSpeechRecognition = ({
  onResult,
  onError,
  language = 'ja-JP',
  continuous = true,
}: UseSpeechRecognitionProps) => {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const shouldRestartRef = useRef(false) // onend で再起動するかどうか
  const isIOS = /iP(hone|ad|od)/.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')

  // ブラウザサポート確認
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
    }
  }, [])

  // 音声認識の設定と初期化
  const initializeRecognition = useCallback(() => {
    if (!recognitionRef.current) return

    const recognition = recognitionRef.current

    // 音声認識の設定
    recognition.continuous = !isIOS && continuous
    recognition.interimResults = true
    recognition.lang = language

    // 音声認識開始時
    recognition.onstart = () => {
      setIsListening(true)
      shouldRestartRef.current = true
    }

    // 音声認識終了時
    recognition.onend = () => {
      if (continuous && shouldRestartRef.current) {
        try {
          recognition.start() // 擬似連続再開
          return
        } catch (err) {
          // 再開に失敗した場合はリスニング状態を終了させる
          console.error('音声認識の再開に失敗しました:', err)
        }
      }
      setIsListening(false)
    }

    // 音声認識結果を受信時
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''

      // 最新の結果のみを処理
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript

        // 最終結果のみを処理（重複を防ぐ）
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        }
      }

      // 最終結果がある場合のみ結果を返す
      if (finalTranscript.trim()) {
        onResult(finalTranscript.trim())
      }
    }

    // エラー時
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('音声認識エラー:', event.error)
      setIsListening(false)

      let errorMessage = '音声認識でエラーが発生しました'
      
      switch (event.error) {
        case 'network':
          errorMessage = 'ネットワークエラーです。インターネット接続を確認してください'
          break
        case 'not-allowed':
          errorMessage = 'マイクへのアクセスが許可されていません'
          break
        case 'no-speech':
          errorMessage = '音声が検出されませんでした'
          break
        case 'audio-capture':
          errorMessage = 'マイクが利用できません'
          break
        case 'service-not-allowed':
          errorMessage =
            '現在スマートフォンでの音声認識はサポートしていません。ご不便ですがPCでのご利用をお願いします。'
          break
        default:
          errorMessage = `音声認識エラー: ${event.error}`
      }

      if (onError) {
        onError(errorMessage)
      }
    }
  }, [onResult, onError, language])

  // 音声認識開始
  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current || isListening) {
      return
    }

    try {
      initializeRecognition()
      shouldRestartRef.current = true
      recognitionRef.current.start()
    } catch (error) {
      console.error('音声認識の開始に失敗しました:', error)
      if (onError) {
        onError('音声認識の開始に失敗しました')
      }
    }
  }, [isSupported, isListening, initializeRecognition, onError])

  // 音声認識停止
  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) {
      return
    }

    try {
      shouldRestartRef.current = false
      recognitionRef.current.stop()
    } catch (error) {
      console.error('音声認識の停止に失敗しました:', error)
    }
  }, [isListening])

  // 音声認識を切り替え
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  }
}