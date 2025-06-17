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

/**
 * 日付をYYYY-MM-DD形式の文字列に変換（日本時間）
 * @param date 変換する日付
 * @returns YYYY-MM-DD形式の文字列
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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