import * as React from 'react'
import {
  Body,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'

interface ReservationReminderEmailProps {
  customerName: string
  organizationName: string
  reservationDate: string
  startTime: string
  endTime: string
  menus: Array<{ name: string; price?: number; duration_min?: number }>
  options?: Array<{ name: string; quantity: number }>
  staffName: string
  extraCharge?: number
  couponDiscount?: number
  usePoints?: number
  totalPrice: number
  reservationId: string
  orgAddress?: string
  orgPhone?: string
}

const ReservationReminderEmail: React.FC<ReservationReminderEmailProps> = ({
  customerName,
  organizationName,
  reservationDate,
  startTime,
  endTime,
  menus,
  options,
  staffName,
  extraCharge,
  couponDiscount,
  usePoints,
  totalPrice,
  reservationId,
  orgAddress,
  orgPhone,
}) => {
  const previewText = `【リマインダー】${reservationDate} ${startTime}からのご予約について`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* ヘッダー */}
          <Section style={header}>
            <Heading style={headerTitle}>🔔 予約リマインダー</Heading>
            <Text style={headerSubtitle}>{organizationName}</Text>
          </Section>

          {/* 本文 */}
          <Section style={content}>
            <Text style={greeting}>{customerName}様</Text>

            <Text style={message}>
              本日のご予約時間が近づいています。
              <br />
              ご来店を心よりお待ちしております。
            </Text>

            {/* 予約詳細 */}
            <Section style={detailsSection}>
              <Heading as="h2" style={sectionTitle}>
                予約内容
              </Heading>

              <Row style={detailRow}>
                <Column style={detailLabel}>日時</Column>
                <Column style={detailValue}>
                  {reservationDate}
                  <br />
                  <strong>
                    {startTime} 〜 {endTime}
                  </strong>
                </Column>
              </Row>

              <Row style={detailRow}>
                <Column style={detailLabel}>メニュー</Column>
                <Column style={detailValue}>
                  {menus.map((menu, index) => (
                    <span key={index}>
                      {menu.name}
                      {menu.price && ` ¥${menu.price.toLocaleString()}`}
                      {index < menus.length - 1 && <br />}
                    </span>
                  ))}
                </Column>
              </Row>

              <Row style={detailRow}>
                <Column style={detailLabel}>担当</Column>
                <Column style={detailValue}>{staffName}</Column>
              </Row>

              {options && options.length > 0 && (
                <Row style={detailRow}>
                  <Column style={detailLabel}>オプション</Column>
                  <Column style={detailValue}>
                    {options.map((opt, index) => (
                      <span key={index}>
                        {opt.name}({opt.quantity}){index < options.length - 1 && <br />}
                      </span>
                    ))}
                  </Column>
                </Row>
              )}

              {(extraCharge ?? 0) > 0 && (
                <Row style={detailRow}>
                  <Column style={detailLabel}>指名料</Column>
                  <Column style={detailValue}>¥{(extraCharge ?? 0).toLocaleString()}</Column>
                </Row>
              )}

              {(couponDiscount ?? 0) > 0 && (
                <Row style={detailRow}>
                  <Column style={detailLabel}>クーポン割引</Column>
                  <Column style={detailValue} color="#FF9500">
                    -¥{(couponDiscount ?? 0).toLocaleString()}
                  </Column>
                </Row>
              )}

              {(usePoints ?? 0) > 0 && (
                <Row style={detailRow}>
                  <Column style={detailLabel}>ポイント使用</Column>
                  <Column style={detailValue} color="#FF9500">
                    -{usePoints ?? 0}pt
                  </Column>
                </Row>
              )}

              <Row style={detailRow}>
                <Column style={detailLabel}>合計</Column>
                <Column style={detailValue}>
                  <strong>¥{totalPrice.toLocaleString()}</strong>
                </Column>
              </Row>

              <Row style={detailRow}>
                <Column style={detailLabel}>予約番号</Column>
                <Column style={detailValue}>{reservationId}</Column>
              </Row>
            </Section>

            {/* 店舗情報 */}
            {(orgAddress || orgPhone) && (
              <Section style={storeSection}>
                <Heading as="h3" style={storeSectionTitle}>
                  📍 ご来店先
                </Heading>
                {orgAddress && <Text style={storeInfo}>住所: {orgAddress}</Text>}
                {orgPhone && <Text style={storeInfo}>TEL: {orgPhone}</Text>}
              </Section>
            )}

            {/* 注意事項 */}
            <Section style={noticeSection}>
              <Heading as="h3" style={noticeSectionTitle}>
                ⚠️ ご来店時のお願い
              </Heading>
              <Text style={noticeText}>
                ・予約時間の5〜10分前にはご来店ください
                <br />
                ・体調がすぐれない場合は、事前にご連絡ください
              </Text>
            </Section>

            <Hr style={divider} />

            {/* フッター */}
            <Text style={footer}>
              ご不明な点がございましたら、お電話にてお問い合わせください。
              <br />
              本メールは送信専用です。返信はできませんのでご了承ください。
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// スタイル定義
const main: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header: React.CSSProperties = {
  backgroundColor: '#FF9500',
  padding: '24px',
  textAlign: 'center',
}

const headerTitle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
}

const headerSubtitle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '16px',
  margin: '8px 0 0 0',
}

const content: React.CSSProperties = {
  padding: '24px',
}

const greeting: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
}

const message: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '24px',
  color: '#FF9500',
  fontWeight: 'bold',
}

const detailsSection: React.CSSProperties = {
  marginBottom: '24px',
}

const sectionTitle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '16px',
  color: '#333333',
}

const detailRow: React.CSSProperties = {
  marginBottom: '12px',
}

const detailLabel: React.CSSProperties = {
  fontSize: '14px',
  color: '#666666',
  width: '100px',
  paddingRight: '16px',
  verticalAlign: 'top',
}

const detailValue: React.CSSProperties = {
  fontSize: '14px',
  color: '#333333',
  verticalAlign: 'top',
}

const storeSection: React.CSSProperties = {
  marginBottom: '24px',
  padding: '16px',
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
}

const storeSectionTitle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 'bold',
  marginBottom: '8px',
  color: '#5dade2',
}

const storeInfo: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
  color: '#666666',
}

const noticeSection: React.CSSProperties = {
  marginBottom: '24px',
}

const noticeSectionTitle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 'bold',
  marginBottom: '8px',
  color: '#FF9500',
}

const noticeText: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#666666',
}

const divider: React.CSSProperties = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
}

const footer: React.CSSProperties = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center',
}

export default ReservationReminderEmail