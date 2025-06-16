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

export function LanguageSwitcher() {
  const locale = useLocale()
  const t = useTranslations('language')
  const router = useRouter()
  const pathname = usePathname()

  const locales = [
    { value: 'ja', label: t('japanese'), flag: '🇯🇵' },
    { value: 'en', label: t('english'), flag: '🇺🇸' },
  ]

  const handleLocaleChange = (newLocale: string) => {
    router.push(pathname, { locale: newLocale })
  }

  const currentLocale = locales.find((l) => l.value === locale)

  return (
    <Select value={locale} onValueChange={handleLocaleChange}>
      <SelectTrigger className="w-auto min-w-[120px] h-9">
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
