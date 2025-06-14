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

interface PasswordChangedEmailProps {
  customerEmail: string
  orgName: string
  changedAt: string
  supportUrl?: string
  locale?: 'ja' | 'en'
}

const translations = {
  ja: {
    subject: '【{orgName}】パスワード変更完了のお知らせ',
    title: 'パスワード変更完了',
    greeting: '{email} 様',
    message: '【{orgName}】のアカウントのパスワードが正常に変更されました。',
    changeInfo: '変更完了情報：',
    changeDate: '変更日時：{date}',
    instruction: '新しいパスワードを使用して、次回からログインしてください。',
    securityNotice: 'セキュリティに関するお知らせ：',
    unauthorizedWarning: 'もしこの変更にお心当たりがない場合は、第三者によるアカウントへの不正アクセスの可能性があります。',
    contactSupport: 'すぐにサポートまでご連絡ください。',
    contactSupportWithLink: 'すぐに {link} ください。',
    supportLinkText: 'サポートまでご連絡',
    securityTip: 'アカウントのセキュリティを保つため、定期的にパスワードを変更することをお勧めします。',
  },
  en: {
    subject: '[{orgName}] Password Change Confirmation',
    title: 'Password Changed Successfully',
    greeting: 'Dear {email},',
    message: 'Your password for [{orgName}] has been successfully changed.',
    changeInfo: 'Change Information:',
    changeDate: 'Changed at: {date}',
    instruction: 'Please use your new password for future logins.',
    securityNotice: 'Security Notice:',
    unauthorizedWarning: 'If you did not make this change, there may be unauthorized access to your account.',
    contactSupport: 'Please contact support immediately.',
    contactSupportWithLink: 'Please {link} immediately.',
    supportLinkText: 'contact support',
    securityTip: 'We recommend changing your password regularly to keep your account secure.',
  },
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
  const t = translations[locale]
  
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