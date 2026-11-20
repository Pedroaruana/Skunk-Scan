import { describe, expect, it } from 'vitest'
import { atomFeed } from '../src/feed'
import { gradeDropped, isToken, newToken, parseWebhook } from '../src/monitor'
import type { HistoryPoint } from '../src/reports'

describe('parseWebhook', () => {
  it.each(['https://hooks.slack.com/services/T0/B0/xyz', 'https://discord.com/api/webhooks/1/abc', 'https://exemplo.com.br:443/hook?k=1'])('aceita %s', (u) => {
    expect(parseWebhook(u)).not.toBeNull()
  })

  it.each([
    ['http sem tls', 'http://exemplo.com/hook'],
    ['ip literal', 'https://1.2.3.4/hook'],
    ['ipv6', 'https://[::1]/hook'],
    ['localhost', 'https://localhost/hook'],
    ['sem ponto', 'https://intranet/hook'],
    ['sufixo interno', 'https://painel.internal/hook'],
    ['usuario e senha', 'https://user:pass@exemplo.com/hook'],
    ['porta fora do padrao', 'https://exemplo.com:8443/hook'],
    ['nao e url', 'isso nao e url'],
    ['vazio', ''],
    ['nao e texto', 42],
    ['muito longo', 'https://exemplo.com/' + 'a'.repeat(500)],
  ])('recusa %s', (_nome, u) => {
    expect(parseWebhook(u)).toBeNull()
  })
})

describe('gradeDropped', () => {
  it('so avisa quando a nota piora', () => {
    expect(gradeDropped('A', 'B')).toBe(true)
    expect(gradeDropped('B', 'D')).toBe(true)
    expect(gradeDropped('B', 'B')).toBe(false)
    expect(gradeDropped('C', 'A')).toBe(false)
  })

  it('primeira verificacao nao dispara alerta', () => {
    expect(gradeDropped(null, 'D')).toBe(false)
  })
})

describe('token', () => {
  it('gera 24 hexa que passam na validacao e nao repete', () => {
    const tokens = Array.from({ length: 200 }, newToken)
    expect(new Set(tokens).size).toBe(200)
    expect(tokens.every(isToken)).toBe(true)
  })

  it.each(['', 'abc', 'g'.repeat(24), '../x', 'a'.repeat(25)])('recusa %j', (v) => {
    expect(isToken(v)).toBe(false)
  })
})

describe('atomFeed', () => {
  const day = 86_400_000
  const scans: HistoryPoint[] = [
    { grade: 'B', grave: 0, medio: 2, createdAt: 1_700_000_000_000 },
    { grade: 'A', grave: 0, medio: 1, createdAt: 1_700_000_000_000 + day },
    { grade: 'C', grave: 1, medio: 0, createdAt: 1_700_000_000_000 + 2 * day },
  ]
  const xml = atomFeed('loja.com.br', scans, 'https://api.exemplo/api/feed/loja.com.br')

  it('lista da varredura mais nova para a mais antiga', () => {
    const titles = [...xml.matchAll(/<entry>[\s\S]*?<title>(.*?)<\/title>/g)].map((m) => m[1])
    expect(titles).toEqual(['Nota C (caiu de A)', 'Nota A (subiu de B)', 'Nota B'])
  })

  it('usa a data da mais nova como updated do feed e conta no singular e plural', () => {
    expect(xml).toContain(`<updated>${new Date(1_700_000_000_000 + 2 * day).toISOString()}</updated>`)
    expect(xml).toContain('1 problema grave e 0 medios')
    expect(xml).toContain('0 problemas graves e 1 medio')
  })

  it('escapa o que vem de fora e funciona sem varreduras', () => {
    const out = atomFeed('a.com', [], 'https://x/?a=1&b="2"')
    expect(out).toContain('href="https://x/?a=1&amp;b=&quot;2&quot;"')
    expect(out).not.toContain('<entry>')
    expect(out.startsWith('<?xml')).toBe(true)
  })
})
