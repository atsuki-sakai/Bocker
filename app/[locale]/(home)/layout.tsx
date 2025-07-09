import { ChannelTalkLoader } from '@/components/common/ChannelTalkLoader'
import { Header } from './_components/Header'
import { Footer } from './_components/Footer'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <ChannelTalkLoader />
      <Header />
      {children}
      <Footer />
    </>
  )
}
