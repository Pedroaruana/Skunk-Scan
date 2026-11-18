import type { Finding } from './types'

export type Grade = 'A' | 'B' | 'C' | 'D'
export type Counts = { grave: number; medio: number }

export const countFindings = (findings: Finding[]): Counts => ({
  grave: findings.filter((f) => f.severity === 'grave').length,
  medio: findings.filter((f) => f.severity === 'medio').length,
})

// A: nenhum grave e no maximo 1 medio
// B: nenhum grave e ate 3 medios
// C: 1 grave, ou mais de 3 medios
// D: 2 ou mais graves, ou HTTPS quebrado
// ok e info nao entram na conta
export const gradeOf = (findings: Finding[]): Grade => {
  const { grave, medio } = countFindings(findings)
  if (grave >= 2 || findings.some((f) => f.id === 'https' && f.severity === 'grave')) return 'D'
  if (grave === 1 || medio > 3) return 'C'
  return medio <= 1 ? 'A' : 'B'
}
