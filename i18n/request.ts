import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'
import { isAppLocale } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  // This can either be defined statically at the top level or based on a prop
  let locale = await requestLocale

  // Ensure that a valid locale is used
  if (!locale || !isAppLocale(locale)) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../languages/${locale}.json`)).default,
  }
})
