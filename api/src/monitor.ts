import { checkHost, hasBlockedSuffix } from './ssrf'
import { countFindings, type Grade } from './scoring'
import { saveReport } from './reports'
import { scanOnce } from './scan'

export const MAX_MONITORS = 50
const INTERVAL_MS = 24 * 60 * 60 * 1000
// monitor sem renovacao some sozinho: ninguem fica sendo escaneado pra sempre
export const TTL_DAYS = 90
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000

type Row = { token: string; domain: string; webhook: string | null; last_grade: Grade | null }

// o token e a unica prova de que alguem pode apagar o monitor
export const newToken = (): string => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('')
export const isToken = (v: string): boolean => /^[0-9a-f]{24}$/.test(v)

// so https, sem usuario nem senha, porta padrao e host com nome (nada de ip nem .local). O DNS e conferido a parte.
export const parseWebhook = (input: unknown): URL | null => {
  if (typeof input !== 'string' || input.length > 500) return null
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  const host = url.hostname
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null
  if (!host.includes('.') || host.includes(':') || /^[\d.]+$/.test(host) || hasBlockedSuffix(host)) return null
  return url
}

// nota pior = letra mais adiante (A < B < C < D)
export const gradeDropped = (prev: Grade | null, next: Grade): boolean => prev !== null && next > prev

export type CreateResult = { ok: true; token: string } | { ok: false; reason: 'cheio' | 'duplicado' }

export const createMonitor = async (db: D1Database, domain: string, webhook: string | null): Promise<CreateResult> => {
  const count = await db.prepare('SELECT COUNT(*) AS n FROM monitors').first<{ n: number }>()
  if ((count?.n ?? 0) >= MAX_MONITORS) return { ok: false, reason: 'cheio' }
  const token = newToken()
  try {
    await db.prepare('INSERT INTO monitors (token, domain, webhook, created_at) VALUES (?, ?, ?, ?)').bind(token, domain, webhook, Date.now()).run()
    return { ok: true, token }
  } catch (e) {
    if (e instanceof Error && /UNIQUE/i.test(e.message)) return { ok: false, reason: 'duplicado' }
    throw e
  }
}

export const removeMonitor = async (db: D1Database, token: string): Promise<boolean> => {
  const res = await db.prepare('DELETE FROM monitors WHERE token = ?').bind(token).run()
  return res.meta.changes > 0
}

const log = (event: string, extra: Record<string, unknown> = {}) => console.log(JSON.stringify({ event, ...extra }))

// o destino e conferido de novo na hora do envio: o DNS pode ter mudado desde o cadastro
const notify = async (webhook: string, domain: string, previous: Grade, grade: Grade, reportId: string | null): Promise<void> => {
  const url = parseWebhook(webhook)
  if (!url || !(await checkHost(url.hostname)).ok) return log('webhook_blocked', { domain })
  const text = `SkunkScan: a nota de ${domain} caiu de ${previous} para ${grade}.`
  try {
    // text e content: formatos que Slack e Discord esperam; os outros campos servem a quem recebe em codigo
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, content: text, domain, grade, previousGrade: previous, reportId }),
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    })
    log('webhook_sent', { domain, status: res.status })
  } catch (e) {
    log('webhook_failed', { domain, message: e instanceof Error ? e.message : 'desconhecido' })
  }
}

// Cada disparo do cron cuida de UM monitor vencido: o limite de subrequests de um Worker cabe um scan so.
// O cron roda de 15 em 15 minutos, entao ate 96 monitores por dia.
export const runDueMonitor = async (db: D1Database): Promise<void> => {
  const now = Date.now()
  await db.prepare('DELETE FROM monitors WHERE created_at < ?').bind(now - TTL_MS).run()

  const m = await db
    .prepare('SELECT token, domain, webhook, last_grade FROM monitors WHERE last_checked_at IS NULL OR last_checked_at < ? ORDER BY last_checked_at ASC LIMIT 1')
    .bind(now - INTERVAL_MS)
    .first<Row>()
  if (!m) return

  // marca antes de escanear: se a varredura quebrar ela so volta amanha, sem prender a fila
  const claim = await db
    .prepare('UPDATE monitors SET last_checked_at = ? WHERE token = ? AND (last_checked_at IS NULL OR last_checked_at < ?)')
    .bind(now, m.token, now - INTERVAL_MS)
    .run()
  if (claim.meta.changes !== 1) return

  if (!(await checkHost(m.domain)).ok) return log('monitor_skipped', { domain: m.domain })
  const { findings, grade } = await scanOnce(m.domain)
  if (!grade) return log('monitor_no_grade', { domain: m.domain })

  const reportId = await saveReport(db, { domain: m.domain, grade, ...countFindings(findings), findings })
  if (m.webhook && m.last_grade && gradeDropped(m.last_grade, grade)) await notify(m.webhook, m.domain, m.last_grade, grade, reportId)
  await db.prepare('UPDATE monitors SET last_grade = ? WHERE token = ?').bind(grade, m.token).run()
  log('monitor_checked', { domain: m.domain, grade })
}
