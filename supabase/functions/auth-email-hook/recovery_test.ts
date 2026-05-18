/// <reference lib="deno.ns" />
import { assert, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { renderAsync as render } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'

const decodeEntities = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
   .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))

// React Email's <Preview> component pads with U+200C zero-width chars in a
// hidden div. Strip that block so it doesn't pollute our regression checks.
const stripPreview = (html: string) =>
  html.replace(
    /<div style="display:none[^"]*"[^>]*>[\s\S]*?<\/div><\/div>/,
    '',
  )

const renderHtml = async () => {
  const el = React.createElement(RecoveryEmail, {
    siteName: 'Daily Dominator',
    siteUrl: 'https://dailydominator.org',
    recipient: 'test@example.com',
    confirmationUrl: 'https://dailydominator.org/reset',
    token: '123456',
  })
  const raw = await render(el as any)
  return { raw, visible: decodeEntities(stripPreview(raw)) }
}

Deno.test('recovery email: no replacement characters in visible HTML', async () => {
  const { visible } = await renderHtml()
  for (const ch of ['\uFFFD', '\u200C']) {
    assert(
      !visible.includes(ch),
      `Visible HTML contains forbidden char U+${ch.charCodeAt(0).toString(16)}`,
    )
  }
  assert(!/\?\?/.test(visible), 'Visible HTML contains "??" sequence')
})

Deno.test('recovery email: all Hebrew copy renders correctly', async () => {
  const { visible } = await renderHtml()
  const expected = [
    'איפוס סיסמה',
    'השתמש בקוד האימות החד פעמי כדי לאפס את הסיסמה שלך בצורה מאובטחת.',
    'הקוד תקף למשך 15 דקות בלבד',
    'אם לא ביקשת לאפס את הסיסמה,',
    'אפשר להתעלם מהמייל הזה בבטחה.',
    '123456',
  ]
  for (const text of expected) {
    assertStringIncludes(visible, text, `Missing expected text: ${text}`)
  }
})

Deno.test('recovery email: declares utf-8 charset and RTL', async () => {
  const { raw } = await renderHtml()
  assertStringIncludes(raw.toLowerCase(), 'charset=utf-8')
  assertStringIncludes(raw, 'dir="rtl"')
  assertStringIncludes(raw, 'lang="he"')
})
