// info: algo que nao da pra concluir ou que so vale registrar, nao conta na nota
export type Severity = 'grave' | 'medio' | 'ok' | 'info'

export type Finding = {
  id: string
  severity: Severity
  title: string
  detail: string
  fix?: string
  // nomes que o achado cita (subdominios, versoes, CVEs, dominios parecidos); o mapa usa pra desenhar os nos
  items?: string[]
}
