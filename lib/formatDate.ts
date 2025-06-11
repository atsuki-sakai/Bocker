// lib/formatDate.ts
import { format, formatDistance, formatDistanceToNow, formatRelative } from 'date-fns';
import type { SupportedLocale } from './dateLocale';
import { getDateFnsLocale } from './dateLocale';

export async function formatDate(
  date: Date,
  fmt: string,
  localeCode: SupportedLocale
): Promise<string> {
  const locale = await getDateFnsLocale(localeCode);
  return format(date, fmt, { locale });
}

export async function formatDateDistance(
  date: Date,
  baseDate: Date,
  localeCode: SupportedLocale
): Promise<string> {
  const locale = await getDateFnsLocale(localeCode);
  return formatDistance(date, baseDate, { locale });
}

export async function formatDateDistanceToNow(
  date: Date,
  localeCode: SupportedLocale,
  options?: { addSuffix?: boolean }
): Promise<string> {
  const locale = await getDateFnsLocale(localeCode);
  return formatDistanceToNow(date, { locale, ...options });
}

export async function formatDateRelative(
  date: Date,
  baseDate: Date,
  localeCode: SupportedLocale
): Promise<string> {
  const locale = await getDateFnsLocale(localeCode);
  return formatRelative(date, baseDate, { locale });
}