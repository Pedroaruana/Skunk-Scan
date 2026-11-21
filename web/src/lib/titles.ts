import { useEffect } from 'react'
import type { Doc, View } from './router'

const SITE = 'SkunkScan'

const VIEW_TITLE: Record<View, string> = {
  home: 'SkunkScan: auditoria passiva de seguranca para sites',
  result: 'Relatorio de seguranca',
  radar: 'Radar Brasil',
  mapa: 'Mapa da superficie de ataque',
  como: 'Como funciona',
  docs: 'Documentacao',
}

const DOC_TITLE: Record<Doc, string> = {
  termos: 'Termos de uso',
  privacidade: 'Politica de privacidade',
  cookies: 'Politica de cookies',
}

// o documento legal aberto por cima manda no titulo; a home leva o nome completo, as outras telas "tela | SkunkScan"
export const pageTitle = (view: View, doc: Doc | null): string => {
  if (doc) return `${DOC_TITLE[doc]} | ${SITE}`
  return view === 'home' ? VIEW_TITLE.home : `${VIEW_TITLE[view]} | ${SITE}`
}

export const useDocumentTitle = (view: View, doc: Doc | null): void => {
  useEffect(() => {
    document.title = pageTitle(view, doc)
  }, [view, doc])
}
