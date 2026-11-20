import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkCves } from '../src/checks/cves'

const cve = (id: string, baseScore: number) => ({ cve: { id, metrics: { cvssMetricV31: [{ cvssData: { baseScore } }] } } })

afterEach(() => vi.unstubAllGlobals())

describe('checkCves items', () => {
  it('lista os 3 CVEs mais graves, do maior CVSS pro menor, pra o mapa desenhar', async () => {
    const body = { totalResults: 4, vulnerabilities: [cve('CVE-1', 5), cve('CVE-2', 9.1), cve('CVE-3', 7.5), cve('CVE-4', 3)] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body))))
    const [finding] = await checkCves(['nginx/1.18.0'])
    expect(finding.id).toBe('cve-nginx')
    expect(finding.items).toEqual(['CVE-2', 'CVE-3', 'CVE-1'])
  })
})
