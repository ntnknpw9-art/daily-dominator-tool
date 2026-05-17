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

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>קוד אימות הזהות שלך</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>Daily Dominator</Heading>
        <Heading style={h1}>אימות זהות</Heading>
        <Text style={text}>השתמש בקוד הבא כדי לאשר את זהותך:</Text>
        <Section style={codeBox}>
          <Text style={code}>{token}</Text>
        </Section>
        <Text style={footer}>הקוד תקף ל-15 דקות. אם לא ביקשת זאת, ניתן להתעלם מהמייל.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Heebo, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '480px', textAlign: 'right' as const }
const brand = {
  fontSize: '14px',
  fontWeight: 800 as const,
  color: 'hsl(0, 72%, 51%)',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  margin: '0 0 24px',
}
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0a0a0a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#404040', lineHeight: '1.6', margin: '0 0 20px' }
const codeBox = {
  backgroundColor: '#0a0a0a',
  borderRadius: '12px',
  padding: '20px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}
const code = {
  fontSize: '32px',
  fontWeight: 800 as const,
  color: 'hsl(38, 92%, 50%)',
  letterSpacing: '8px',
  margin: 0,
  fontFamily: 'monospace',
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0', lineHeight: '1.5' }
