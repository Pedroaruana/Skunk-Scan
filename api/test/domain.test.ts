import { describe, expect, it } from 'vitest'
import { parseDomain } from '../src/domain'

describe('parseDomain', () => {
  it('normaliza protocolo, caminho, porta, caixa e ponto final', () => {
    expect(parseDomain('https://Loja.COM.br/produtos?x=1#a')).toBe('loja.com.br')
    expect(parseDomain('  site.com:8080  ')).toBe('site.com')
    expect(parseDomain('site.com.')).toBe('site.com')
  })

  it.each([
    ['sem ponto', 'localhost'],
    ['ip v4', '192.168.0.1'],
    ['tld numerico', 'site.123'],
    ['label com hifen no inicio', '-a.com'],
    ['label com hifen no fim', 'a-.com'],
    ['label vazio', 'a..com'],
    ['caractere invalido', 'sit e.com'],
    ['vazio', ''],
  ])('recusa %s', (_, input) => {
    expect(parseDomain(input)).toBeNull()
  })

  it('recusa tipos que nao sao string', () => {
    expect(parseDomain(undefined)).toBeNull()
    expect(parseDomain(42)).toBeNull()
    expect(parseDomain({})).toBeNull()
  })

  it('recusa host acima de 253 caracteres e label acima de 63', () => {
    expect(parseDomain(`${'a'.repeat(64)}.com`)).toBeNull()
    expect(parseDomain(`${'a.'.repeat(130)}com`)).toBeNull()
  })
})
