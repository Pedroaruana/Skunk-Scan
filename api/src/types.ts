// info: algo que nao da pra concluir ou que so vale registrar, nao conta na nota
export type Severity = 'grave' | 'medio' | 'ok' | 'info'

export type Finding = {
  id: string
  severity: Severity
  title: string
  detail: string
  fix?: string
}
