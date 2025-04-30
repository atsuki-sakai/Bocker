'use client'

import React, { createContext, useEffect, useState } from 'react'
import liff from '@line/liff'

type LiffContextType = {
  liff: typeof liff | null
  isLoggedIn: boolean
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
  profile: null,
})

export function LiffProvider({ children, liffId }: { children: React.ReactNode; liffId: string }) {
  const [liffObject, setLiffObject] = useState<typeof liff | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [profile, setProfile] = useState<LiffContextType['profile']>(null)

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liff = (await import('@line/liff')).default
        await liff.init({
          liffId,
        })
        setLiffObject(liff)

        if (liff.isLoggedIn()) {
          setIsLoggedIn(true)
          const profile = await liff.getProfile()
          setProfile({
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            email: liff.getDecodedIDToken()?.email,
          })
        }
      } catch (error) {
        console.error('LIFF initialization failed', error)
      }
    }

    initLiff()
  }, [liffId])

  return (
    <LiffContext.Provider value={{ liff: liffObject, isLoggedIn, profile }}>
      {children}
    </LiffContext.Provider>
  )
}
