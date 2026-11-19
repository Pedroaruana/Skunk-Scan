import { describe, expect, it } from 'vitest'
import { parseBanners } from '../src/checks/cves'

describe('parseBanners', () => {
  it('le servidor e biblioteca de um banner so', () => {
    expect(parseBanners(['Apache/2.4.41 (Ubuntu) OpenSSL/1.1.1f'])).toEqual([
      { product: 'apache', version: '2.4.41' },
      { product: 'openssl', version: '1.1.1f' },
    ])
  })

  it('le X-Powered-By e ignora produto fora da lista', () => {
    expect(parseBanners(['nginx/1.18.0', 'PHP/7.4.3', 'Express/4.18.2'])).toEqual([
      { product: 'nginx', version: '1.18.0' },
      { product: 'php', version: '7.4.3' },
    ])
  })

  it('ignora banner sem versao', () => {
    expect(parseBanners(['nginx', 'cloudflare', 'Apache'])).toEqual([])
  })

  it('remove repetidos e limita a 3 produtos', () => {
    const out = parseBanners(['nginx/1.18.0', 'nginx/1.18.0', 'PHP/8.1.2', 'openssl/3.0.2', 'lighttpd/1.4.55'])
    expect(out).toHaveLength(3)
    expect(out.filter((s) => s.product === 'nginx')).toHaveLength(1)
  })
})
