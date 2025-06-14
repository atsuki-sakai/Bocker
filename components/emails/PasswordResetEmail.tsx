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

interface PasswordResetEmailProps {
  customerEmail: string
  orgName: string
  resetUrl: string
  expiresAt: string
  locale?: 'ja' | 'en'
}

const translations = {
  ja: {
    subject: '【{orgName}】パスワードリセットのご案内',
    title: 'パスワードリセット',
    greeting: '{email} 様',
    requestMessage: '【{orgName}】のパスワードリセットのご依頼を承りました。',
    instructionMessage: '以下のボタンをクリックして、新しいパスワードを設定してください。',
    resetButton: 'パスワードを再設定する',
    importantNotice: '重要なお知らせ：',
    expirationNotice: '• このリンクの有効期限は {expiresAt} までです',
    singleUseNotice: '• リンクは一度のみ使用可能です',
    disclaimer: '※このメールに心当たりがない場合は、第三者がメールアドレスを間違って入力した可能性があります。その場合は、このメールを削除してください。',
  },
  en: {
    subject: '[{orgName}] Password Reset Request',
    title: 'Password Reset',
    greeting: 'Dear {email},',
    requestMessage: 'We have received a password reset request for your [{orgName}] account.',
    instructionMessage: 'Click the button below to set a new password.',
    resetButton: 'Reset Password',
    importantNotice: 'Important Notice:',
    expirationNotice: '• This link expires on {expiresAt}',
    singleUseNotice: '• This link can only be used once',
    disclaimer: '※If you did not request this email, someone may have entered your email address by mistake. In that case, please delete this email.',
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

const warningBox = {
  backgroundColor: '#FFF3CD',
  border: '1px solid #FFEAA7',
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

export const PasswordResetEmail = ({
  customerEmail,
  orgName,
  resetUrl,
  expiresAt,
  locale = 'ja',
}: PasswordResetEmailProps) => {
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
            {t.requestMessage.replace('{orgName}', orgName)}
            <br />
            {t.instructionMessage}
          </Text>

          <Section style={{ textAlign: 'center' as const, marginTop: '30px' }}>
            <Link href={resetUrl} style={buttonStyle}>
              {t.resetButton}
            </Link>
          </Section>

          <Section style={warningBox}>
            <Text style={{ ...text, marginBottom: '10px', fontSize: '14px', color: '#856404' }}>
              <strong>{t.importantNotice}</strong>
            </Text>
            <Text style={{ ...text, marginBottom: '5px', fontSize: '14px', color: '#856404' }}>
              {t.expirationNotice.replace('{expiresAt}', expiresAt)}
            </Text>
            <Text style={{ ...text, marginBottom: '0', fontSize: '14px', color: '#856404' }}>
              {t.singleUseNotice}
            </Text>
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

export default PasswordResetEmail