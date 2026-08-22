'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AppLocale } from '@/i18n/config'

export function LanguageSwitcher() {
  const locale = useLocale()
  const t = useTranslations('language')
  const router = useRouter()
  const pathname = usePathname()

  const locales = [
    { value: 'ja', label: t('japanese'), flag: '🇯🇵' },
    { value: 'en', label: t('english'), flag: '🇺🇸' },
    { value: 'th', label: t('thai'), flag: '🇹🇭' },
  ] satisfies ReadonlyArray<{ value: AppLocale; label: string; flag: string }>

  const handleLocaleChange = (newLocale: AppLocale) => {
    router.push(pathname, { locale: newLocale })
  }

  const currentLocale = locales.find((l) => l.value === locale)

  return (
    <Select
      data-testid="language-switch"
      value={locale}
      onValueChange={(value) => handleLocaleChange(value as AppLocale)}
    >
      <SelectTrigger className="h-9 w-auto min-w-[132px] border-border/80 bg-card/90 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/60">
        <div className="flex items-center gap-2">
          <SelectValue>
            <span className="flex items-center gap-1">
              <span>{currentLocale?.flag}</span>
              <span className="text-xs">{currentLocale?.label}</span>
            </span>
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {locales.map((loc) => (
          <SelectItem key={loc.value} value={loc.value}>
            <div className="flex items-center gap-2">
              <span>{loc.flag}</span>
              <span>{loc.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
