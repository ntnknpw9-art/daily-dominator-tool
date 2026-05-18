/// <reference lib="deno.ns" />
// Diagnostic helpers for email template regression tests.
// When a test fails, these print a precise report of WHERE the
// replacement chars / "??" sequences appear and WHICH labelled
// field/component is missing from the visible HTML, so issues can
// be fixed pinpoint-style instead of by guessing.

const FORBIDDEN: Array<{ char: string; name: string }> = [
  { char: '\uFFFD', name: 'U+FFFD REPLACEMENT CHARACTER' },
  { char: '\u200C', name: 'U+200C ZERO-WIDTH NON-JOINER' },
  { char: '\uFEFF', name: 'U+FEFF BYTE ORDER MARK' },
]

const CONTEXT = 40

const escapeForLog = (s: string) =>
  s.replace(/[\u0000-\u001f\u007f-\u009f]/g, (c) =>
    `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
  )

const findContexts = (visible: string, needle: string) => {
  const hits: Array<{ index: number; snippet: string }> = []
  let i = 0
  while (true) {
    const idx = visible.indexOf(needle, i)
    if (idx === -1) break
    const start = Math.max(0, idx - CONTEXT)
    const end = Math.min(visible.length, idx + needle.length + CONTEXT)
    hits.push({
      index: idx,
      snippet: escapeForLog(visible.slice(start, end)),
    })
    i = idx + needle.length
  }
  return hits
}

/**
 * Asserts that the visible HTML contains no forbidden characters and no "??".
 * On failure prints exactly where they appear (codepoint, index, surrounding
 * 40 chars on each side) so the source field/component is obvious.
 */
export const assertCleanVisibleHtml = (template: string, visible: string) => {
  const problems: string[] = []

  for (const { char, name } of FORBIDDEN) {
    const hits = findContexts(visible, char)
    for (const h of hits) {
      problems.push(
        `  • [${template}] ${name} at index ${h.index}\n      …${h.snippet}…`,
      )
    }
  }

  const qqHits = findContexts(visible, '??')
  for (const h of qqHits) {
    problems.push(
      `  • [${template}] "??" sequence at index ${h.index}\n      …${h.snippet}…`,
    )
  }

  if (problems.length) {
    throw new Error(
      `\n[${template}] visible HTML contains forbidden characters:\n` +
        problems.join('\n') +
        '\nFix: open the template above and look for the field whose Hebrew text appears in the snippet — that field is the source.',
    )
  }
}

/**
 * Asserts that every labelled expected string appears in the visible HTML.
 * Prints a per-field PASS/FAIL table on failure so you know which exact
 * component/field is broken.
 */
export const assertAllFieldsRender = (
  template: string,
  visible: string,
  fields: Record<string, string>,
) => {
  const missing: string[] = []
  const report: string[] = []
  for (const [label, text] of Object.entries(fields)) {
    if (visible.includes(text)) {
      report.push(`  ✓ ${label}`)
    } else {
      report.push(`  ✗ ${label}   →   expected: "${escapeForLog(text)}"`)
      missing.push(label)
    }
  }
  if (missing.length) {
    throw new Error(
      `\n[${template}] ${missing.length} field(s) missing from visible HTML:\n` +
        report.join('\n') +
        `\nFix: the failing labels above map 1:1 to a constant/JSX node in the template — edit those.`,
    )
  }
}
