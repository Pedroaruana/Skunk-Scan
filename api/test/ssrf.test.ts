import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkHost, hasBlockedSuffix, isPrivateIp, isPrivateIPv4, isPrivateIPv6 } from '../src/ssrf'

describe('isPrivateIPv4', () => {
  it.each(['0.0.0.0', '10.1.2.3', '127.0.0.1', '100.64.0.1', '169.254.169.254', '172.16.0.1', '172.31.255.255', '192.168.1.1', '198.18.0.1', '224.0.0.1', '255.255.255.255'])(
    'bloqueia %s',
    (ip) => expect(isPrivateIPv4(ip)).toBe(true),
  )

  it.each(['1.1.1.1', '8.8.8.8', '172.15.0.1', '172.32.0.1', '100.63.0.1', '198.17.0.1', '93.184.216.34'])('libera %s', (ip) =>
    expect(isPrivateIPv4(ip)).toBe(false),
  )

  it('trata formato quebrado como privado', () => {
    expect(isPrivateIPv4('1.2.3')).toBe(true)
    expect(isPrivateIPv4('300.1.1.1')).toBe(true)
  })
})

describe('isPrivateIPv6', () => {
  it.each(['::', '::1', 'fc00::1', 'fd12::1', 'fe80::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1'])('bloqueia %s', (ip) =>
    expect(isPrivateIPv6(ip)).toBe(true),
  )

  it.each(['2606:4700::1111', '2001:4860:4860::8888', '::ffff:8.8.8.8'])('libera %s', (ip) => expect(isPrivateIPv6(ip)).toBe(false))
})

describe('isPrivateIp', () => {
  it('escolhe a familia pelo formato', () => {
    expect(isPrivateIp('10.0.0.1')).toBe(true)
    expect(isPrivateIp('::1')).toBe(true)
    expect(isPrivateIp('8.8.8.8')).toBe(false)
  })
})

describe('hasBlockedSuffix', () => {
  it('bloqueia sufixos internos', () => {
    expect(hasBlockedSuffix('printer.local')).toBe(true)
    expect(hasBlockedSuffix('db.internal')).toBe(true)
    expect(hasBlockedSuffix('app.localhost')).toBe(true)
  })

  it('libera dominios publicos', () => {
    expect(hasBlockedSuffix('example.com')).toBe(false)
    expect(hasBlockedSuffix('localhost.com')).toBe(false)
  })
})

// responde o DoH com os registros pedidos por tipo, sem rede
const mockDns = (records: { A?: string[]; AAAA?: string[] } | 'erro') =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (records === 'erro') throw new Error('rede')
      const type = new URL(url).searchParams.get('type') as 'A' | 'AAAA'
      const code = type === 'A' ? 1 : 28
      return new Response(JSON.stringify({ Answer: (records[type] ?? []).map((data) => ({ type: code, data })) }))
    }),
  )

describe('checkHost', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('recusa sufixo interno sem consultar dns', async () => {
    mockDns({ A: ['8.8.8.8'] })
    expect(await checkHost('nas.local')).toEqual({ ok: false, reason: 'interno' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('aceita host com ip publico', async () => {
    mockDns({ A: ['93.184.216.34'] })
    expect(await checkHost('example.com')).toEqual({ ok: true, ips: ['93.184.216.34'] })
  })

  it('recusa host que resolve pra rede privada', async () => {
    mockDns({ A: ['10.0.0.5'] })
    expect(await checkHost('evil.com')).toEqual({ ok: false, reason: 'interno' })
  })

  it('recusa se so o AAAA for interno', async () => {
    mockDns({ A: ['8.8.8.8'], AAAA: ['::1'] })
    expect(await checkHost('evil.com')).toEqual({ ok: false, reason: 'interno' })
  })

  it('distingue sem registro de falha na consulta', async () => {
    mockDns({})
    expect(await checkHost('nao-existe.com')).toEqual({ ok: false, reason: 'sem-dns' })
    mockDns('erro')
    expect(await checkHost('qualquer.com')).toEqual({ ok: false, reason: 'dns-falhou' })
  })
})
