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

// ────────────────────────── preview-text isolation ──────────────────────────
// The hidden React Email <Preview> block must not leak into the visible body
// and the visible body must not contain the zero-width padding chars React
// Email injects after the preview text.

const previewCases: Array<{ name: string; Component: any; props: any; previewText: string }> = [
  {
    name: 'signup',
    Component: SignupEmail,
    props: baseProps,
    previewText: 'קוד אימות המייל שלך - Daily Dominator',
  },
  {
    name: 'magic-link',
    Component: MagicLinkEmail,
    props: baseProps,
    previewText: 'קישור התחברות - Daily Dominator',
  },
  {
    name: 'invite',
    Component: InviteEmail,
    props: inviteProps,
    previewText: 'הוזמנת ל-Daily Dominator',
  },
]

for (const { name, Component, props, previewText } of previewCases) {
  Deno.test(`${name} email: preview text exists only in hidden block`, async () => {
    const { raw, visible } = await renderTemplate(Component, props)

    // The preview text must appear somewhere in the raw HTML (hidden block).
    assertStringIncludes(decodeEntities(raw), previewText, 'preview block missing from raw HTML')

    // But it must NOT appear in the visible body (after stripping the hidden block).
    assert(
      !decodeEntities(stripPreview(raw)).includes(previewText),
      `${name}: preview text leaked into visible body: "${previewText}"`,
    )

    // Visible body must not contain React Email's zero-width padding garbage.
    for (const ch of ['\u200C', '\u200B', '\u200D', '\u200E', '\u200F', '\uFEFF']) {
      assert(
        !visible.includes(ch),
        `${name}: visible body contains zero-width char U+${ch.charCodeAt(0).toString(16)}`,
      )
    }
  })
}

