'use client'

import React, { createContext, useEffect, useState } from 'react'
import liff from '@line/liff'

type LiffContextType = {
  liff: typeof liff | null
  isLoggedIn: boolean
  isLoading: boolean
  isInitialized: boolean
  isError: boolean
  errorMessage: string | null
  profile: {
    userId: string
    displayName: string
    pictureUrl?: string
    email?: string
  } | null
}

export const LiffContext = createContext<LiffContextType>({
  liff: null,
  isLoggedIn: false,
  isLoading: true,
  isInitialized: false,
  isError: false,
  errorMessage: null,
  profile: null,
})

export function LiffProvider({ children, liffId }: { children: React.ReactNode; liffId: string }) {
  const [liffObject, setLiffObject] = useState<typeof liff | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [profile, setProfile] = useState<LiffContextType['profile']>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const MAX_RETRIES = 3
    const RETRY_DELAY = 1500 // ms

    const initLiff = async () => {
      if (isInitialized || retryCount > MAX_RETRIES) return

      setIsLoading(true)
      setIsError(false)
      setErrorMessage(null)

      try {
        console.log(`[LiffProvider] Initializing LIFF (attempt ${retryCount + 1})...`)

        // LIFFをインポート
        const liffModule = (await import('@line/liff')).default

        // LIFFを初期化
        await liffModule.init({
          liffId,
        })

        console.log('[LiffProvider] LIFF initialized successfully')
        setLiffObject(liffModule)
        setIsInitialized(true)

        // ログイン状態を確認
        const loggedIn = liffModule.isLoggedIn()
        setIsLoggedIn(loggedIn)

        if (loggedIn) {
          try {
            // プロフィール情報を取得
            const profile = await liffModule.getProfile()
            const token = liffModule.getDecodedIDToken()

            setProfile({
              userId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
              email: token?.email,
            })
            console.log('[LiffProvider] LIFF profile loaded successfully')
          } catch (profileError) {
            console.error('[LiffProvider] Failed to get profile', profileError)
            // プロフィール取得の失敗は重大なエラーではない
          }
        }
      } catch (error) {
        console.error('[LiffProvider] LIFF initialization failed', error)
        setIsError(true)
        setErrorMessage(error instanceof Error ? error.message : 'LIFF初期化に失敗しました')

        // リトライロジック
        if (retryCount < MAX_RETRIES) {
          console.log(`[LiffProvider] Retrying LIFF initialization in ${RETRY_DELAY}ms...`)
          setTimeout(() => {
            setRetryCount((prev) => prev + 1)
          }, RETRY_DELAY)
        }
      } finally {
        setIsLoading(false)
      }
    }

    initLiff()
  }, [liffId, retryCount, isInitialized])

  return (
    <LiffContext.Provider
      value={{
        liff: liffObject,
        isLoggedIn,
        isLoading,
        isInitialized,
        isError,
        errorMessage,
        profile,
      }}
    >
      {children}
    </LiffContext.Provider>
  )
}
