import type { HistoryEntry } from './types'

const HISTORY_KEY = 'skunkscan-history'
const COOKIE_KEY = 'skunkscan-cookies'

// localStorage pode falhar (aba privada, dados bloqueados): nada aqui pode quebrar a tela
export const loadHistory = (): HistoryEntry[] => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(v) ? (v as HistoryEntry[]) : []
  } catch {
    return []
  }
}

export const saveHistory = (history: HistoryEntry[]): void => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)))
  } catch {
    // sem armazenamento a lista so vive na sessao
  }
}

export const cookieNoticeSeen = (): boolean => {
  try {
    return localStorage.getItem(COOKIE_KEY) === '1'
  } catch {
    return false
  }
}

export const markCookieNoticeSeen = (): void => {
  try {
    localStorage.setItem(COOKIE_KEY, '1')
  } catch {
    // o aviso volta na proxima visita
  }
}

export const copyText = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // sem permissao de area de transferencia
  }
}
