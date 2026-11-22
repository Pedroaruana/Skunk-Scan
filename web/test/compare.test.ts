import { describe, expect, it } from 'vitest'
import { compareRows, formatStacked, formatTable, verdict, winner, type Snapshot } from '../src/lib/compare'
import type { Finding } from '../src/lib/types'

const f = (id: string, severity: Finding['severity'], items?: string[]): Finding => ({ id, severity, title: id, detail: 'd', items })
const snap = (domain: string, grade: Snapshot['grade'], grave: number, medio: number, findings: Finding[] = []): Snapshot => ({ domain, grade, grave, medio, findings })

const bom = snap('bom.com.br', 'A', 0, 1, [
  f('https', 'ok'),
  f('hsts', 'ok'),
  f('csp', 'medio'),
  f('dmarc', 'ok'),
  f('subdomains', 'info', ['www.bom.com.br', 'api.bom.com.br']),
])
const ruim = snap('ruim.com.br', 'D', 2, 3, [
  f('https', 'grave'),
  f('hsts', 'medio'),
  f('version', 'medio', ['nginx/1.18.0']),
  f('cve-nginx', 'grave', ['CVE-1', 'CVE-2', 'CVE-3']),
  f('sensitive-subdomains', 'medio', ['dev.ruim.com.br']),
  f('subdomains', 'info', ['dev.ruim.com.br']),
])

describe('compareRows', () => {
  const rows = Object.fromEntries(compareRows(bom, ruim).map((r) => [r.label, [r.a, r.b]]))

  it('le notas e contagens dos dois sites', () => {
    expect(rows['nota']).toEqual(['A', 'D'])
    expect(rows['problemas graves']).toEqual(['0', '2'])
    expect(rows['problemas medios']).toEqual(['1', '3'])
  })

  it('transforma cada achado em ok, problema ou n/d', () => {
    expect(rows['https']).toEqual(['ok', 'problema'])
    expect(rows['hsts']).toEqual(['ok', 'problema'])
    expect(rows['content-security-policy']).toEqual(['problema', 'n/d'])
    expect(rows['dmarc']).toEqual(['ok', 'n/d'])
  })

  it('conta versao exposta, CVEs e subdominios', () => {
    expect(rows['versao do servidor']).toEqual(['oculta', 'exposta'])
    expect(rows['cves conhecidos']).toEqual(['0', '3'])
    expect(rows['subdominios publicados']).toEqual(['2', '1'])
    expect(rows['subdominios sensiveis']).toEqual(['0', '1'])
  })

  it('achado informativo vira "nao confirmado"', () => {
    const r = compareRows(snap('a.com', 'B', 0, 0, [f('spf', 'info')]), snap('b.com', 'B', 0, 0))
    expect(r.find((x) => x.label === 'spf')).toEqual({ label: 'spf', a: 'nao confirmado', b: 'n/d' })
  })
})

describe('winner e verdict', () => {
  it('vence a melhor nota', () => {
    expect(winner(bom, ruim)).toBe('a')
    expect(winner(ruim, bom)).toBe('b')
  })

  it('mesma nota desempata por graves e depois por medios', () => {
    expect(winner(snap('a', 'C', 1, 4), snap('b', 'C', 0, 6))).toBe('b')
    expect(winner(snap('a', 'C', 0, 3), snap('b', 'C', 0, 5))).toBe('a')
  })

  it('tudo igual e empate', () => {
    expect(winner(snap('a', 'B', 0, 2), snap('b', 'B', 0, 2))).toBe('empate')
    expect(verdict(snap('a.com', 'B', 0, 2), snap('b.com', 'B', 0, 2))).toContain('mesmo nivel')
  })

  it('o veredito cita o dominio vencedor e as notas', () => {
    expect(verdict(bom, ruim)).toBe('bom.com.br esta mais protegido: nota A contra D.')
    expect(verdict(ruim, bom)).toBe('bom.com.br esta mais protegido: nota A contra D.')
  })
})

describe('formatTable', () => {
  it('alinha as colunas pelo maior valor, inclusive o nome do dominio', () => {
    const lines = formatTable(bom, snap('um-dominio-bem-comprido.com.br', 'B', 0, 0))
    const col = lines[0].indexOf('um-dominio')
    expect(lines.every((l) => l.length >= col)).toBe(true)
    expect(lines[1].slice(col).trim()).toBe('B')
    expect(lines).toHaveLength(15)
  })
})

describe('formatStacked', () => {
  it('uma metrica por par de linhas, com os dois valores separados por barra', () => {
    const rows = formatStacked(bom, ruim)
    expect(rows[0][0]).toBe('bom.com.br  |  ruim.com.br')
    expect(rows.find(([l]) => l === 'nota')).toEqual(['nota', 'A  |  D'])
    expect(rows).toHaveLength(15)
  })
})
