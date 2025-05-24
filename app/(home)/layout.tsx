import { ChannelTalkLoader } from '@/components/common/ChannelTalkLoader'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <ChannelTalkLoader />
      {children}
    </>
  )
}
