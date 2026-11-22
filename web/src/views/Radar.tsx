import { useState } from 'react'
import { hash } from '../lib/format'

// [sigla, coluna, linha] num mapa em quadradinhos que lembra o formato do pais
const UF: [string, number, number][] = [
  ['RR', 2, 0], ['AP', 4, 0],
  ['AM', 1, 1], ['PA', 3, 1], ['MA', 5, 1], ['CE', 6, 1], ['RN', 7, 1],
  ['AC', 0, 2], ['RO', 1, 2], ['MT', 2, 2], ['TO', 4, 2], ['PI', 5, 2], ['PE', 6, 2], ['PB', 7, 2],
  ['MS', 2, 3], ['GO', 3, 3], ['DF', 4, 3], ['BA', 5, 3], ['SE', 6, 3], ['AL', 7, 3],
  ['SP', 3, 4], ['MG', 4, 4], ['ES', 5, 4],
  ['PR', 3, 5], ['RJ', 4, 5],
  ['SC', 3, 6],
  ['RS', 2, 7],
]

type Metric = 'dmarc' | 'versao' | 'csp' | 'subs' | 'phish'
const METRICS: [Metric, string, string][] = [
  ['dmarc', 'sem dmarc', 'dos sites nao tem dmarc'],
  ['versao', 'versao exposta', 'mostram a versao do servidor'],
  ['csp', 'sem csp', 'nao usam content-security-policy'],
  ['subs', 'subdominio exposto', 'tem subdominio de teste exposto'],
  ['phish', 'dominio imitando', 'tem dominio parecido registrado'],
]
const BASE: Record<Metric, number> = { dmarc: 48, versao: 34, csp: 56, subs: 14, phish: 6 }
const SPAN: Record<Metric, number> = { dmarc: 32, versao: 30, csp: 28, subs: 20, phish: 12 }

// dados de exemplo gerados a partir da sigla, so pra a tela ter o que mostrar
const val = (uf: string, m: Metric) => (uf === 'BA' && m === 'dmarc' ? 62 : BASE[m] + (hash(uf + m) % SPAN[m]))
const sitesOf = (uf: string) => 40 + (hash(uf + 'n') % 420) + (uf === 'SP' ? 1800 : uf === 'RJ' || uf === 'MG' ? 700 : 0)

export const shade = (v: number, lo: number, hi: number): [number, number] => {
  const t = (v - lo) / Math.max(1, hi - lo)
  return [Math.round(38 + t * (224 - 38)), t]
}

export const Radar = () => {
  const [metric, setMetric] = useState<Metric>('dmarc')
  const [uf, setUf] = useState<string | null>(null)

  const m = METRICS.find((x) => x[0] === metric)!
  const vals = UF.map(([u]) => val(u, metric))
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const total = UF.reduce((a, [u]) => a + sitesOf(u), 0)
  const nat = Math.round(UF.reduce((a, [u]) => a + val(u, metric) * sitesOf(u), 0) / total)
  const top = UF.map(([u]) => [u, val(u, metric)] as const).sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <main className="px-[clamp(20px,4vw,64px)]">
      <div className="flex flex-col gap-1.5 pt-10">
        <h1 className="m-0 text-[28px] tracking-[-0.01em] text-bright">
          Radar Brasil <span className="ml-2 inline-block border border-dashed border-dash px-2 align-middle text-[11px] text-soft">dados de exemplo</span>
        </h1>
        <p className="m-0 max-w-[760px] text-mute">
          Como esta a seguranca dos sites de pequenas empresas em cada estado. Os numeros saem das varreduras feitas no SkunkScan, sem identificar nenhum site.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist">
        {METRICS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === metric}
            onClick={() => setMetric(k)}
            className={
              'min-h-10 cursor-pointer border px-3.5 text-[13px] ' +
              (k === metric ? 'border-bright bg-bright font-bold text-ink' : 'border-dashed border-dash bg-transparent text-soft')
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-10 pt-7 pb-8">
        <div>
          <div className="grid w-full max-w-[540px] gap-1" style={{ gridTemplateColumns: 'repeat(8,minmax(0,1fr))' }}>
            {UF.map(([u, c, r]) => {
              const v = val(u, metric)
              const [g, t] = shade(v, lo, hi)
              return (
                <button
                  key={u}
                  type="button"
                  aria-label={`${u}, ${v}%`}
                  onClick={() => setUf(uf === u ? null : u)}
                  className={'flex aspect-square cursor-pointer flex-col items-center justify-center border-0 p-0 text-xs leading-tight font-bold sm:text-[13px] ' + (uf === u ? 'outline-2 outline-offset-[3px] outline-bright' : '')}
                  style={{ gridColumn: c + 1, gridRow: r + 1, background: `rgb(${g},${g},${g})`, color: t > 0.55 ? '#0b0b0b' : '#f2f2f2' }}
                >
                  {u}
                  <small className="text-[11px] font-normal">{v}%</small>
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex items-center gap-2.5 text-xs text-mute">
            <span>menos</span>
            <span className="legend-bar h-2.5 w-40" />
            <span>mais</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-6">
          <div>
            <div className="text-xs text-mute">{uf ? 'estado selecionado: ' + uf : 'media nacional'}</div>
            <div className="text-[56px] leading-none font-extrabold text-bright">{(uf ? val(uf, metric) : nat) + '%'}</div>
            <div className="text-bright">{uf ? `${m[2]} em ${uf} (media nacional: ${nat}%)` : m[2]}</div>
            <div className="text-[13px] text-mute">{uf ? `${sitesOf(uf).toLocaleString('pt-BR')} sites analisados` : `${total.toLocaleString('pt-BR')} sites analisados em 27 estados`}</div>
          </div>
          <div>
            <div className="mb-1 font-bold text-bright">Estados mais expostos</div>
            <div className="overflow-x-auto text-[13px] whitespace-pre">
              {top.map(([u, v]) => u + '  ' + '█'.repeat(Math.round(v / 5)) + '░'.repeat(20 - Math.round(v / 5)) + '  ' + v + '%').join('\n')}
            </div>
          </div>
          <div className="text-xs text-mute">Clique em um estado para ver os detalhes. Os dados sao agregados e anonimos.</div>
        </div>
      </div>
    </main>
  )
}
