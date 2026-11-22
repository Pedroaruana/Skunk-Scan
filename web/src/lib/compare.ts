import type { Finding, Grade } from './types'

export type Snapshot = { domain: string; grade: Grade; grave: number; medio: number; findings: Finding[] }
export type CompareRow = { label: string; a: string; b: string }

const find = (fs: Finding[], id: string) => fs.find((f) => f.id === id)

// ok quando passou, problema quando falhou, n/d quando a checagem nao rodou nesse site
const check = (fs: Finding[], id: string): string => {
  const f = find(fs, id)
  if (!f) return 'n/d'
  return f.severity === 'ok' ? 'ok' : f.severity === 'info' ? 'nao confirmado' : 'problema'
}

const count = (fs: Finding[], id: string): number => find(fs, id)?.items?.length ?? 0

// CVEs citados nos achados de risco (cada achado lista os mais graves)
const cves = (fs: Finding[]): number =>
  fs.filter((f) => f.id.startsWith('cve-') && (f.severity === 'grave' || f.severity === 'medio')).reduce((n, f) => n + (f.items?.length ?? 0), 0)

// Linhas da tabela, todas tiradas dos achados reais das duas varreduras.
export const compareRows = (a: Snapshot, b: Snapshot): CompareRow[] => {
  const both = (label: string, fn: (s: Snapshot) => string | number): CompareRow => ({ label, a: String(fn(a)), b: String(fn(b)) })
  return [
    both('nota', (s) => s.grade),
    both('problemas graves', (s) => s.grave),
    both('problemas medios', (s) => s.medio),
    both('https', (s) => check(s.findings, 'https')),
    both('redirect para https', (s) => check(s.findings, 'redirect')),
    both('hsts', (s) => check(s.findings, 'hsts')),
    both('content-security-policy', (s) => check(s.findings, 'csp')),
    both('protecao contra iframe', (s) => check(s.findings, 'clickjacking')),
    both('spf', (s) => check(s.findings, 'spf')),
    both('dmarc', (s) => check(s.findings, 'dmarc')),
    both('versao do servidor', (s) => (find(s.findings, 'version') ? 'exposta' : 'oculta')),
    both('cves conhecidos', (s) => cves(s.findings)),
    both('subdominios publicados', (s) => count(s.findings, 'subdomains')),
    both('subdominios sensiveis', (s) => count(s.findings, 'sensitive-subdomains')),
  ]
}

// Vence a melhor nota (A e a melhor); empate de nota desempata por menos graves e depois menos medios.
export const winner = (a: Snapshot, b: Snapshot): 'a' | 'b' | 'empate' => {
  const key = (s: Snapshot): [number, number, number] => ['ABCD'.indexOf(s.grade), s.grave, s.medio]
  const ka = key(a)
  const kb = key(b)
  for (let i = 0; i < 3; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? 'a' : 'b'
  return 'empate'
}

// Tabela em colunas de texto: a largura de cada coluna acompanha o maior valor, inclusive o nome do dominio.
export const formatTable = (a: Snapshot, b: Snapshot): string[] => {
  const rows = compareRows(a, b)
  const w0 = Math.max(...rows.map((r) => r.label.length)) + 2
  const w1 = Math.max(a.domain.length, ...rows.map((r) => r.a.length)) + 2
  return [''.padEnd(w0) + a.domain.padEnd(w1) + b.domain, ...rows.map((r) => r.label.padEnd(w0) + r.a.padEnd(w1) + r.b)]
}

export const verdict = (a: Snapshot, b: Snapshot): string => {
  const w = winner(a, b)
  if (w === 'empate') return `${a.domain} e ${b.domain} estao no mesmo nivel (nota ${a.grade}, ${a.grave} graves e ${a.medio} medios cada).`
  const best = w === 'a' ? a : b
  const other = w === 'a' ? b : a
  return `${best.domain} esta mais protegido: nota ${best.grade} contra ${other.grade}.`
}

// Versao para tela estreita: cada metrica vira duas linhas (nome, depois "valor de A  |  valor de B"), sem colunas que quebram.
export const formatStacked = (a: Snapshot, b: Snapshot): [label: string, values: string][] => [
  [a.domain + '  |  ' + b.domain, 'esquerda: ' + a.domain + '   direita: ' + b.domain],
  ...compareRows(a, b).map((r): [string, string] => [r.label, r.a + '  |  ' + r.b]),
]
