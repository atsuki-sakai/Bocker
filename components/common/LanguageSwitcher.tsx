"use client"

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Globe } from "lucide-react"

const locales = [
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'en', label: 'English', flag: '🇺🇸' }
]

export function LanguageSwitcher() {
  const t = useTranslations('language')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleLocaleChange = (newLocale: string) => {
    // Remove current locale from pathname and add new locale
    const segments = pathname.split('/')
    const currentLocale = segments[1]
    
    let newPathname = pathname
    if (locales.some(l => l.value === currentLocale)) {
      // Replace current locale
      segments[1] = newLocale
      newPathname = segments.join('/')
    } else {
      // Add locale to beginning
      newPathname = `/${newLocale}${pathname}`
    }
    
    router.push(newPathname)
  }

  const currentLocale = locales.find(l => l.value === locale)

  return (
    <Select value={locale} onValueChange={handleLocaleChange}>
      <SelectTrigger className="w-auto min-w-[120px] h-9">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          <SelectValue>
            <span className="flex items-center gap-1">
              <span>{currentLocale?.flag}</span>
              <span className="hidden sm:inline">{currentLocale?.label}</span>
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