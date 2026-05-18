/// <reference lib="deno.ns" />
import { assert, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { renderAsync as render } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'

const decodeEntities = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
   .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))

// React Email's <Preview> pads with U+200C zero-width chars in a hidden div.
// Strip it so it does not pollute the regression checks.
const stripPreview = (html: string) =>
  html.replace(/<div style="display:none[^"]*"[^>]*>[\s\S]*?<\/div><\/div>/, '')

const assertCharsetAndRtl = (raw: string) => {
  assertStringIncludes(raw.toLowerCase(), 'charset=utf-8')
  assertStringIncludes(raw, 'dir="rtl"')
  assertStringIncludes(raw, 'lang="he"')
}

const assertNoReplacementChars = (visible: string) => {
  for (const ch of ['\uFFFD', '\u200C']) {
    assert(
      !visible.includes(ch),
      `Visible HTML contains forbidden char U+${ch.charCodeAt(0).toString(16)}`,
    )
  }
  assert(!/\?\?/.test(visible), 'Visible HTML contains "??" sequence')
}

const baseProps = {
  siteName: 'Daily Dominator',
  siteUrl: 'https://dailydominator.org',
  recipient: 'test@example.com',
  confirmationUrl: 'https://dailydominator.org/confirm',
  token: '123456',
}

const renderTemplate = async (Component: any, props: any) => {
  const raw = await render(React.createElement(Component, props))
  return { raw, visible: decodeEntities(stripPreview(raw)) }
}

// ────────────────────────── signup ──────────────────────────

const signupExpected = [
  'אימות חשבון',
  'השתמש בקוד האימות החד פעמי כדי להתחבר בצורה מאובטחת לחשבון שלך.',
  'הקוד תקף למשך 15 דקות בלבד',
  'אם לא נרשמת לחשבון,',
  'אפשר להתעלם מהמייל הזה בבטחה.',
  '123456',
]

Deno.test('signup email: no replacement characters in visible HTML', async () => {
  const { visible } = await renderTemplate(SignupEmail, baseProps)
  assertNoReplacementChars(visible)
})

Deno.test('signup email: all Hebrew copy renders correctly', async () => {
  const { visible } = await renderTemplate(SignupEmail, baseProps)
  for (const text of signupExpected) {
    assertStringIncludes(visible, text, `signup missing: ${text}`)
  }
})

Deno.test('signup email: declares utf-8 charset and RTL', async () => {
  const { raw } = await renderTemplate(SignupEmail, baseProps)
  assertCharsetAndRtl(raw)
})

// ────────────────────────── magic-link ──────────────────────────

const magicLinkExpected = [
  'התחברות לחשבון',
  'השתמש בקוד האימות החד פעמי כדי להתחבר בצורה מאובטחת לחשבון שלך.',
  'הקוד תקף למשך 15 דקות בלבד',
  'אם לא ביקשת להתחבר לחשבון שלך,',
  'אפשר להתעלם מהמייל הזה בבטחה.',
  '123456',
]

Deno.test('magic-link email: no replacement characters in visible HTML', async () => {
  const { visible } = await renderTemplate(MagicLinkEmail, baseProps)
  assertNoReplacementChars(visible)
})

Deno.test('magic-link email: all Hebrew copy renders correctly', async () => {
  const { visible } = await renderTemplate(MagicLinkEmail, baseProps)
  for (const text of magicLinkExpected) {
    assertStringIncludes(visible, text, `magic-link missing: ${text}`)
  }
})

Deno.test('magic-link email: declares utf-8 charset and RTL', async () => {
  const { raw } = await renderTemplate(MagicLinkEmail, baseProps)
  assertCharsetAndRtl(raw)
})

// ────────────────────────── invite ──────────────────────────

const inviteProps = {
  siteName: 'Daily Dominator',
  siteUrl: 'https://dailydominator.org',
  confirmationUrl: 'https://dailydominator.org/invite',
}

const inviteExpected = [
  'הוזמנת להצטרף',
  'הוזמנת להצטרף ל-Daily Dominator. לחץ על הכפתור כדי לקבל את ההזמנה וליצור חשבון.',
  'קבל הזמנה',
  'אם לא ציפית להזמנה זו,',
  'אפשר להתעלם מהמייל הזה בבטחה.',
]

Deno.test('invite email: no replacement characters in visible HTML', async () => {
  const { visible } = await renderTemplate(InviteEmail, inviteProps)
  assertNoReplacementChars(visible)
})

Deno.test('invite email: all Hebrew copy renders correctly', async () => {
  const { visible } = await renderTemplate(InviteEmail, inviteProps)
  for (const text of inviteExpected) {
    assertStringIncludes(visible, text, `invite missing: ${text}`)
  }
  assertStringIncludes(visible, inviteProps.confirmationUrl)
})

Deno.test('invite email: declares utf-8 charset and RTL', async () => {
  const { raw } = await renderTemplate(InviteEmail, inviteProps)
  assertCharsetAndRtl(raw)
})
