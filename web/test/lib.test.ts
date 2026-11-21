import { describe, expect, it } from 'vitest'
import { readSse } from '../src/lib/api'
import { ago, chart, cleanDomain, evolutionMessage, fmtDate, isInternalTarget } from '../src/lib/format'
import { buildGraph, fan } from '../src/lib/mapGraph'
import { parseHash } from '../src/lib/router'
import type { Finding, Report } from '../src/lib/types'

const f = (id: string, severity: Finding['severity'], extra: Partial<Finding> = {}): Finding => ({ id, severity, title: 'titulo ' + id, detail: 'detalhe', ...extra })
const report = (findings: Finding[]): Report => ({ id: 'abc123abc123', domain: 'loja.com.br', grade: 'C', grave: 0, medio: 2, findings, createdAt: 1_700_000_000_000 })

describe('cleanDomain / isInternalTarget', () => {
  it('tira protocolo, caminho e caixa', () => {
    expect(cleanDomain('HTTPS://Loja.com.br/x?y=1')).toBe('loja.com.br')
    expect(cleanDomain(undefined)).toBe('')
  })

  it.each(['localhost', '127.0.0.1', '10.0.0.5', '192.168.1.1', '172.16.0.1', '172.31.9.9', '169.254.1.1', '0.0.0.0'])('bloqueia %s', (d) => {
    expect(isInternalTarget(d)).toBe(true)
  })

  it.each(['example.com', '172.32.0.1', '11.0.0.1'])('libera %s', (d) => {
    expect(isInternalTarget(d)).toBe(false)
  })
})

describe('datas', () => {
  it('ago escolhe a unidade', () => {
    const now = 10_000_000_000
    expect(ago(now - 30_000, now)).toBe('agora')
    expect(ago(now - 5 * 60_000, now)).toBe('5m')
    expect(ago(now - 3 * 3_600_000, now)).toBe('3h')
    expect(ago(now - 2 * 86_400_000, now)).toBe('2d')
  })

  it('fmtDate traz dia, mes e ano', () => {
    expect(fmtDate(new Date(2026, 10, 7).getTime())).toBe('07/11/2026')
  })
})

describe('chart', () => {
  it('desenha um ponto por varredura e liga as notas', () => {
    const out = chart([['01/11', 'D'], ['08/11', 'B'], ['15/11', 'A']])
    expect(out.split('\n')).toHaveLength(6)
    expect(out.match(/●/g)).toHaveLength(3)
    expect(out).toContain('┘')
    expect(out).toContain('01/11')
  })

  it('aceita uma varredura so', () => {
    expect(chart([['01/11', 'C']]).match(/●/g)).toHaveLength(1)
  })
})

describe('evolutionMessage', () => {
  it('descreve estavel, subida e queda', () => {
    expect(evolutionMessage([['a', 'B']])).toContain('so tem uma varredura')
    expect(evolutionMessage([['a', 'B'], ['b', 'B']])).toBe('a nota ficou estavel.')
    expect(evolutionMessage([['a', 'D'], ['b', 'A']])).toBe('a nota subiu de D para A.')
    expect(evolutionMessage([['a', 'A'], ['b', 'C']])).toBe('a nota caiu de A para C.')
  })
})

describe('parseHash', () => {
  it.each([
    ['', 'home', null, null],
    ['#/', 'home', null, null],
    ['#/radar', 'radar', null, null],
    ['#/mapa', 'mapa', null, null],
    ['#/mapa/abc', 'mapa', 'abc', null],
    ['#/r/0123456789ab', 'result', '0123456789ab', null],
    ['#/como-funciona', 'como', null, null],
    ['#/docs', 'docs', null, null],
    ['#termos', 'home', null, 'termos'],
    ['#privacidade', 'home', null, 'privacidade'],
    ['#/qualquer-coisa', 'home', null, null],
  ])('%s', (hash, view, id, doc) => {
    expect(parseHash(hash)).toEqual({ view, id, doc })
  })
})

describe('fan', () => {
  it('um item fica no centro e varios se espalham dentro do arco', () => {
    expect(fan(1, 100, 10, 50)).toEqual([100])
    const a = fan(5, 100, 20, 60)
    expect(a[0]).toBe(70)
    expect(a[4]).toBe(130)
  })
})

describe('buildGraph', () => {
  const g = buildGraph(
    report([
      f('subdomains', 'info', { items: ['www.loja.com.br', 'dev.loja.com.br'] }),
      f('sensitive-subdomains', 'medio', { items: ['dev.loja.com.br'] }),
      f('version', 'medio', { items: ['nginx/1.18.0'] }),
      f('cve-nginx', 'medio', { items: ['CVE-1', 'CVE-2'], title: 'nginx tem CVEs' }),
      f('hsts', 'medio'),
      f('https', 'ok'),
      f('spf', 'ok'),
      f('lookalikes', 'medio', { items: ['loja-promo.com.br'] }),
    ]),
  )
  const byId = (id: string) => g.nodes.find((n) => n.id === id)

  it('liga subdominios, servidor, CVEs, grupos e dominios parecidos ao centro', () => {
    expect(byId('root')?.label).toBe('loja.com.br')
    expect(g.nodes.filter((n) => n.id.startsWith('sub'))).toHaveLength(2)
    expect(g.nodes.find((n) => n.label === 'servidor nginx/1.18.0')).toBeDefined()
    expect(g.nodes.filter((n) => n.id.startsWith('cve'))).toHaveLength(2)
    expect(byId('site')).toBeDefined()
    expect(byId('mail')).toBeDefined()
    expect(g.nodes.filter((n) => n.cls === 'phish')).toHaveLength(1)
  })

  it('marca como risco o subdominio sensivel e poe ele primeiro', () => {
    const subs = g.nodes.filter((n) => n.id.startsWith('sub'))
    expect(subs[0].label).toBe('dev.loja.com.br')
    expect(subs[0].cls).toBe('risk')
    expect(subs[1].cls).toBe('')
  })

  it('cada aresta aponta para nos que existem, e os CVEs saem do servidor certo', () => {
    for (const e of g.edges) {
      expect(byId(e.from)).toBeDefined()
      expect(byId(e.to)).toBeDefined()
    }
    expect(g.edges.filter((e) => e.from === 'srv0')).toHaveLength(2)
  })

  it('relatorio sem achados so tem o centro', () => {
    const empty = buildGraph(report([]))
    expect(empty.nodes).toHaveLength(1)
    expect(empty.edges).toHaveLength(0)
  })
})

describe('readSse', () => {
  const stream = (chunks: string[]) =>
    new Response(
      new ReadableStream({
        start(c) {
          const enc = new TextEncoder()
          chunks.forEach((x) => c.enqueue(enc.encode(x)))
          c.close()
        },
      }),
    )

  it('monta eventos mesmo com o bloco cortado entre pedacos', async () => {
    const got: [string, unknown][] = []
    await readSse(stream(['event: step\ndata: {"label":"a"}\n\nevent: fin', 'ding\ndata: {"id":"x"}\n\n']), (e, d) => got.push([e, d]))
    expect(got).toEqual([
      ['step', { label: 'a' }],
      ['finding', { id: 'x' }],
    ])
  })

  it('ignora bloco sem evento ou sem dados', async () => {
    const got: string[] = []
    await readSse(stream([': keepalive\n\nevent: so-evento\n\nevent: ok\ndata: {}\n\n']), (e) => got.push(e))
    expect(got).toEqual(['ok'])
  })
})
