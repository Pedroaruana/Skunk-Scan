import { describe, expect, it } from 'vitest'
import { pageTitle } from '../src/lib/titles'

describe('pageTitle', () => {
  it('home leva o nome e a descricao, as outras telas terminam no nome do site', () => {
    expect(pageTitle('home', null)).toBe('SkunkScan: auditoria passiva de seguranca para sites')
    expect(pageTitle('radar', null)).toBe('Radar Brasil | SkunkScan')
    expect(pageTitle('mapa', null)).toBe('Mapa da superficie de ataque | SkunkScan')
    expect(pageTitle('result', null)).toBe('Relatorio de seguranca | SkunkScan')
  })

  it('o documento legal aberto por cima manda no titulo', () => {
    expect(pageTitle('home', 'termos')).toBe('Termos de uso | SkunkScan')
    expect(pageTitle('radar', 'privacidade')).toBe('Politica de privacidade | SkunkScan')
  })
})
