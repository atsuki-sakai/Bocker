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
}: PasswordChangedEmailProps) => (
  <Html>
    <Head />
    <Preview>【{orgName}】パスワード変更完了のお知らせ</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={headerTitle}>パスワード変更完了</Heading>
        </Section>
        <Section style={content}>
          <Text style={text}>{customerEmail} 様</Text>
          <Text style={text}>
            【{orgName}】のアカウントのパスワードが正常に変更されました。
          </Text>

          <Section style={infoBox}>
            <Text style={{ ...text, marginBottom: '10px', fontSize: '14px', color: '#155724' }}>
              <strong>変更完了情報：</strong>
            </Text>
            <Text style={{ ...text, marginBottom: '0', fontSize: '14px', color: '#155724' }}>
              変更日時：{changedAt}
            </Text>
          </Section>

          <Text style={text}>
            新しいパスワードを使用して、次回からログインしてください。
          </Text>

          <Section style={warningBox}>
            <Text style={{ ...text, marginBottom: '10px', fontSize: '14px', color: '#721C24' }}>
              <strong>セキュリティに関するお知らせ：</strong>
            </Text>
            <Text style={{ ...text, marginBottom: '5px', fontSize: '14px', color: '#721C24' }}>
              もしこの変更にお心当たりがない場合は、第三者によるアカウントへの不正アクセスの可能性があります。
            </Text>
            <Text style={{ ...text, marginBottom: '0', fontSize: '14px', color: '#721C24' }}>
              {supportUrl ? (
                <>
                  すぐに{' '}
                  <Link href={supportUrl} style={link}>
                    サポートまでご連絡
                  </Link>{' '}
                  ください。
                </>
              ) : (
                'すぐにサポートまでご連絡ください。'
              )}
            </Text>
          </Section>

          <Text style={{ ...text, marginTop: '30px', fontSize: '14px', color: '#586A7E' }}>
            アカウントのセキュリティを保つため、定期的にパスワードを変更することをお勧めします。
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

export default PasswordChangedEmail