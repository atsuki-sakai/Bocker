import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components'
import * as React from 'react'

interface ReservationConfirmationEmailProps {
  customerName?: string | null
  customerEmail?: string | null
  salonName: string
  salonPhone: string
  salonAddress: string
  salonPostalCode: string
  reservationDate: string
  reservationTime: string
  staffName: string
  menus: { name: string; price: number }[]
  options: { name: string; price: number; count: number }[]
  subtotal: number
  pointsUsed?: number
  couponDiscount?: number
  totalAmount: number
  reservationRules?: string | null
  reservationDetailUrl: string
  logoUrl?: string
}

const main = {
  backgroundColor: '#F7F9FA',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  margin: '20px auto',
  width: '100%',
  maxWidth: '700px',
  backgroundColor: '#ffffff',
  border: '1px solid #E0E0E0',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
}

const header = {
  backgroundColor: '#142327FF',
  padding: '40px 20px',
  textAlign: 'center' as const,
}

const headerTitle = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  margin: '0',
}

const content = {
  padding: '30px 40px',
}

const sectionTitle = {
  fontSize: '22px',
  color: '#142327FF',
  marginTop: '25px',
  marginBottom: '20px',
  borderBottom: '2px solid #142327FF',
  paddingBottom: '8px',
  fontWeight: 'bold' as const,
}

const text = {
  fontSize: '16px',
  lineHeight: '1.7',
  color: '#2D3F59',
  marginBottom: '18px',
}

const listItem = {
  backgroundColor: '#FDFDFD',
  border: '1px solid #ECECEC',
  padding: '18px 25px',
  marginBottom: '12px',
  borderRadius: '6px',
}

const itemDetail = {
  width: '100%',
}

const itemName = {
  fontWeight: '600' as const,
  fontSize: '16px',
  color: '#2D3F59',
}

const itemPrice = {
  color: '#4A5C6F',
  textAlign: 'right' as const,
  fontSize: '16px',
  fontWeight: '500' as const,
}

const totalSection = {
  marginTop: '30px',
  paddingTop: '20px',
  borderTop: '1px solid #E0E0E0',
}

const totalRow = {
  fontSize: '16px',
  marginBottom: '12px',
}

const totalLabel = {
  color: '#2D3F59',
  fontWeight: '500' as const,
}

const totalValue = {
  textAlign: 'right' as const,
  color: '#2D3F59',
  fontWeight: '500' as const,
}

const grandTotalRow = {
  fontWeight: 'bold' as const,
  fontSize: '20px',
  color: '#142327FF',
}

const buttonStyle = {
  display: 'inline-block',
  backgroundColor: '#142327FF',
  color: '#ffffff',
  padding: '12px 25px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 'bold' as const,
  fontSize: '15px',
  marginTop: '15px',
}

const footer = {
  backgroundColor: '#F7F9FA',
  padding: '30px 20px',
  textAlign: 'center' as const,
  fontSize: '13px',
  color: '#586A7E',
  borderTop: '1px solid #E0E0E0',
}

const footerText = {
  margin: '8px 0',
  fontSize: '13px',
  color: '#586A7E',
  lineHeight: '1.6',
}

const link = {
  color: '#142327FF',
  textDecoration: 'underline',
}

const logo = {
  margin: '0 auto',
  marginBottom: '15px',
  width: '100px', // Adjust as needed
  height: 'auto',
}

