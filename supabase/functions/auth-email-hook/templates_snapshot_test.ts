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

const renderHtml = async (Component: any, props: any) =>
  await render(React.createElement(Component, props))

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
