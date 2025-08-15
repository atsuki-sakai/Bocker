import { useEffect, useCallback } from 'react'
import Cookies from 'js-cookie'
import { v4 as uuidv4 } from 'uuid'
import { usePathname, useSearchParams } from 'next/navigation'

const SESSION_COOKIE_NAME = 'bcker_tracking_session'
const UTM_PARAMS_KEY = 'bcker_utm_params'

// --- Helper Functions ---

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
    const utmParams = getUtmParams()

    sendTrackingEvent({
      session_id: sessionId,
      event_type: 'page_view',
      page_url: pathname,
      page_title: document.title,
      ...utmParams,
    })
  }, [pathname])

  const trackConversion = useCallback((conversionType: string, customData?: object) => {
    const sessionId = getSessionId()
    const utmParams = getUtmParams()

    sendTrackingEvent({
      session_id: sessionId,
      event_type: 'conversion',
      conversion_type: conversionType,
      page_url: pathname,
      ...utmParams,
      custom_data_json: customData,
    })
  }, [pathname])

  return { trackPageView, trackConversion }
}

// --- Component to integrate tracking ---

export const AnalyticsTracker = () => {
  const { trackPageView } = useAnalytics()

  // Effect to track page views on route change
  useEffect(() => {
    trackPageView()
  }, [trackPageView])

  return null // This component renders nothing
}
