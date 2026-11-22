import { describe, expect, it } from 'vitest'
import { buildSeal, SEAL_MAX_AGE_MS } from '../src/seal'

const NOW = Date.UTC(2026, 10, 22, 12)
const DAY = 86_400_000

describe('buildSeal', () => {
  it('gera o svg com dominio, nota e data quando a ultima nota e A e recente', () => {
    const svg = buildSeal('loja.com.br', { grade: 'A', createdAt: NOW - 2 * DAY }, NOW)
    expect(svg).toContain('<svg')
    expect(svg).toContain('verificado A')
    expect(svg).toContain('loja.com.br com nota A em 20/11/2026')
    expect(svg?.endsWith('</svg>')).toBe(true)
  })

  it.each(['B', 'C', 'D'] as const)('nao da selo para nota %s', (grade) => {
    expect(buildSeal('loja.com.br', { grade, createdAt: NOW }, NOW)).toBeNull()
  })

  it('nao da selo sem varredura nem com varredura velha demais', () => {
    expect(buildSeal('loja.com.br', null, NOW)).toBeNull()
    expect(buildSeal('loja.com.br', { grade: 'A', createdAt: NOW - SEAL_MAX_AGE_MS - 1 }, NOW)).toBeNull()
    expect(buildSeal('loja.com.br', { grade: 'A', createdAt: NOW - SEAL_MAX_AGE_MS + DAY }, NOW)).not.toBeNull()
  })

  it('escapa o que entra no svg', () => {
    const svg = buildSeal('a"<b>.com', { grade: 'A', createdAt: NOW }, NOW)
    expect(svg).not.toContain('<b>')
    expect(svg).toContain('&lt;b&gt;')
    expect(svg).toContain('&quot;')
  })
})
