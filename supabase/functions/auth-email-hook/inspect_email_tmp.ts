import { renderAsync as render } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { Html, Body, Text } from 'npm:@react-email/components@0.0.22'
const Case = ({ text }: { text: string }) => <Html><Body><Text>{text}</Text></Body></Html>
for (const text of ['ב', '\\u05d1', '\u05d1', 'חב', '\u05d7\u05d1', 'כב', '\u05db\u05d1', 'כפתור', '\u05db\u05e4\u05ea\u05d5\u05e8']) {
  const html = await render(React.createElement(Case, { text }))
  const p = html.match(/<p[\s\S]*?<\/p>/)?.[0] ?? ''
  console.log(JSON.stringify(text), '=>', p, [...p].map(c=>c.charCodeAt(0).toString(16)).join(' '))
}
