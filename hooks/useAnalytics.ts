import { useEffect, useCallback } from 'react'
import Cookies from 'js-cookie'
import { v4 as uuidv4 } from 'uuid'
import { usePathname, useSearchParams } from 'next/navigation'
import { sha256 } from '@/lib/crypto'

const SESSION_COOKIE_NAME = 'bocker_tracking_session'
const UTM_PARAMS_KEY = 'bocker_utm_params'

// --- Helper Functions ---

/**
 * Prevents duplicate page view tracking for the same session and pathname.
 * Returns true if tracking should proceed, false if it's a duplicate.
 */
const preventDuplicatePageView = (sessionId: string, pathname: string): boolean => {
  const trackingKey = `tracked_${sessionId}_${pathname}`
  if (sessionStorage.getItem(trackingKey)) {
    console.log('[Analytics] Duplicate page view prevented:', { sessionId, pathname })
    return false // 既に送信済み
  }
  sessionStorage.setItem(trackingKey, 'true')
  return true // 送信OK
}

/**
 * Gets the session ID from cookies or creates a new one.
 * Session lasts for 30 minutes of inactivity.
 */
const getSessionId = (): string => {
  let sessionId = Cookies.get(SESSION_COOKIE_NAME)
  if (!sessionId) {
    sessionId = uuidv4()
  }
  // Reset expiry on each call
  Cookies.set(SESSION_COOKIE_NAME, sessionId, { expires: 1 / 48 }) // 30 minutes
  return sessionId
}

/**
 * Retrieves stored UTM parameters from sessionStorage.
 */
const getUtmParams = (): Record<string, string> => {
  const storedParams = sessionStorage.getItem(UTM_PARAMS_KEY)
  return storedParams ? JSON.parse(storedParams) : {}
}

/**
 * Stores UTM parameters from URL to sessionStorage.
 * Only stores if they exist in the search params.
 */
const storeUtmParams = (searchParams: URLSearchParams) => {
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
  const newUtmParams: Record<string, string> = {}
  let hasNewParams = false

  utmKeys.forEach((key) => {
    if (searchParams.has(key)) {
      const value = searchParams.get(key)
      if (value) {
        newUtmParams[key] = value
        hasNewParams = true
      }
    }
  })

  if (hasNewParams) {
    sessionStorage.setItem(UTM_PARAMS_KEY, JSON.stringify(newUtmParams))
  }
}

// --- Core Tracking Function ---

const sendTrackingEvent = async (eventData: object) => {
  try {
    await fetch('/api/tracking/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    })
  } catch (error) {
    // Silently fail to not impact user experience
    console.error('Tracking API request failed:', error)
  }
}

// --- The Hook ---

export const useAnalytics = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Effect to store UTM parameters on initial load or when they change
  useEffect(() => {
    if (searchParams) {
      storeUtmParams(searchParams)
    }
  }, [searchParams])

  const trackPageView = useCallback(() => {
    const sessionId = getSessionId()
    
    // 重複チェック
    if (!preventDuplicatePageView(sessionId, pathname)) {
      return // 重複のため送信をスキップ
    }

    const utmParams = getUtmParams()

    const eventData = {
      session_id: sessionId,
      event_type: 'page_view',
      page_url: pathname,
      page_title: document.title,
      ...utmParams,
    }

    console.log('[Analytics] Sending page_view:', eventData)
    sendTrackingEvent(eventData)
  }, [pathname])

  const trackConversion = useCallback(
    async (conversionType: string, customData?: Record<string, unknown>) => {
      const sessionId = getSessionId()
      const utmParams = getUtmParams()
      const processedCustomData = { ...customData }

      // Hash email if it exists
      if (processedCustomData?.email && typeof processedCustomData.email === 'string') {
        const salt = process.env.NEXT_PUBLIC_PII_SALT
        if (!salt) {
          console.warn('NEXT_PUBLIC_PII_SALT is not defined. Email will not be tracked.')
          delete processedCustomData.email
        } else {
          const email = processedCustomData.email
          delete processedCustomData.email
          processedCustomData.email_hash = await sha256(`${salt}:${email}`)
        }
      }

      sendTrackingEvent({
        session_id: sessionId,
        event_type: 'conversion',
        conversion_type: conversionType,
        page_url: pathname,
        ...utmParams,
        custom_data_json: processedCustomData,
      })
    },
    [pathname]
  )

  return { trackPageView, trackConversion }
}

// --- Helper Function for Route Filtering ---

/**
 * Determines if the current route should be tracked.
 * Only tracks (reservation) and (customer) routes, excluding complete pages.
 */
const shouldTrackRoute = (pathname: string): boolean => {
  // 受付完了ページは除外
  if (pathname.includes('/complete')) {
    console.log('[Analytics] Route check - Complete page excluded:', { pathname })
    return false
  }
  
  const shouldTrack = pathname.includes('/reservation/')
  console.log('[Analytics] Route check:', { pathname, shouldTrack })
  return shouldTrack
}

// --- Component to integrate tracking ---

export const AnalyticsTracker = () => {
  const { trackPageView } = useAnalytics()
  const pathname = usePathname()

  // Effect to track page views on route change (only for specific routes)
  useEffect(() => {
    console.log('[Analytics] AnalyticsTracker mounted/updated:', { pathname })
    if (shouldTrackRoute(pathname)) {
      console.log('[Analytics] Triggering trackPageView')
      trackPageView()
    } else {
      console.log('[Analytics] Route not tracked')
    }
  }, [trackPageView, pathname])

  return null // This component renders nothing
}
