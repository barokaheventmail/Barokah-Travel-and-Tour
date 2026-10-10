import type { ReactNode } from 'react'

const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g

/**
 * Render teks kaya sederhana: **tebal** dan *miring*.
 * Baris baru dipertahankan sebagai <br/>. Aman (tanpa HTML mentah).
 */
export function renderRichText(text: string | null | undefined): ReactNode {
  if (!text) return null

  const nodes: ReactNode[] = []
  const lines = text.split('\n')

  lines.forEach((line, li) => {
    if (li > 0) nodes.push(<br key={`br-${li}`} />)

    const re = new RegExp(TOKEN)
    let match: RegExpExecArray | null
    let last = 0
    let i = 0

    while ((match = re.exec(line)) !== null) {
      if (match.index > last) nodes.push(line.slice(last, match.index))
      const token = match[1]
      if (token.startsWith('**')) {
        nodes.push(<strong key={`b-${li}-${i}`}>{token.slice(2, -2)}</strong>)
      } else {
        nodes.push(<em key={`i-${li}-${i}`}>{token.slice(1, -1)}</em>)
      }
      last = re.lastIndex
      i += 1
    }

    if (last < line.length) nodes.push(line.slice(last))
  })

  return nodes
}
