import { useEffect, useState } from 'react'
import { PixelLetter } from '../components/Pixel'
import { fetchEvolution, fetchReport } from '../lib/api'
import { chart, fmtDate } from '../lib/format'
import { copyText } from '../lib/storage'
import type { Finding, Report, Severity } from '../lib/types'
import { shareUrl } from '../terminal/useTerminal'

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ok'; report: Report }

const SECTIONS: [Severity, string, string][] = [
  ['grave', 'graves', 'corrija primeiro'],
  ['medio', 'medios', 'corrija em seguida'],
  ['info', 'informativos', 'nao entram na nota'],
]

const TAG: Record<string, { text: string; cls: string }> = {
  grave: { text: '[fail]', cls: 'bg-bright text-ink' },
  medio: { text: '[ !! ]', cls: 'underline' },
  info: { text: '[ i  ]', cls: '' },
}

const CopyButton = ({ text, label, doneLabel, className }: { text: string; label: string; doneLabel: string; className: string }) => {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        void copyText(text)
        setDone(true)
        setTimeout(() => setDone(false), 1400)
      }}
    >
      {done ? doneLabel : label}
    </button>
  )
}

const Issue = ({ f }: { f: Finding }) => (
  <div className="issue mb-2.5 flex flex-col gap-2 border border-dashed border-line px-[18px] py-4">
    <div className="font-bold text-bright">{f.title}</div>
    <div className="text-sm text-soft">{f.detail}</div>
    {f.fix && (
      <div className="flex items-stretch bg-well">
        <code className="flex-1 px-3 py-2 text-[13px] break-all whitespace-pre-wrap text-bright">{f.fix}</code>
        <CopyButton text={f.fix} label="copiar" doneLabel="copiado" className="min-h-10 cursor-pointer border-0 border-l border-line bg-transparent px-3.5 text-xs text-soft hover:text-white" />
      </div>
    )}
  </div>
)

const btn = 'inline-flex min-h-11 cursor-pointer items-center px-[18px] text-[13px] font-bold no-underline'
const solid = `${btn} border-0 bg-bright text-ink`
const ghost = `${btn} border border-dashed border-dash bg-transparent font-medium text-body hover:border-bright`

export const Result = ({ id }: { id: string }) => {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [evolution, setEvolution] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setState({ kind: 'loading' })
    setEvolution(null)
    fetchReport(id)
      .then((report) => {
        if (!alive) return
        if (!report) return setState({ kind: 'error', message: 'relatorio nao encontrado ou expirado (os links valem 30 dias)' })
        setState({ kind: 'ok', report })
        fetchEvolution(report.domain)
          .then((sr) => alive && sr.length >= 2 && setEvolution(chart(sr)))
          .catch(() => {})
      })
      .catch((e: unknown) => alive && setState({ kind: 'error', message: e instanceof Error ? e.message : 'nao consegui carregar o relatorio agora' }))
    return () => {
      alive = false
    }
  }, [id])

  const r = state.kind === 'ok' ? state.report : null
  const byKind = (s: Severity) => r?.findings.filter((f) => f.severity === s) ?? []

  return (
    <main className="print-bw px-[clamp(20px,4vw,64px)]">
      <div className="flex flex-col gap-1.5 pt-10">
        <div className="text-xs text-mute">skunkscan // relatorio publico {r ? '/r/' + r.id : ''}</div>
      </div>

      <div className="flex flex-wrap items-center gap-10 border-b border-dashed border-line py-8">
        <div className="flex flex-col items-center gap-3.5 border border-bright px-[26px] py-[18px]">
          <div>{r && <PixelLetter ch={r.grade} size={22} />}</div>
          <div className="text-xs text-mute">nota de seguranca</div>
        </div>
        <div className="flex flex-[1_1_360px] flex-col gap-2.5">
          <div className="text-[26px] font-extrabold break-all text-bright">
            {state.kind === 'loading' ? 'carregando relatorio...' : state.kind === 'error' ? state.message : r?.domain}
          </div>
          {r && <div className="text-mute">varredura de {fmtDate(r.createdAt)} · analise passiva</div>}
          {r && (
            <div className="flex w-max max-w-full flex-wrap border border-dashed border-line">
              {(
                [
                  [r.grave, 'graves'],
                  [r.medio, 'medios'],
                  [byKind('ok').length, 'ok'],
                ] as [number, string][]
              ).map(([n, l]) => (
                <div key={l} className="flex flex-col border-r border-dashed border-line px-[18px] py-2.5 last:border-r-0">
                  <b className="text-[22px] text-bright">{n}</b>
                  <span className="text-mute">{l}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2.5 print:hidden">
            {r && <CopyButton text={shareUrl(r.id)} label="copiar link" doneLabel="link copiado" className={solid} />}
            <button type="button" className={ghost} onClick={() => window.print()}>
              baixar pdf
            </button>
            {r && (
              <a className={ghost} href={'#/mapa/' + r.id}>
                ver mapa de ataque
              </a>
            )}
            <a className={ghost} href="#/">
              voltar ao terminal
            </a>
          </div>
        </div>
      </div>

      {r && (
        <div className="flex flex-wrap gap-10 pt-8 pb-8">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
            {!r.grave && !r.medio && (
              <div className="issue flex flex-col gap-2 border border-dashed border-line px-[18px] py-4">
                <div className="font-bold text-bright">nenhum problema encontrado</div>
                <div className="text-sm text-soft">Este site passou em todas as checagens que a analise passiva consegue fazer.</div>
              </div>
            )}
            {SECTIONS.map(([sev, label, hint]) => {
              const list = byKind(sev)
              if (!list.length) return null
              return (
                <section key={sev}>
                  <div className="mb-2.5 flex items-center gap-3 font-bold text-bright">
                    <span className={'px-1.5 ' + TAG[sev].cls}>{TAG[sev].text}</span>
                    <span>
                      {list.length} {label}
                    </span>
                    <span className="font-normal text-mute">{'// ' + hint}</span>
                  </div>
                  {list.map((f, i) => (
                    <Issue key={f.id + i} f={f} />
                  ))}
                </section>
              )
            })}
          </div>
          <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-7">
            {evolution && (
              <div>
                <div className="mb-1 font-bold text-bright">Evolucao da nota</div>
                <div className="overflow-x-auto border border-dashed border-line px-[18px] py-4">
                  <pre className="m-0 text-[13px] leading-[1.35] text-body">{evolution}</pre>
                </div>
              </div>
            )}
            <div>
              <div className="mb-1 font-bold text-bright">O que esta certo</div>
              <div>
                {byKind('ok').map((f, i) => (
                  <div key={f.id + i} className="border-b border-dashed border-edge py-1">
                    [ ok ] {f.title}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs text-mute">Analise passiva: so foram lidas informacoes publicas do site. Revise cada correcao antes de aplicar.</div>
          </aside>
        </div>
      )}
    </main>
  )
}
