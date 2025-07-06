import { FAQ } from '../_components/FAQ'
import { useLocale } from 'next-intl'

export default function FAQPage() {
  const locale = useLocale()
  return <FAQ locale={locale} />
}