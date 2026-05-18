import { renderAsync as render } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
const html = await render(React.createElement(SignupEmail, { siteName: 'Daily Dominator', siteUrl: 'x', recipient: 'x', confirmationUrl: 'x', token: '123456' }))
const s = html.match(/<p style="font-size:17px[\s\S]*?<\/p>/)?.[0] ?? ''
console.log(s)
console.log([...s].map((c) => c.charCodeAt(0).toString(16)).join(' '))
