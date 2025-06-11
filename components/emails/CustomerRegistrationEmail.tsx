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
}: CustomerRegistrationEmailProps) => (
  <Html>
    <Head />
    <Preview>【{orgName}】会員登録完了のお知らせ</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={headerTitle}>会員登録完了</Heading>
        </Section>
        <Section style={content}>
          <Text style={text}>{customerEmail} 様</Text>
          <Text style={text}>
            この度は、【{orgName}】にご登録いただき、誠にありがとうございます。
            <br />
            会員登録が正常に完了いたしました。
          </Text>
          
          <Text style={text}>
            ご登録いただいたメールアドレスとパスワードで、いつでもログインいただけます。
          </Text>

          <Section style={{ textAlign: 'center' as const, marginTop: '30px' }}>
            <Link href={loginUrl} style={buttonStyle}>
              ログインはこちら
            </Link>
          </Section>

          <Text style={{ ...text, marginTop: '30px', fontSize: '14px', color: '#586A7E' }}>
            ※このメールに心当たりがない場合は、お手数ですが削除してください。
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

export default CustomerRegistrationEmail