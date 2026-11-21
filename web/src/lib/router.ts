import { useEffect, useRef, useState } from 'react'

export type Doc = 'termos' | 'privacidade' | 'cookies'
export type View = 'home' | 'result' | 'radar' | 'mapa' | 'como' | 'docs'
export type Route = { view: View; id: string | null; doc: Doc | null }

const DOCS: Doc[] = ['termos', 'privacidade', 'cookies']

export const parseHash = (hash: string): { view: View; id: string | null; doc: Doc | null } => {
  const raw = hash.replace(/^#\/?/, '')
  const doc = DOCS.find((d) => d === raw) ?? null
  if (doc) return { view: 'home', id: null, doc }
  if (raw.startsWith('r/')) return { view: 'result', id: raw.slice(2), doc: null }
  if (raw === 'radar') return { view: 'radar', id: null, doc: null }
  if (raw === 'mapa' || raw.startsWith('mapa/')) return { view: 'mapa', id: raw.startsWith('mapa/') ? raw.slice(5) : null, doc: null }
  if (raw === 'como-funciona') return { view: 'como', id: null, doc: null }
  if (raw === 'docs') return { view: 'docs', id: null, doc: null }
  return { view: 'home', id: null, doc: null }
}

export const go = (hash: string): void => {
  location.hash = hash
}

// Roteador por hash (o Pages nao reescreve rotas). Os documentos legais abrem por cima da tela atual,
// entao ao abrir um guardamos a tela de baixo e fechamos de volta pra ela.
export const useRoute = (): Route & { closeDoc: () => void } => {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash))
  const under = useRef<Route>(route.doc ? { view: 'home', id: null, doc: null } : route)

  useEffect(() => {
    const onChange = () => {
      const next = parseHash(location.hash)
      if (next.doc) setRoute({ ...under.current, doc: next.doc })
      else {
        under.current = next
        setRoute(next)
        window.scrollTo(0, 0)
      }
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const closeDoc = () => {
    const u = under.current
    const hash = u.view === 'result' ? `#/r/${u.id}` : u.view === 'mapa' ? (u.id ? `#/mapa/${u.id}` : '#/mapa') : u.view === 'como' ? '#/como-funciona' : u.view === 'home' ? '#/' : `#/${u.view}`
    go(hash)
  }

  return { ...route, closeDoc }
}
