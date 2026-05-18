/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const RecoveryEmail = ({ token }: RecoveryEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>קוד איפוס סיסמה - Daily Dominator</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <div style={badge}>
            <Text style={badgeText}>DAILY DOMINATOR</Text>
          </div>

          <Heading style={h1}>איפוס סיסמה 🔒</Heading>
          <Text style={subtitle}>
            הזן את הקוד הבא באפליקציה כדי לאפס את הסיסמה שלך
          </Text>

          {token && (
            <Section style={codeBox}>
              <Text style={codeLabel}>קוד אימות</Text>
              <Text style={code}>{token}</Text>
            </Section>
          )}

          <Section style={infoBox}>
            <Text style={infoText}>
              ⏱️ הקוד תקף ל-15 דקות בלבד
            </Text>
          </Section>

          <Text style={footer}>
            לא ביקשת לאפס סיסמה? אפשר פשוט להתעלם מהמייל הזה — החשבון שלך מוגן.
          </Text>

          <Section style={brandFooter}>
            <Text style={brandText}>Daily Dominator</Text>
            <Text style={brandTagline}>השליטה היומיומית שלך</Text>
          </Section>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Heebo, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  margin: 0,
  padding: '40px 16px',
}

const container = {
  maxWidth: '520px',
  margin: '0 auto',
}

const card = {
  background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
  border: '1px solid #ececec',
  borderRadius: '24px',
  padding: '40px 32px',
  textAlign: 'right' as const,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
}

const badge = {
  display: 'inline-block',
  backgroundColor: '#0a0a0a',
  borderRadius: '999px',
  padding: '6px 14px',
  marginBottom: '24px',
}

const badgeText = {
  fontSize: '11px',
  fontWeight: 800 as const,
  color: 'hsl(38, 92%, 50%)',
  letterSpacing: '2px',
  margin: 0,
}

const h1 = {
  fontSize: '28px',
  fontWeight: 800 as const,
  color: '#0a0a0a',
  margin: '0 0 12px',
  lineHeight: '1.3',
}

const subtitle = {
  fontSize: '15px',
  color: '#666666',
  lineHeight: '1.6',
  margin: '0 0 28px',
}

const codeBox = {
  background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
  borderRadius: '20px',
  padding: '24px 20px',
  margin: '0 0 20px',
  textAlign: 'center' as const,
  border: '1px solid hsl(38, 92%, 50%)',
}

const codeLabel = {
  fontSize: '11px',
  color: 'hsl(38, 92%, 50%)',
  letterSpacing: '3px',
  fontWeight: 700 as const,
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
}

const code = {
  fontSize: '40px',
  fontWeight: 900 as const,
  color: '#ffffff',
  letterSpacing: '10px',
  margin: 0,
  fontFamily: 'SF Mono, Menlo, Monaco, monospace',
  lineHeight: '1.1',
}

const infoBox = {
  backgroundColor: 'hsl(38, 92%, 95%)',
  borderRadius: '12px',
  padding: '12px 16px',
  margin: '0 0 28px',
  textAlign: 'center' as const,
}

const infoText = {
  fontSize: '13px',
  color: 'hsl(38, 92%, 30%)',
  fontWeight: 600 as const,
  margin: 0,
}

const footer = {
  fontSize: '13px',
  color: '#999999',
  lineHeight: '1.6',
  margin: '0 0 32px',
  paddingTop: '20px',
  borderTop: '1px solid #f0f0f0',
}

const brandFooter = {
  textAlign: 'center' as const,
  paddingTop: '8px',
}

const brandText = {
  fontSize: '14px',
  fontWeight: 800 as const,
  color: 'hsl(0, 72%, 51%)',
  margin: '0 0 4px',
  letterSpacing: '0.5px',
}

const brandTagline = {
  fontSize: '11px',
  color: '#bbbbbb',
  margin: 0,
  letterSpacing: '1px',
}
