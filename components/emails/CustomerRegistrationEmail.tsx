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

interface CustomerRegistrationEmailProps {
  customerEmail: string
  orgName: string
  loginUrl: string
  locale?: 'ja' | 'en'
}

const translations = {
  ja: {
    subject: '【{orgName}】会員登録完了のお知らせ',
    title: '会員登録完了',
    greeting: '{email} 様',
    welcomeMessage: 'この度は、【{orgName}】にご登録いただき、誠にありがとうございます。',
    completionMessage: '会員登録が正常に完了いたしました。',
    loginMessage: 'ご登録いただいたメールアドレスとパスワードで、いつでもログインいただけます。',
    loginButton: 'ログインはこちら',
    disclaimer: '※このメールに心当たりがない場合は、お手数ですが削除してください。',
  },
  en: {
    subject: '[{orgName}] Registration Complete',
    title: 'Registration Complete',
    greeting: 'Dear {email},',
    welcomeMessage: 'Thank you for registering with [{orgName}].',
    completionMessage: 'Your registration has been completed successfully.',
    loginMessage: 'You can log in anytime using your registered email address and password.',
    loginButton: 'Login Here',
    disclaimer: '※If you did not expect this email, please delete it.',
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
  backgroundColor: '#FFFFFFFF',
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

export const CustomerRegistrationEmail = ({
  customerEmail,
  orgName,
  loginUrl,
  locale = 'ja',
}: CustomerRegistrationEmailProps) => {
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
            {t.welcomeMessage.replace('{orgName}', orgName)}
            <br />
            {t.completionMessage}
          </Text>
          
          <Text style={text}>
            {t.loginMessage}
          </Text>

          <Section style={{ textAlign: 'center' as const, marginTop: '30px' }}>
            <Link href={loginUrl} style={buttonStyle}>
              {t.loginButton}
            </Link>
          </Section>

          <Text style={{ ...text, marginTop: '30px', fontSize: '14px', color: '#586A7E' }}>
            {t.disclaimer}
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

export default CustomerRegistrationEmail