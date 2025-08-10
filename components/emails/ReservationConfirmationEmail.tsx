import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components'
import * as React from 'react'
import { getEmailTemplateTranslations } from '@/lib/email-translations'
import type { SupportedLocale } from '@/lib/dateLocale'

interface ReservationConfirmationEmailProps {
  customerName?: string | null
  customerEmail?: string | null
  orgName: string
  orgPhone: string
  orgAddress: string
  orgPostalCode: string
  reservationDate: string
  reservationTime: string
  staffName: string
  extraCharge?: number
  menus: { name: string; price: number }[]
  options: { name: string; price: number; count: number }[]
  subtotal: number
  pointsUsed?: number
  couponDiscount?: number
  totalAmount: number
  reservationRules?: string | null
  reservationDetailUrl: string
  locale?: SupportedLocale
}

interface ContactEmailProps {
  name: string
  email: string
  company: string
  phone: string
  subject: string
  message: string
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

export const ReservationConfirmationEmail = ({
  customerName,
  customerEmail,
  orgName,
  orgPhone,
  orgAddress,
  orgPostalCode,
  reservationDate,
  reservationTime,
  staffName,
  extraCharge,
  menus,
  options,
  subtotal,
  pointsUsed,
  couponDiscount,
  totalAmount,
  reservationRules,
  reservationDetailUrl,
  locale = 'ja',
}: ReservationConfirmationEmailProps) => {
  const t = getEmailTemplateTranslations('reservationConfirmation', locale)
  const displayName = customerName || customerEmail

  return (
    <Html>
      <Head />
      <Preview>{t.subject.replace('{orgName}', orgName)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>{t.title}</Heading>
          </Section>
          <Section style={content}>
            <Text style={text}>{t.greeting.replace('{customerName}', displayName || '')}</Text>
            <Text style={text}>
              {t.thankYouMessage.replace('{orgName}', orgName)}
              <br />
              {t.confirmationMessage}
            </Text>

            <Heading as="h2" style={sectionTitle}>
              {t.reservationDetails}
            </Heading>
            <Text style={text}>
              <strong>{t.shopName}</strong> {orgName}
              <br />
              <strong>{t.reservationDateTime}</strong> {reservationDate} {reservationTime}
              <br />
              <strong>{t.assignedStaff}</strong> {staffName}{' '}
              {extraCharge ? `（¥${extraCharge.toLocaleString()}）` : ''}
            </Text>

            {menus && menus.length > 0 && (
              <>
                <Heading
                  as="h3"
                  style={{ ...sectionTitle, fontSize: '16px', borderBottom: 'none' }}
                >
                  {t.selectedMenus}
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
                  {t.selectedOptions}
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
                <Column style={totalLabel}>{t.subtotal}</Column>
                <Column style={totalValue}>¥{subtotal.toLocaleString()}</Column>
              </Row>
              {pointsUsed && pointsUsed > 0 && (
                <Row style={totalRow}>
                  <Column style={totalLabel}>{t.pointsUsed}</Column>
                  <Column style={totalValue}>-{pointsUsed.toLocaleString()} P</Column>
                </Row>
              )}
              {couponDiscount && couponDiscount > 0 && (
                <Row style={totalRow}>
                  <Column style={totalLabel}>{t.couponDiscount}</Column>
                  <Column style={totalValue}>-¥{couponDiscount.toLocaleString()}</Column>
                </Row>
              )}
              <Hr style={{ borderColor: '#cccccc', margin: '10px 0' }} />
              <Row style={{ ...totalRow, ...grandTotalRow }}>
                <Column>{t.totalAmount}</Column>
                <Column style={{ textAlign: 'right' as const }}>
                  ¥{totalAmount.toLocaleString()}
                </Column>
              </Row>
            </Section>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>{t.thankYouVisit}</Text>
            <Text style={{ ...footerText, fontWeight: 'bold' as const }}>{orgName}</Text>
            <Text style={footerText}>
              {t.phone}{' '}
              <Link href={`tel:${orgPhone}`} style={link}>
                {orgPhone}
              </Link>
            </Text>
            <Text style={footerText}>
              {t.address} {orgPostalCode} {orgAddress}
            </Text>
            {reservationRules && (
              <Text style={footerText}>
                <strong>{t.reservationRules}</strong> {reservationRules}
              </Text>
            )}
            <Section style={{ textAlign: 'center' as const, marginTop: '20px' }}>
              <Link href={reservationDetailUrl} style={buttonStyle}>
                {t.reservationDetailsButton}
              </Link>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}


export const ContactEmail = ({
  name,
  email,
  company,
  phone,
  subject,
  message,
}: ContactEmailProps) => {
  // subject値のマッピング
  const getSubjectLabel = (subjectValue: string): string => {
    const subjectMap: Record<string, string> = {
      general: '資料請求',
      support: '導入サポート',
      other: 'その他'
    }
    return subjectMap[subjectValue] || subjectValue
  }

  const subjectLabel = getSubjectLabel(subject)

  return (
    <Html>
      <Head />
      <Preview>HPからのお問い合わせ - {subjectLabel}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>HPからのお問い合わせ</Heading>
          </Section>
          <Section style={content}>
            <Text style={text}>
              <strong>お名前:</strong> {name}
            </Text>
            <Text style={text}>
              <strong>メールアドレス:</strong> {email}
            </Text>
            <Text style={text}>
              <strong>会社名:</strong> {company}
            </Text>
            <Text style={text}>
              <strong>電話番号:</strong> {phone}
            </Text>
            <Text style={text}>
              <strong>お問い合わせ種別:</strong> {subjectLabel}
            </Text>
            <Text style={text}>
              <strong>お問い合わせ内容:</strong>
            </Text>
            <Text style={{...text, whiteSpace: 'pre-wrap' as const}}>
              {message}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
export default ReservationConfirmationEmail
