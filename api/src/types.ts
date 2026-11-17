export type Severity = 'grave' | 'medio' | 'ok'

export type Finding = {
  id: string
  severity: Severity
  title: string
  detail: string
  fix?: string
}
