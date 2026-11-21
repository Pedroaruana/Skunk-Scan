export type Grade = 'A' | 'B' | 'C' | 'D'
export type Severity = 'grave' | 'medio' | 'ok' | 'info'

export type Finding = {
  id: string
  severity: Severity
  title: string
  detail: string
  fix?: string
  items?: string[]
}

export type Report = {
  id: string
  domain: string
  grade: Grade
  grave: number
  medio: number
  findings: Finding[]
  createdAt: number
}

// varreduras feitas neste navegador; a nota por dia vem da API
export type HistoryEntry = { id: string | null; domain: string; grade: Grade; at: number }

export type Fix = { id: string; severity: Severity; title: string; code: string; how: string | null }

export type LineKind = 'cmd' | 'ok' | 'warn' | 'fail' | 'dim' | 'title' | 'code' | 'grade' | 'ai' | 'link' | 'chart' | 'normal'
export type LineInput = { kind: LineKind; text: string; href?: string; wait?: number }
export type Line = LineInput & { id: number }

export type ScanDone = {
  domain: string
  total: number
  grade: Grade | null
  grave: number
  medio: number
  incomplete: string[]
  id: string | null
}
