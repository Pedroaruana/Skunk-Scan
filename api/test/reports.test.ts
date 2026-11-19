import { describe, expect, it } from 'vitest'
import { isId, newId } from '../src/reports'

describe('newId / isId', () => {
  it('gera 12 caracteres hexa que passam na validacao', () => {
    for (let i = 0; i < 50; i++) {
      const id = newId()
      expect(id).toMatch(/^[0-9a-f]{12}$/)
      expect(isId(id)).toBe(true)
    }
  })

  it('nao repete em uma amostra grande', () => {
    expect(new Set(Array.from({ length: 1000 }, newId)).size).toBe(1000)
  })

  it.each(['', 'abc', 'ZZZZZZZZZZZZ', '0123456789abc', "0123456789a'", '../etc/passwd'])('recusa %j', (v) => {
    expect(isId(v)).toBe(false)
  })
})
