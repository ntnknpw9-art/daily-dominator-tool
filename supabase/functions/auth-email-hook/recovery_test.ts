/// <reference lib="deno.ns" />
import { assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { renderAsync as render } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { assertAllFieldsRender, assertCleanVisibleHtml } from './_diagnostics.ts'

const decodeEntities = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
   .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))

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
  assertCleanVisibleHtml('recovery', visible)
})

Deno.test('recovery email: all Hebrew copy renders correctly', async () => {
  const { visible } = await renderHtml()
  assertAllFieldsRender('recovery', visible, {
    TITLE: 'איפוס סיסמה',
    SUBTITLE: 'השתמש בקוד האימות החד פעמי כדי לאפס את הסיסמה שלך בצורה מאובטחת.',
    EXPIRE_TEXT: 'הקוד תקף למשך 15 דקות בלבד',
    FOOTER_TEXT_1: 'אם לא ביקשת לאפס את הסיסמה,',
    FOOTER_TEXT_2: 'אפשר להתעלם מהמייל הזה בבטחה.',
    TOKEN: '123456',
  })
})

Deno.test('recovery email: declares utf-8 charset and RTL', async () => {
  const { raw } = await renderHtml()
  assertStringIncludes(raw.toLowerCase(), 'charset=utf-8')
  assertStringIncludes(raw, 'dir="rtl"')
  assertStringIncludes(raw, 'lang="he"')
})
