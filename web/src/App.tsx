import { useEffect, useRef, useState } from 'react'
import { LegalDoc } from './components/LegalDoc'
import { cookieNoticeSeen, markCookieNoticeSeen } from './lib/storage'
import { useRoute, type View } from './lib/router'
import { useDocumentTitle } from './lib/titles'
import { useTerminal } from './terminal/useTerminal'
import { Docs } from './views/Docs'
import { Home } from './views/Home'
import { How } from './views/How'
import { MapView } from './views/MapView'
import { Radar } from './views/Radar'
import { Result } from './views/Result'

const NAV: [View, string, string][] = [
  ['home', '#/', 'terminal'],
  ['radar', '#/radar', 'radar'],
  ['mapa', '#/mapa', 'mapa'],
  ['como', '#/como-funciona', 'como funciona'],
  ['docs', '#/docs', 'docs'],
]

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

const Dots = () => (
  <>
    <span className="size-3 flex-none rounded-full bg-[#5a5a5a]" />
    <span className="size-3 flex-none rounded-full bg-[#5a5a5a]" />
    <span className="size-3 flex-none rounded-full bg-[#5a5a5a]" />
  </>
)

export const App = () => {
  const { view, id, doc, closeDoc } = useRoute()
  useDocumentTitle(view, doc)
  const term = useTerminal()
  const [cookies, setCookies] = useState(() => !cookieNoticeSeen())
  const say = useRef(term.say)
  say.current = term.say

  // easter egg: a sequencia do konami liga o modo fosforo
  useEffect(() => {
    let pos = 0
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      pos = k === KONAMI[pos] ? pos + 1 : k === KONAMI[0] ? 1 : 0
      if (pos === KONAMI.length) {
        pos = 0
        const on = document.body.classList.toggle('fosforo')
        say.current([{ kind: 'ok', text: on ? 'modo fosforo ativado. bem-vindo a 1983.' : 'modo fosforo desligado. de volta ao presente.' }])
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className="page min-h-screen bg-bg pb-12">
        <header className="sticky top-0 z-[5] flex items-center gap-2 border-b border-edge bg-panel px-4 py-2.5 print:hidden">
          <Dots />
          <span className="flex-1 text-center text-xs text-mute">skunkscan ~ zsh</span>
          <nav className="flex flex-wrap gap-0.5" aria-label="Paginas">
            {NAV.map(([v, href, label]) => (
              <a
                key={v}
                href={href}
                className={'inline-flex min-h-8 items-center px-2.5 py-1.5 text-xs no-underline ' + (view === v ? 'bg-bright text-ink' : 'text-mute hover:text-bright')}
              >
                {label}
              </a>
            ))}
          </nav>
        </header>

        {view === 'home' && <Home term={term} />}
        {view === 'result' && id && <Result id={id} />}
        {view === 'radar' && <Radar />}
        {view === 'mapa' && <MapView id={id} fallbackId={term.lastId} />}
        {view === 'como' && <How />}
        {view === 'docs' && <Docs />}

        <div className="mt-10 flex flex-wrap justify-between gap-3 px-[clamp(20px,4vw,64px)] text-xs text-mute print:hidden">
          <span>crypto skunks // hack brasil 2026 // trilha ciberseguranca</span>
          <nav className="flex flex-wrap gap-x-[18px] gap-y-1.5" aria-label="Legal">
            {[
              ['#termos', 'termos de uso'],
              ['#privacidade', 'privacidade'],
              ['#cookies', 'cookies'],
              ['robots.txt', 'robots.txt'],
              ['llms.txt', 'llms.txt'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="inline-flex min-h-8 items-center text-soft no-underline hover:text-white hover:underline">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {doc && <LegalDoc doc={doc} onClose={closeDoc} />}

      {cookies && (
        <div className="fixed right-4 bottom-4 left-4 z-10 flex max-w-[760px] flex-wrap items-center gap-x-5 gap-y-3 border border-dashed border-soft bg-panel px-[18px] py-3.5 text-[13px] print:hidden" role="region" aria-label="Aviso de cookies">
          <p className="m-0 flex-[1_1_360px] text-[#c9c9c9]">
            Usamos so o essencial para o site funcionar. Nada de rastreamento ou anuncios. <a href="#cookies">saiba mais</a>
          </p>
          <button
            type="button"
            onClick={() => {
              markCookieNoticeSeen()
              setCookies(false)
            }}
            className="min-h-10 cursor-pointer border-0 bg-bright px-4 text-[13px] font-bold text-ink"
          >
            entendi
          </button>
        </div>
      )}
    </>
  )
}
