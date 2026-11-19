import { describe, expect, it } from 'vitest'
import { generateCandidates, splitDomain } from '../src/checks/lookalikes'
import { parseDomain } from '../src/domain'

describe('splitDomain', () => {
  it('separa nome e sufixo, inclusive de segundo nivel', () => {
    expect(splitDomain('loja.com')).toEqual({ name: 'loja', suffix: 'com' })
    expect(splitDomain('loja.com.br')).toEqual({ name: 'loja', suffix: 'com.br' })
  })

  it('ignora subdominios', () => {
    expect(splitDomain('www.loja.com.br')).toEqual({ name: 'loja', suffix: 'com.br' })
    expect(splitDomain('api.loja.com')).toEqual({ name: 'loja', suffix: 'com' })
  })
})

describe('generateCandidates', () => {
  const out = generateCandidates('loja.com.br')

  it('respeita o limite e nao repete', () => {
    expect(out.length).toBeLessThanOrEqual(28)
    expect(new Set(out).size).toBe(out.length)
    expect(generateCandidates('loja.com.br', 5)).toHaveLength(5)
  })

  it('nao inclui o proprio dominio', () => {
    expect(out).not.toContain('loja.com.br')
  })

  it('todos os candidatos sao dominios validos', () => {
    for (const c of out) expect(parseDomain(c)).toBe(c)
  })

  it('mistura familias de variacao', () => {
    expect(out).toContain('loja.com')
    expect(out).toContain('l0ja.com.br')
    expect(out).toContain('ljoa.com.br')
  })
})
