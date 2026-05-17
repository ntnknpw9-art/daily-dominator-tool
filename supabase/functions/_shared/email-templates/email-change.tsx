/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>אישור שינוי כתובת מייל ב-{siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>Daily Dominator</Heading>
        <Heading style={h1}>אישור שינוי כתובת מייל</Heading>
        <Text style={text}>
          ביקשת לשנות את כתובת המייל ב-{siteName} מ-<strong>{oldEmail}</strong> ל-<strong>{newEmail}</strong>.
        </Text>
        <Text style={text}>לחץ על הכפתור כדי לאשר את השינוי:</Text>
        <Button style={button} href={confirmationUrl}>
          אשר שינוי
        </Button>
        <Text style={footer}>אם לא ביקשת שינוי זה, אבטח את חשבונך באופן מיידי.</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const button = {
  backgroundColor: 'hsl(0, 72%, 51%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0', lineHeight: '1.5' }
