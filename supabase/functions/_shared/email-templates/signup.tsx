/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

const LOGO_URL =
  'https://jtdxblauyfhfvszlbppz.supabase.co/storage/v1/object/public/email-assets/daily-dominator-logo.png'

export const SignupEmail = ({ token }: SignupEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head>
      <meta charSet="utf-8" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
    </Head>
    <Preview>קוד אימות המייל שלך - Daily Dominator</Preview>
    <Body style={main}>
      <table width="100%" cellPadding={0} cellSpacing={0} border={0} style={outerTable}>
        <tr>
          <td align="center">
            <Container style={card}>
              <Section style={topGlow} />

              <Section style={logoWrap}>
                <Img src={LOGO_URL} width="110" height="110" alt="Daily Dominator" style={logoImg} />
              </Section>

              <Section style={titleWrap}>
                <Heading style={h1}>אימות חשבון</Heading>
                <Text style={subtitle}>
                  השתמש בקוד האימות החד פעמי כדי להתחבר בצורה מאובטחת לחשבון שלך.
                </Text>
              </Section>

              {token && (
                <Section style={codeWrap}>
                  <table cellPadding={0} cellSpacing={0} border={0} align="center">
                    <tr>
                      <td style={codeBox}>
                        <span style={code}>{token}</span>
                      </td>
                    </tr>
                  </table>
                </Section>
              )}

              <Section style={expireWrap}>
                <Text style={expireText}>הקוד תקף למשך 15 דקות בלבד</Text>
              </Section>

              <Section style={footerWrap}>
                <Text style={footerText}>
                  אם לא נרשמת לחשבון,<br />
                  אפשר להתעלם מהמייל הזה בבטחה.
                </Text>
              </Section>
            </Container>
          </td>
        </tr>
      </table>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  margin: 0,
  padding: 0,
  backgroundColor: '#05070F',
  fontFamily: 'Heebo, Arial, sans-serif',
}

const outerTable = { padding: '50px 18px', background: '#05070F' }

const card = {
  maxWidth: '650px',
  width: '100%',
  borderRadius: '36px',
  overflow: 'hidden',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow: '0 0 60px rgba(255,140,0,0.12), 0 30px 80px rgba(0,0,0,0.55)',
  margin: '0 auto',
}

const topGlow = {
  height: '180px',
  background: 'radial-gradient(circle at top, rgba(255,140,0,0.35), rgba(0,0,0,0))',
}

const logoWrap = { textAlign: 'center' as const, padding: '0 40px' }

const logoImg = {
  display: 'inline-block',
  width: '110px',
  height: '110px',
  borderRadius: '32px',
  marginTop: '-80px',
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow: 'inset 0 0 25px rgba(255,255,255,0.04), 0 0 40px rgba(255,140,0,0.25)',
}

const titleWrap = { textAlign: 'center' as const, padding: '35px 45px 0' }

const h1 = {
  margin: 0,
  color: '#FFFFFF',
  fontSize: '40px',
  fontWeight: 900 as const,
  letterSpacing: '-1px',
}

const subtitle = {
  margin: '22px auto 0',
  color: '#B7C2D9',
  fontSize: '17px',
  lineHeight: '1.9',
  maxWidth: '470px',
}

const codeWrap = { textAlign: 'center' as const, padding: '50px 30px 25px' }

const codeBox = {
  padding: '28px 42px',
  borderRadius: '30px',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))',
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow: 'inset 0 0 25px rgba(255,255,255,0.03), 0 0 45px rgba(255,140,0,0.15)',
}

const code = {
  color: '#FFFFFF',
  fontSize: '54px',
  fontWeight: 900 as const,
  letterSpacing: '14px',
  fontFamily: 'SF Mono, Menlo, Monaco, monospace',
}

const expireWrap = { textAlign: 'center' as const, padding: '0 40px 55px' }

const expireText = { color: '#7E8AA8', fontSize: '14px', lineHeight: '1.8', margin: 0 }

const footerWrap = {
  textAlign: 'center' as const,
  borderTop: '1px solid rgba(255,255,255,0.08)',
  padding: '32px 35px 40px',
}

const footerText = { margin: 0, color: '#66708C', fontSize: '13px', lineHeight: '1.9' }
