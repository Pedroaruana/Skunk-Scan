import type { Grade } from './scoring'

// o selo so vale enquanto a ultima varredura for recente e tiver nota A
export const SEAL_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export type Latest = { grade: Grade; createdAt: number }

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const two = (n: number) => String(n).padStart(2, '0')
const dateLabel = (ms: number): string => {
  const d = new Date(ms)
  return `${two(d.getUTCDate())}/${two(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
}

// Selo em SVG no estilo do terminal: duas metades, nome do produto e "verificado A".
// Devolve null quando nao ha direito ao selo, e a rota responde 404 (a imagem some do site sozinha).
export const buildSeal = (domain: string, latest: Latest | null, now = Date.now()): string | null => {
  if (!latest || latest.grade !== 'A' || now - latest.createdAt > SEAL_MAX_AGE_MS) return null
  const label = `verificado pelo skunkscan: ${domain} com nota A em ${dateLabel(latest.createdAt)}`
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="212" height="28" viewBox="0 0 212 28" role="img" aria-label="${esc(label)}">`,
    `<title>${esc(label)}</title>`,
    '<rect width="212" height="28" fill="#121212"/>',
    '<rect x="0.5" y="0.5" width="211" height="27" fill="none" stroke="#6a6a6a" stroke-dasharray="3 2"/>',
    '<rect x="102" y="0" width="110" height="28" fill="#f2f2f2"/>',
    '<g font-family="JetBrains Mono,ui-monospace,Menlo,Consolas,monospace" font-size="12" dominant-baseline="central">',
    '<text x="12" y="14" fill="#e6e6e6">[#] skunkscan</text>',
    '<text x="114" y="14" fill="#0b0b0b" font-weight="700">verificado A</text>',
    '</g>',
    '</svg>',
  ].join('')
}
