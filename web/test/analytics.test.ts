import { describe, expect, it } from 'vitest'
import { beaconTag } from '../src/lib/analytics'

const TOKEN = '0123456789abcdef0123456789abcdef'

describe('beaconTag', () => {
  it('monta o script com o token no formato que o Cloudflare espera', () => {
    const tag = beaconTag(TOKEN)
    expect(tag?.src).toBe('https://static.cloudflareinsights.com/beacon.min.js')
    expect(JSON.parse(tag!.config)).toEqual({ token: TOKEN })
  })

  it.each([undefined, '', 'abc', 'g'.repeat(32), TOKEN + 'a', TOKEN.toUpperCase(), '"}<script>'])('nao liga com %j', (t) => {
    expect(beaconTag(t)).toBeNull()
  })
})
