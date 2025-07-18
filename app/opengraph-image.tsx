import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export const alt = 'Bocker - 美容サロン向け次世代予約管理システム'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'
 
export default async function Image({ params }: { params?: { locale?: string } }) {
  const locale = params?.locale || 'ja'
  
  // 言語別のコンテンツ
  const content = locale === 'ja' ? {
    title: 'Bocker',
    subtitle: '美容サロン向け次世代予約管理システム',
    features: 'リアルタイム予約 • 顧客管理 • LINE連携',
    trial: '30日間無料トライアル'
  } : {
    title: 'Bocker',
    subtitle: 'Next-Generation Booking System for Beauty Salons',
    features: 'Real-time Booking • Customer Management • LINE Integration',
    trial: '30-Day Free Trial'
  }

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: 'linear-gradient(135deg, #05896FFF 0%, #D2FFEFFF 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center',
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 'bold',
              marginBottom: '20px',
            }}
          >
            {content.title}
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 'normal',
              opacity: 0.9,
              maxWidth: '900px',
              lineHeight: 1.3,
            }}
          >
            {content.subtitle}
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 'normal',
              opacity: 0.8,
              marginTop: '20px',
            }}
          >
            {content.features}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 'normal',
              opacity: 0.7,
              marginTop: '20px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '10px 20px',
              borderRadius: '25px',
            }}
          >
            {content.trial}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}