/// <reference lib="deno.ns" />
import { assertSnapshot } from 'https://deno.land/std@0.224.0/testing/snapshot.ts'
import { renderAsync as render } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'

// Deterministic props so snapshots stay stable across runs.
const otpProps = {
  siteName: 'Daily Dominator',
  siteUrl: 'https://dailydominator.org',
  recipient: 'test@example.com',
  confirmationUrl: 'https://dailydominator.org/confirm',
  token: '123456',
}

const inviteProps = {
  siteName: 'Daily Dominator',
  siteUrl: 'https://dailydominator.org',
  confirmationUrl: 'https://dailydominator.org/invite/abc',
}

// Strip React Email's hidden <Preview> block — its zero-width padding chars
// are visual noise and not part of the visible email layout we want to track.
const stripPreviewBlock = (html: string) =>
  html.replace(/<div style="display:none[^"]*"[^>]*>[\s\S]*?<\/div><\/div>/, '')

// Strip zero-width / bidi formatting chars that have no visible meaning.
// Note: U+200B is preserved because React Email's <Button> uses it for
// legitimate Outlook layout fixes.
const ZERO_WIDTH = /[\u200C-\u200F\u2028\u2029\u202A-\u202E\u2060\uFEFF]/g

const sanitize = (html: string) => stripPreviewBlock(html).replace(ZERO_WIDTH, '')

const renderHtml = async (Component: any, props: any) =>
  sanitize(await render(React.createElement(Component, props)))

Deno.test('snapshot: signup email HTML', async (t) => {
  const html = await renderHtml(SignupEmail, otpProps)
  await assertSnapshot(t, html)
})

Deno.test('snapshot: magic-link email HTML', async (t) => {
  const html = await renderHtml(MagicLinkEmail, otpProps)
  await assertSnapshot(t, html)
})

Deno.test('snapshot: invite email HTML', async (t) => {
  const html = await renderHtml(InviteEmail, inviteProps)
  await assertSnapshot(t, html)
})
