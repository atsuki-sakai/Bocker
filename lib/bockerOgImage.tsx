import { ImageResponse } from 'next/og'
import type { AppLocale } from '@/i18n/config'

const content: Record<AppLocale, { subtitle: string; features: string; trial: string }> = {
  ja: {
    subtitle: '美容サロン向け次世代予約管理システム',
    features: 'リアルタイム予約 • 顧客管理 • LINE連携',
    trial: '30日間無料トライアル',
  },
  en: {
    subtitle: 'Next-Generation Booking System for Beauty Salons',
    features: 'Real-time Booking • Customer Management • LINE Integration',
    trial: '30-Day Free Trial',
  },
  th: {
    subtitle: 'ระบบจัดการการจองยุคใหม่สำหรับร้านเสริมสวย',
    features: 'การจองแบบเรียลไทม์ • การจัดการลูกค้า • เชื่อมต่อ LINE',
    trial: 'ทดลองใช้ฟรี 30 วัน',
  },
}

const bockerOgImageSize = {
  width: 1200,
  height: 630,
}

export function createBockerOgImage(locale: AppLocale) {
  const localizedContent = content[locale]

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #173f4a 0%, #245d66 70%, #32767a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f8faf8',
          textAlign: 'center',
          padding: '56px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '22px',
          }}
        >
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: '-2px' }}>Bocker</div>
          <div
            style={{
              fontSize: locale === 'en' ? 34 : 38,
              fontWeight: 600,
              maxWidth: '980px',
              lineHeight: 1.35,
            }}
          >
            {localizedContent.subtitle}
          </div>
          <div style={{ fontSize: 27, color: '#d8e8e6', marginTop: '8px' }}>
            {localizedContent.features}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              fontWeight: 700,
              marginTop: '14px',
              backgroundColor: '#ff7655',
              color: '#17323a',
              padding: '12px 26px',
              borderRadius: '999px',
            }}
          >
            {localizedContent.trial}
          </div>
        </div>
      </div>
    ),
    bockerOgImageSize
  )
}
