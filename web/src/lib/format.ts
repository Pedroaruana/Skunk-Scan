const two = (n: number) => String(n).padStart(2, '0')

export const dayLabel = (ms: number): string => {
  const d = new Date(ms)
  return two(d.getDate()) + '/' + two(d.getMonth() + 1)
}

export const fmtDate = (ms: number): string => dayLabel(ms) + '/' + new Date(ms).getFullYear()

export const ago = (at: number, now = Date.now()): string => {
  const m = Math.floor((now - at) / 60000)
  return m < 1 ? 'agora' : m < 60 ? m + 'm' : m < 1440 ? Math.floor(m / 60) + 'h' : Math.floor(m / 1440) + 'd'
}

// "https://Site.com/x" -> "site.com"
export const cleanDomain = (s: string | undefined): string =>
  (s || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')

// localhost e faixas privadas nem chegam a API
export const isInternalTarget = (d: string): boolean =>
  /^(localhost|127\.|10\.|0\.0\.0\.0|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(d)

export const hash = (s: string): number => s.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

// grafico ASCII da nota ao longo do tempo: uma linha por nota (A a D), um ponto por varredura
export const chart = (series: [string, string][]): string => {
  const rows = ['A', 'B', 'C', 'D']
  const step = 10
  const width = (series.length - 1) * step + 2
  const grid = rows.map(() => Array<string>(width).fill(' '))
  const cols = series.map((_, i) => 1 + i * step)
  const r = series.map(([, g]) => rows.indexOf(g))
  for (let i = 0; i < series.length - 1; i++) {
    const c1 = cols[i]
    const c2 = cols[i + 1]
    const r1 = r[i]
    const r2 = r[i + 1]
    for (let c = c1 + 1; c < c2 - 1; c++) grid[r1][c] = '─'
    if (r1 === r2) grid[r1][c2 - 1] = '─'
    else if (r2 < r1) {
      grid[r1][c2 - 1] = '┘'
      for (let k = r2 + 1; k < r1; k++) grid[k][c2 - 1] = '│'
      grid[r2][c2 - 1] = '┌'
    } else {
      grid[r1][c2 - 1] = '┐'
      for (let k = r1 + 1; k < r2; k++) grid[k][c2 - 1] = '│'
      grid[r2][c2 - 1] = '└'
    }
  }
  series.forEach((_, i) => {
    grid[r[i]][cols[i]] = '●'
  })
  const lines = rows.map((g, i) => ' ' + g + ' ┤' + grid[i].join(''))
  const axis = Array<string>(width).fill('─')
  cols.forEach((c) => {
    axis[c] = '┬'
  })
  lines.push('   └' + axis.join(''))
  const labels = Array<string>(width + 4).fill(' ')
  series.forEach(([d], i) => {
    const start = cols[i] + 4 - 2
    for (let k = 0; k < d.length; k++) labels[start + k] = d[k]
  })
  lines.push(labels.join(''))
  return lines.join('\n')
}

// frase de resumo da evolucao; first e last sao notas A a D (A e a melhor)
export const evolutionMessage = (series: [string, string][]): string => {
  const first = series[0][1]
  const last = series[series.length - 1][1]
  if (series.length < 2) return 'so tem uma varredura. escaneie de novo depois de corrigir para ver a evolucao.'
  if (first === last) return 'a nota ficou estavel.'
  return first > last ? `a nota subiu de ${first} para ${last}.` : `a nota caiu de ${first} para ${last}.`
}
