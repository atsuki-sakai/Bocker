import { FAQ } from '../_components/FAQ'
import { Header } from '../_components/Header'
import { Footer } from '../_components/Footer'
import { useLocale } from 'next-intl'

export default function FAQPage() {
  const locale = useLocale()
  return (
    <>
      <Header />
      <FAQ locale={locale} />
      <Footer />
    </>
  )
}