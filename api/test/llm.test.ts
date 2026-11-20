import { describe, expect, it, vi } from 'vitest'
import { buildFixes, generateFixes } from '../src/llm'
import type { Finding } from '../src/types'

const f = (id: string, severity: Finding['severity'], fix?: string): Finding => ({ id, severity, title: `titulo ${id}`, detail: 'd', fix })

const findings = [f('hsts', 'medio'), f('dmarc', 'grave'), f('cert', 'ok'), f('email', 'info'), f('cve-nginx', 'grave', 'Atualize nginx'), f('x', 'medio')]

describe('buildFixes', () => {
  it('so inclui grave e medio que tenham correcao', () => {
    expect(buildFixes('a.com.br', findings).map((x) => x.id)).toEqual(['hsts', 'dmarc', 'cve-nginx'])
  })

  it('usa modelo com o dominio e cai no fix do check quando nao ha modelo', () => {
    const [hsts, dmarc, cve] = buildFixes('a.com.br', findings)
    expect(hsts.code).toContain('Strict-Transport-Security')
    expect(dmarc.code).toContain('rua=mailto:dmarc@a.com.br')
    expect(cve.code).toBe('Atualize nginx')
  })

  it('limita a quantidade', () => {
    const many = Array.from({ length: 30 }, () => f('hsts', 'medio'))
    expect(buildFixes('a.com', many)).toHaveLength(12)
  })
})

describe('generateFixes', () => {
  it('sem IA devolve so os modelos', async () => {
    const r = await generateFixes('a.com.br', findings)
    expect(r.ai).toBe(false)
    expect(r.fixes.every((x) => x.how === null)).toBe(true)
  })

  it('aplica o texto da IA e ignora ids que nao pediu', async () => {
    const ai = { run: vi.fn().mockResolvedValue({ response: 'ok:\n[{"id":"hsts","how":"No nginx.conf."},{"id":"nada","how":"x"},{"id":"dmarc","how":3}]' }) }
    const r = await generateFixes('a.com.br', findings, ai)
    expect(r.ai).toBe(true)
    expect(r.fixes.find((x) => x.id === 'hsts')?.how).toBe('No nginx.conf.')
    expect(r.fixes.find((x) => x.id === 'dmarc')?.how).toBeNull()
  })

  it('resposta invalida da IA nao quebra', async () => {
    for (const response of ['sem json', '[quebrado', '{"a":1}']) {
      const r = await generateFixes('a.com.br', findings, { run: async () => ({ response }) })
      expect(r.ai).toBe(false)
      expect(r.fixes).toHaveLength(3)
    }
  })

  it('erro da IA cai nos modelos', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = await generateFixes('a.com.br', findings, { run: async () => { throw new Error('fora') } })
    expect(r.ai).toBe(false)
    expect(r.fixes).toHaveLength(3)
    spy.mockRestore()
  })
})
