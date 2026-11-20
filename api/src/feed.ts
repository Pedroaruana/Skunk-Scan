import type { HistoryPoint } from './reports'

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const change = (prev: HistoryPoint | undefined, cur: HistoryPoint): string => {
  if (!prev || prev.grade === cur.grade) return ''
  return cur.grade > prev.grade ? ` (caiu de ${prev.grade})` : ` (subiu de ${prev.grade})`
}

// Atom com as varreduras mais recentes do dominio, da mais nova pra mais antiga.
// So traz nota, contagens e data: o conteudo dos relatorios continua so no link de cada um.
export const atomFeed = (domain: string, scans: HistoryPoint[], selfUrl: string): string => {
  const newest = [...scans].reverse()
  const updated = new Date(newest[0]?.createdAt ?? Date.now()).toISOString()
  const entries = newest.map((s, i) => {
    const title = `Nota ${s.grade}${change(scans[scans.length - 1 - i - 1], s)}`
    const when = new Date(s.createdAt).toISOString()
    return [
      '  <entry>',
      `    <id>urn:skunkscan:${esc(domain)}:${s.createdAt}</id>`,
      `    <title>${esc(title)}</title>`,
      `    <updated>${when}</updated>`,
      `    <summary>${esc(`${domain}: ${plural(s.grave, 'problema grave', 'problemas graves')} e ${plural(s.medio, 'medio', 'medios')}.`)}</summary>`,
      '  </entry>',
    ].join('\n')
  })
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <id>urn:skunkscan:${esc(domain)}</id>`,
    `  <title>SkunkScan: ${esc(domain)}</title>`,
    `  <link rel="self" href="${esc(selfUrl)}"/>`,
    `  <updated>${updated}</updated>`,
    ...entries,
    '</feed>',
    '',
  ].join('\n')
}
