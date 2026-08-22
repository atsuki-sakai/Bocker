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
import { LOCALE_OPTIONS, type AppLocale } from '@/i18n/config'

export function LanguageSwitcher() {
  const locale = useLocale()
  const t = useTranslations('language')
  const router = useRouter()
  const pathname = usePathname()

  const handleLocaleChange = (newLocale: AppLocale) => {
    router.push(pathname, { locale: newLocale })
  }

  const currentLocale = LOCALE_OPTIONS.find((option) => option.value === locale)

  return (
    <Select
      data-testid="language-switch"
      name="locale"
      value={locale}
      onValueChange={(value) => handleLocaleChange(value as AppLocale)}
    >
      <SelectTrigger
        aria-label={t('switchLanguage')}
        className="h-9 w-auto min-w-[132px] border-border/80 bg-card/90 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/60"
      >
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
        {LOCALE_OPTIONS.map((loc) => (
          <SelectItem
            key={loc.value}
            value={loc.value}
            data-testid={`language-option-${loc.value}`}
          >
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
