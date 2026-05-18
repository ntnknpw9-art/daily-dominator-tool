/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

const LOGO_URL =
  'https://jtdxblauyfhfvszlbppz.supabase.co/storage/v1/object/public/email-assets/daily-dominator-logo.png'

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head>
      <meta charSet="utf-8" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
    </Head>
    <Preview>אישור שינוי כתובת מייל - Daily Dominator</Preview>
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
                <Heading style={h1}>שינוי כתובת מייל</Heading>
                <Text style={subtitle}>
                  ביקשת לשנות את כתובת המייל שלך מ-<strong style={emphasis}>{oldEmail}</strong> ל-<strong style={emphasis}>{newEmail}</strong>.
                </Text>
              </Section>

              <Section style={buttonWrap}>
                <Button style={button} href={confirmationUrl}>
                  אשר שינוי
                </Button>
              </Section>

              <Section style={footerWrap}>
                <Text style={footerText}>
                  אם לא ביקשת את השינוי הזה,<br />
                  אבטח את החשבון שלך באופן מיידי.
                </Text>
              </Section>
            </Container>
          </td>
        </tr>
      </table>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { margin: 0, padding: 0, backgroundColor: '#05070F', fontFamily: 'Heebo, Arial, sans-serif' }
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
const topGlow = { height: '180px', background: 'radial-gradient(circle at top, rgba(255,140,0,0.35), rgba(0,0,0,0))' }
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
const h1 = { margin: 0, color: '#FFFFFF', fontSize: '40px', fontWeight: 900 as const, letterSpacing: '-1px' }
const subtitle = { margin: '22px auto 0', color: '#B7C2D9', fontSize: '17px', lineHeight: '1.9', maxWidth: '470px' }
const emphasis = { color: '#FFB55C' }
const buttonWrap = { textAlign: 'center' as const, padding: '50px 30px 55px' }
const button = {
  background: 'linear-gradient(145deg, #FF8C00, #E07000)',
  color: '#FFFFFF',
  fontSize: '17px',
  fontWeight: 800 as const,
  borderRadius: '999px',
  padding: '18px 44px',
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 0 30px rgba(255,140,0,0.4)',
}
const footerWrap = { textAlign: 'center' as const, borderTop: '1px solid rgba(255,255,255,0.08)', padding: '32px 35px 40px' }
const footerText = { margin: 0, color: '#66708C', fontSize: '13px', lineHeight: '1.9' }
