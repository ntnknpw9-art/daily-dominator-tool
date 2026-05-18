import { renderAsync as render } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { Html, Body, Text } from 'npm:@react-email/components@0.0.22'
const Case = ({ text }: { text: string }) => <Html><Body><Text style={{fontSize:'17px',lineHeight:'1.9',margin:'22px auto 0',color:'#B7C2D9',maxWidth:'470px'}}>{text}</Text></Body></Html>
const exact = '\u05d4\u05e9\u05ea\u05de\u05e9 \u05d1\u05e7\u05d5\u05d3 \u05d4\u05d0\u05d9\u05de\u05d5\u05ea \u05d4\u05d7\u05d3 \u05e4\u05e2\u05de\u05d9 \u05db\u05d3\u05d9 \u05dc\u05d4\u05ea\u05d7\u05d1\u05e8 \u05d1\u05e6\u05d5\u05e8\u05d4 \u05de\u05d0\u05d5\u05d1\u05d8\u05d7\u05ea \u05dc\u05d7\u05e9\u05d1\u05d5\u05df \u05e9\u05dc\u05da.'
console.log([...exact].map(c=>c.charCodeAt(0).toString(16)).join(' '))
const html = await render(React.createElement(Case, { text: exact }))
const p = html.match(/<p[\s\S]*?<\/p>/)?.[0] ?? ''
console.log(p)
console.log([...p].map(c=>c.charCodeAt(0).toString(16)).join(' '))
