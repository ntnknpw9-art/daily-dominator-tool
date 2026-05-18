/// <reference lib="deno.ns" />
import { assert, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { renderAsync as render } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { assertAllFieldsRender, assertCleanVisibleHtml } from './_diagnostics.ts'

const decodeEntities = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
   .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))

const stripPreview = (html: string) =>
  html.replace(/<div style="display:none[^"]*"[^>]*>[\s\S]*?<\/div><\/div>/, '')

const assertCharsetAndRtl = (raw: string) => {
  assertStringIncludes(raw.toLowerCase(), 'charset=utf-8')
  assertStringIncludes(raw, 'dir="rtl"')
  assertStringIncludes(raw, 'lang="he"')
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

const signupFields = {
  TITLE: 'אימות חשבון',
  SUBTITLE: 'השתמש בקוד האימות החד פעמי כדי להתחבר בצורה מאובטחת לחשבון שלך.',
  EXPIRE_TEXT: 'הקוד תקף למשך 15 דקות בלבד',
  FOOTER_TEXT_1: 'אם לא נרשמת לחשבון,',
  FOOTER_TEXT_2: 'אפשר להתעלם מהמייל הזה בבטחה.',
  TOKEN: '123456',
}

Deno.test('signup email: no replacement characters in visible HTML', async () => {
  const { visible } = await renderTemplate(SignupEmail, baseProps)
  assertCleanVisibleHtml('signup', visible)
})

Deno.test('signup email: all Hebrew copy renders correctly', async () => {
  const { visible } = await renderTemplate(SignupEmail, baseProps)
  assertAllFieldsRender('signup', visible, signupFields)
})

Deno.test('signup email: declares utf-8 charset and RTL', async () => {
  const { raw } = await renderTemplate(SignupEmail, baseProps)
  assertCharsetAndRtl(raw)
})

// ────────────────────────── magic-link ──────────────────────────

const magicLinkFields = {
  TITLE: 'התחברות לחשבון',
  SUBTITLE: 'השתמש בקוד האימות החד פעמי כדי להתחבר בצורה מאובטחת לחשבון שלך.',
  EXPIRE_TEXT: 'הקוד תקף למשך 15 דקות בלבד',
  FOOTER_TEXT_1: 'אם לא ביקשת להתחבר לחשבון שלך,',
  FOOTER_TEXT_2: 'אפשר להתעלם מהמייל הזה בבטחה.',
  TOKEN: '123456',
}

Deno.test('magic-link email: no replacement characters in visible HTML', async () => {
  const { visible } = await renderTemplate(MagicLinkEmail, baseProps)
  assertCleanVisibleHtml('magic-link', visible)
})

Deno.test('magic-link email: all Hebrew copy renders correctly', async () => {
  const { visible } = await renderTemplate(MagicLinkEmail, baseProps)
  assertAllFieldsRender('magic-link', visible, magicLinkFields)
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

const inviteFields = {
  TITLE: 'הוזמנת להצטרף',
  SUBTITLE: 'הוזמנת להצטרף ל-Daily Dominator. לחץ על הכפתור כדי לקבל את ההזמנה וליצור חשבון.',
  CTA_BUTTON: 'קבל הזמנה',
  FOOTER_TEXT_1: 'אם לא ציפית להזמנה זו,',
  FOOTER_TEXT_2: 'אפשר להתעלם מהמייל הזה בבטחה.',
  CONFIRMATION_URL: inviteProps.confirmationUrl,
}

Deno.test('invite email: no replacement characters in visible HTML', async () => {
  const { visible } = await renderTemplate(InviteEmail, inviteProps)
  assertCleanVisibleHtml('invite', visible)
})

Deno.test('invite email: all Hebrew copy renders correctly', async () => {
  const { visible } = await renderTemplate(InviteEmail, inviteProps)
  assertAllFieldsRender('invite', visible, inviteFields)
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

    // Visible body must not contain the zero-width chars React Email injects
    // into the preview block (U+200C / U+FEFF). U+200B is intentionally used
    // by React Email's <Button> for Outlook layout fixes, so we allow it.
    for (const ch of ['\u200C', '\uFEFF']) {
      assert(
        !visible.includes(ch),
        `${name}: visible body contains zero-width char U+${ch.charCodeAt(0).toString(16)}`,
      )
    }
  })
}

