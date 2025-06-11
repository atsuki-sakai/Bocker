import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['ja', 'en'],

  // Used when no locale matches
  defaultLocale: 'ja',

  // Path prefix configuration
  pathnames: {
    // If all locales use the same pathname, a single string can be provided
    '/': '/',
    '/dashboard': '/dashboard',
    '/sign-in': '/sign-in',
    '/sign-up': '/sign-up'
  }
});