export const ReservationConfirmationEmail = ({
  customerName,
  customerEmail,
  salonName,
  salonPhone,
  salonAddress,
  salonPostalCode,
  reservationDate,
  reservationTime,
  staffName,
  menus,
  options,
  subtotal,
  pointsUsed,
  couponDiscount,
  totalAmount,
  reservationRules,
  reservationDetailUrl,
  logoUrl,
}: ReservationConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>【{salonName}】ご予約内容の確認</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          {logoUrl && <Img src={logoUrl} alt={`${salonName} Logo`} style={logo} />}
          <Heading style={headerTitle}>ご予約内容の確認</Heading>
        </Section>
        <Section style={content}>
          <Text style={text}>{customerName || customerEmail} 様</Text>
          <Text style={text}>
            この度は、【{salonName}】にご予約いただき、誠にありがとうございます。
            <br />
            以下の内容でご予約を承りました。
          </Text>

          <Heading as="h2" style={sectionTitle}>
            ご予約詳細
          </Heading>
          <Text style={text}>
            <strong>店舗名:</strong> {salonName}
            <br />
            <strong>ご予約日時:</strong> {reservationDate} {reservationTime}
            <br />
            <strong>担当スタッフ:</strong> {staffName}
          </Text>

          {menus && menus.length > 0 && (
            <>
              <Heading as="h3" style={{ ...sectionTitle, fontSize: '16px', borderBottom: 'none' }}>
                選択されたメニュー
              </Heading>
              {menus.map((menu, index) => (
                <Section key={`menu-${index}`} style={listItem}>
                  <Row style={itemDetail}>
                    <Column style={itemName}>{menu.name}</Column>
                    <Column style={itemPrice}>¥{menu.price.toLocaleString()}</Column>
                  </Row>
                </Section>
              ))}
            </>
          )}

          {options && options.length > 0 && (
            <>
              <Heading
                as="h3"
                style={{
                  ...sectionTitle,
                  fontSize: '16px',
                  borderBottom: 'none',
                  marginTop: '15px',
                }}
              >
                選択されたオプション
              </Heading>
              {options.map((option, index) => (
                <Section key={`option-${index}`} style={listItem}>
                  <Row style={itemDetail}>
                    <Column style={itemName}>
                      {option.name}
                      {option.count > 1 ? ` ×${option.count}` : ''}
                    </Column>
                    <Column style={itemPrice}>
                      ¥{(option.price * option.count).toLocaleString()}
                    </Column>
                  </Row>
                </Section>
              ))}
            </>
          )}

          <Section style={totalSection}>
            <Row style={totalRow}>
              <Column style={totalLabel}>小計</Column>
              <Column style={totalValue}>¥{subtotal.toLocaleString()}</Column>
            </Row>
            {pointsUsed && pointsUsed > 0 && (
              <Row style={totalRow}>
                <Column style={totalLabel}>使用ポイント</Column>
                <Column style={totalValue}>-{pointsUsed.toLocaleString()} P</Column>
              </Row>
            )}
            {couponDiscount && couponDiscount > 0 && (
              <Row style={totalRow}>
                <Column style={totalLabel}>クーポン割引</Column>
                <Column style={totalValue}>-¥{couponDiscount.toLocaleString()}</Column>
              </Row>
            )}
            <Hr style={{ borderColor: '#cccccc', margin: '10px 0' }} />
            <Row style={{ ...totalRow, ...grandTotalRow }}>
              <Column>合計金額</Column>
              <Column style={{ textAlign: 'right' as const }}>
                ¥{totalAmount.toLocaleString()}
              </Column>
            </Row>
          </Section>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>ご来店を心よりお待ちしております。</Text>
          <Text style={{ ...footerText, fontWeight: 'bold' as const }}>{salonName}</Text>
          <Text style={footerText}>
            電話:{' '}
            <Link href={`tel:${salonPhone}`} style={link}>
              {salonPhone}
            </Link>
          </Text>
          <Text style={footerText}>
            住所: {salonPostalCode} {salonAddress}
          </Text>
          {reservationRules && (
            <Text style={footerText}>
              <strong>予約ルール:</strong> {reservationRules}
            </Text>
          )}
          <Section style={{ textAlign: 'center' as const, marginTop: '20px' }}>
            <Link href={reservationDetailUrl} style={buttonStyle}>
              予約詳細・キャンセルはこちら
            </Link>
          </Section>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReservationConfirmationEmail
