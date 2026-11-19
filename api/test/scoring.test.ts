import { describe, expect, it } from 'vitest'
import { countFindings, gradeOf } from '../src/scoring'
import type { Finding, Severity } from '../src/types'

const f = (severity: Severity, id = 'x'): Finding => ({ id, severity, title: '', detail: '' })
const many = (severity: Severity, n: number) => Array.from({ length: n }, () => f(severity))

describe('gradeOf', () => {
  it.each([
    ['sem achados', [], 'A'],
    ['so ok e info', [...many('ok', 5), ...many('info', 3)], 'A'],
    ['1 medio', many('medio', 1), 'A'],
    ['2 medios', many('medio', 2), 'B'],
    ['3 medios', many('medio', 3), 'B'],
    ['4 medios', many('medio', 4), 'C'],
    ['1 grave', many('grave', 1), 'C'],
    ['1 grave e medios', [...many('grave', 1), ...many('medio', 2)], 'C'],
    ['2 graves', many('grave', 2), 'D'],
  ] as const)('%s -> %s', (_, findings, grade) => {
    expect(gradeOf([...findings])).toBe(grade)
  })

  it('https grave vai direto pra D mesmo sozinho', () => {
    expect(gradeOf([f('grave', 'https')])).toBe('D')
  })

  it('grave de outro check sozinho nao e D', () => {
    expect(gradeOf([f('grave', 'cves')])).toBe('C')
  })
})

describe('countFindings', () => {
  it('conta so grave e medio', () => {
    expect(countFindings([...many('grave', 2), ...many('medio', 3), ...many('ok', 4), ...many('info', 1)])).toEqual({ grave: 2, medio: 3 })
  })
})
