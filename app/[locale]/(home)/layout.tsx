import { ChannelTalkLoader } from '@/components/common/ChannelTalkLoader'
import { Header, Footer } from './_components'
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
