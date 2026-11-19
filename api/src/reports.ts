import type { Grade } from './scoring'
import type { Finding } from './types'

// os termos de uso prometem que o link expira em 30 dias
export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export type Report = {
  id: string
  domain: string
  grade: Grade
  grave: number
  medio: number
  findings: Finding[]
  createdAt: number
}

type Row = { id: string; domain: string; grade: Grade; grave: number; medio: number; findings: string; created_at: number }

// 6 bytes aleatorios em hexa: o link e o unico acesso ao relatorio, entao nao pode ser adivinhavel
export const newId = (): string =>
  [...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(16).padStart(2, '0')).join('')

export const isId = (value: string): boolean => /^[0-9a-f]{12}$/.test(value)

// Salva o relatorio e apaga os vencidos de carona. Devolve null se o banco falhar:
// perder o link nao pode derrubar um scan que ja rodou.
export const saveReport = async (db: D1Database, r: Omit<Report, 'id' | 'createdAt'>): Promise<string | null> => {
  const id = newId()
  const now = Date.now()
  try {
    await db.batch([
      db
        .prepare('INSERT INTO scans (id, domain, grade, grave, medio, findings, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(id, r.domain, r.grade, r.grave, r.medio, JSON.stringify(r.findings), now),
      db.prepare('DELETE FROM scans WHERE created_at < ?').bind(now - RETENTION_MS),
    ])
    return id
  } catch (e) {
    console.error(JSON.stringify({ event: 'save_report_failed', message: e instanceof Error ? e.message : 'desconhecido' }))
    return null
  }
}

export const loadReport = async (db: D1Database, id: string): Promise<Report | null> => {
  const row = await db
    .prepare('SELECT id, domain, grade, grave, medio, findings, created_at FROM scans WHERE id = ? AND created_at >= ?')
    .bind(id, Date.now() - RETENTION_MS)
    .first<Row>()
  if (!row) return null
  return {
    id: row.id,
    domain: row.domain,
    grade: row.grade,
    grave: row.grave,
    medio: row.medio,
    findings: JSON.parse(row.findings) as Finding[],
    createdAt: row.created_at,
  }
}
