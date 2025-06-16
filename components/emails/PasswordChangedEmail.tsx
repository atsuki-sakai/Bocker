import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import { getEmailTemplateTranslations, type SupportedLocale } from '@/lib/email-translations'

interface PasswordChangedEmailProps {
  customerEmail: string
  orgName: string
  changedAt: string
  supportUrl?: string
  locale?: SupportedLocale
}


const main = {
  backgroundColor: '#F7F9FA',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  margin: '20px auto',
  width: '100%',
  maxWidth: '600px',
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

const text = {
  fontSize: '16px',
  lineHeight: '1.7',
  color: '#2D3F59',
  marginBottom: '18px',
}

const infoBox = {
  backgroundColor: '#D4EDDA',
  border: '1px solid #C3E6CB',
  borderRadius: '6px',
  padding: '15px',
  marginTop: '20px',
}

const warningBox = {
  backgroundColor: '#F8D7DA',
  border: '1px solid #F5C6CB',
  borderRadius: '6px',
  padding: '15px',
  marginTop: '20px',
}

const footer = {
  backgroundColor: '#F7F9FA',
  padding: '30px 20px',
  textAlign: 'center' as const,
  fontSize: '13px',
  color: '#586A7E',
  borderTop: '1px solid #E0E0E0',
}

const link = {
  color: '#142327FF',
  textDecoration: 'underline',
}

export const PasswordChangedEmail = ({
  customerEmail,
  orgName,
  changedAt,
  supportUrl,
  locale = 'ja',
}: PasswordChangedEmailProps) => {
  const t = getEmailTemplateTranslations('passwordChanged', locale)
  
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
          <Text style={text}>{t.greeting.replace('{email}', customerEmail)}</Text>
          <Text style={text}>
            {t.message.replace('{orgName}', orgName)}
          </Text>

          <Section style={infoBox}>
            <Text style={{ ...text, marginBottom: '10px', fontSize: '14px', color: '#155724' }}>
              <strong>{t.changeInfo}</strong>
            </Text>
            <Text style={{ ...text, marginBottom: '0', fontSize: '14px', color: '#155724' }}>
              {t.changeDate.replace('{date}', changedAt)}
            </Text>
          </Section>

          <Text style={text}>
            {t.instruction}
          </Text>

          <Section style={warningBox}>
            <Text style={{ ...text, marginBottom: '10px', fontSize: '14px', color: '#721C24' }}>
              <strong>{t.securityNotice}</strong>
            </Text>
            <Text style={{ ...text, marginBottom: '5px', fontSize: '14px', color: '#721C24' }}>
              {t.unauthorizedWarning}
            </Text>
            <Text style={{ ...text, marginBottom: '0', fontSize: '14px', color: '#721C24' }}>
              {supportUrl ? (
                <>
                  {t.contactSupportWithLink.split('{link}')[0]}
                  <Link href={supportUrl} style={link}>
                    {t.supportLinkText}
                  </Link>
                  {t.contactSupportWithLink.split('{link}')[1]}
                </>
              ) : (
                t.contactSupport
              )}
            </Text>
          </Section>

          <Text style={{ ...text, marginTop: '30px', fontSize: '14px', color: '#586A7E' }}>
            {t.securityTip}
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={{ margin: '8px 0', fontSize: '13px', color: '#586A7E' }}>
            {orgName}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
  )
}

export default PasswordChangedEmail