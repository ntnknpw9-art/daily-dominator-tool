/// <reference lib="deno.ns" />
import { assert, assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { renderAsync as render } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { RecoveryEmail } from './recovery.tsx'

const renderHtml = async () => {
  const el = React.createElement(RecoveryEmail, {
    siteName: 'Daily Dominator',
    siteUrl: 'https://dailydominator.org',
    recipient: 'test@example.com',
    confirmationUrl: 'https://dailydominator.org/reset',
    token: '123456',
  })
  return await render(el as any)
}

Deno.test('recovery email: no replacement characters in HTML', async () => {
  const html = await renderHtml()
  for (const ch of ['\uFFFD', '\u200C']) {
    assert(!html.includes(ch), `HTML contains forbidden char U+${ch.charCodeAt(0).toString(16)}`)
  }
  assert(!/\?\?/.test(html), 'HTML contains "??" sequence')
})

Deno.test('recovery email: all Hebrew copy renders correctly', async () => {
  const html = await renderHtml()
  const expected = [
    'איפוס סיסמה',
    'השתמש בקוד האימות החד פעמי כדי לאפס את הסיסמה שלך בצורה מאובטחת.',
    'הקוד תקף למשך 15 דקות בלבד',
    'אם לא ביקשת לאפס את הסיסמה,',
    'אפשר להתעלם מהמייל הזה בבטחה.',
    '123456',
  ]
  for (const text of expected) {
    assertStringIncludes(html, text, `Missing expected text: ${text}`)
  }
})

Deno.test('recovery email: declares utf-8 charset and RTL', async () => {
  const html = await renderHtml()
  assertStringIncludes(html.toLowerCase(), 'charset=utf-8')
  assertStringIncludes(html, 'dir="rtl"')
  assertEquals(html.includes('lang="he"'), true)
})
