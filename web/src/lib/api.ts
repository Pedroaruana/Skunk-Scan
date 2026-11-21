import { dayLabel } from './format'
import type { Finding, Fix, Report, ScanDone } from './types'

// o deploy define VITE_API_URL; em desenvolvimento aponta para o wrangler dev
export const API: string =
  import.meta.env.VITE_API_URL ??
  (typeof location !== 'undefined' && !['localhost', '127.0.0.1', ''].includes(location.hostname) ? 'https://skunkscan-api.aruanapedro.workers.dev' : 'http://localhost:8787')

export class ApiError extends Error {
  retryAfter?: number
  constructor(message: string, retryAfter?: number) {
    super(message)
    this.retryAfter = retryAfter
  }
}

const OFFLINE = 'nao consegui falar com a api. tente de novo em instantes.'

const send = async (path: string, init?: RequestInit): Promise<Response> => {
  try {
    return await fetch(API + path, init)
  } catch {
    throw new ApiError(OFFLINE)
  }
}

const post = (path: string, body: unknown) =>
  send(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

// erros da API vem como { error, retryAfter }
const failure = async (res: Response): Promise<ApiError> => {
  const body = (await res.json().catch(() => ({}))) as { error?: string; retryAfter?: number }
  return new ApiError(body.error || 'erro ' + res.status, body.retryAfter)
}

// le o stream e chama on(evento, dados) a cada bloco "event: x / data: {...}"
export const readSse = async (res: Response, on: (event: string, data: unknown) => void): Promise<void> => {
  if (!res.body) return
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i: number
    while ((i = buf.indexOf('\n\n')) !== -1) {
      const block = buf.slice(0, i)
      buf = buf.slice(i + 2)
      const ev = /^event: (.*)$/m.exec(block)?.[1]
      const data = /^data: (.*)$/m.exec(block)?.[1]
      if (ev && data) on(ev, JSON.parse(data))
    }
  }
}

export type ScanHandlers = {
  step: (label: string) => void
  finding: (f: Finding) => void
  warn: (message: string) => void
  error: (message: string) => void
  remaining: (n: number) => void
}

// chama uma rota de varredura e entrega os eventos conforme chegam; devolve o evento done
export const streamScan = async (path: string, domain: string, h: ScanHandlers): Promise<ScanDone | null> => {
  const res = await post(path, { domain })
  const left = res.headers.get('x-ratelimit-remaining')
  if (left !== null) h.remaining(Number(left))
  if (!res.ok) throw await failure(res)
  let done: ScanDone | null = null
  await readSse(res, (ev, data) => {
    if (ev === 'step') h.step((data as { label: string }).label)
    else if (ev === 'finding') h.finding(data as Finding)
    else if (ev === 'warn') h.warn((data as { message: string }).message)
    else if (ev === 'error') h.error((data as { message: string }).message)
    else if (ev === 'done') done = data as ScanDone
  })
  return done
}

export const fetchFixes = async (id: string): Promise<{ fixes: Fix[]; ai: boolean }> => {
  const res = await post('/api/fix', { id })
  if (!res.ok) throw await failure(res)
  return res.json()
}

export const askQuestion = async (question: string, id: string | null): Promise<string> => {
  const res = await post('/api/ask', { question, id })
  if (!res.ok) throw await failure(res)
  return ((await res.json()) as { answer: string }).answer
}

export type Monitor = { domain: string; token: string; feed: string; webhook: boolean; expiresInDays: number }

export const createMonitor = async (domain: string, webhook?: string): Promise<Monitor> => {
  const res = await post('/api/monitor', { domain, webhook })
  if (!res.ok) throw await failure(res)
  return res.json()
}

export const removeMonitor = async (token: string): Promise<'removed' | 'missing'> => {
  const res = await send('/api/monitor/' + encodeURIComponent(token), { method: 'DELETE' })
  if (res.ok) return 'removed'
  if (res.status === 404) return 'missing'
  throw await failure(res)
}

// 404 vira null: relatorio inexistente ou vencido
export const fetchReport = async (id: string): Promise<Report | null> => {
  const res = await send('/api/r/' + encodeURIComponent(id))
  if (res.status === 404) return null
  if (!res.ok) throw await failure(res)
  return res.json()
}

// uma nota por dia, so as 8 mais recentes pra caber no grafico
export const fetchEvolution = async (domain: string): Promise<[string, string][]> => {
  const res = await send('/api/history/' + encodeURIComponent(domain))
  if (!res.ok) throw await failure(res)
  const { scans } = (await res.json()) as { scans: { grade: string; createdAt: number }[] }
  const byDay = new Map<string, string>()
  for (const s of scans) byDay.set(dayLabel(s.createdAt), s.grade)
  return [...byDay].slice(-8)
}
