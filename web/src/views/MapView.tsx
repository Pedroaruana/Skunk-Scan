import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { fetchReport } from '../lib/api'
import { buildGraph, type MapGraph, type MapNode } from '../lib/mapGraph'

type State = { kind: 'idle'; message: string } | { kind: 'ready'; domain: string; graph: MapGraph }

const HINT = 'Cada caixa e algo exposto na internet. As de borda branca com ! sao riscos.'

const NODE_STYLE: Record<MapNode['cls'], string> = {
  '': 'border-dash bg-bg text-body',
  root: 'border-bright bg-bright px-3.5 py-2.5 text-sm font-extrabold text-ink',
  infra: 'border-dashed border-dash bg-bg text-body',
  risk: "border-bright bg-ink font-bold text-bright before:content-['!_']",
  phish: 'border-dashed border-bright bg-bg text-bright',
}

export const MapView = ({ id, fallbackId }: { id: string | null; fallbackId: string | null }) => {
  const target = id ?? fallbackId
  const [state, setState] = useState<State>({ kind: 'idle', message: 'carregando...' })
  const [nodes, setNodes] = useState<MapNode[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const graphRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; start: [number, number]; moved: boolean } | null>(null)

  useEffect(() => {
    let alive = true
    setSelected(null)
    if (!target) {
      setState({ kind: 'idle', message: 'nenhuma varredura ainda. use /scan seusite.com.br e volte aqui.' })
      setNodes([])
      return
    }
    setState({ kind: 'idle', message: 'carregando...' })
    setNodes([])
    fetchReport(target)
      .then((report) => {
        if (!alive) return
        if (!report) return setState({ kind: 'idle', message: 'relatorio nao encontrado ou expirado (os links valem 30 dias). rode /scan de novo.' })
        const graph = buildGraph(report)
        setState({ kind: 'ready', domain: report.domain, graph })
        setNodes(graph.nodes)
      })
      .catch((e: unknown) => alive && setState({ kind: 'idle', message: e instanceof Error ? e.message : 'nao consegui carregar o mapa agora.' }))
    return () => {
      alive = false
    }
  }, [target])

  const edges = state.kind === 'ready' ? state.graph.edges : []
  const info = nodes.find((n) => n.id === selected)

  // arrastar move o no; soltar sem ter arrastado seleciona
  const onDown = (e: PointerEvent<HTMLButtonElement>, n: MapNode) => {
    drag.current = { id: n.id, start: [e.clientX, e.clientY], moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    const box = graphRef.current?.getBoundingClientRect()
    if (!d || !box) return
    if (Math.abs(e.clientX - d.start[0]) + Math.abs(e.clientY - d.start[1]) > 3) d.moved = true
    if (!d.moved) return
    const x = Math.min(96, Math.max(4, ((e.clientX - box.left) / box.width) * 100))
    const y = Math.min(96, Math.max(4, ((e.clientY - box.top) / box.height) * 100))
    setNodes((prev) => prev.map((n) => (n.id === d.id ? { ...n, x, y } : n)))
  }
  const onUp = (n: MapNode) => {
    if (drag.current && !drag.current.moved) setSelected(n.id)
    drag.current = null
  }

  const at = (nid: string) => nodes.find((n) => n.id === nid)

  return (
    <main className="px-[clamp(20px,4vw,64px)]">
      <div className="flex flex-col gap-1.5 pt-10">
        <h1 className="m-0 text-[28px] tracking-[-0.01em] text-bright">Mapa da superficie de ataque</h1>
        <p className="m-0 max-w-[760px] text-mute">
          Tudo o que um atacante enxerga do lado de fora de <b className="text-bright">{state.kind === 'ready' ? state.domain : ''}</b>. Arraste os nos e clique para ver os detalhes.
        </p>
      </div>
      <div className="flex flex-wrap gap-6 pt-7 pb-8">
        <div
          ref={graphRef}
          className="graph-bg relative h-[600px] min-w-0 flex-[999_1_620px] touch-none overflow-hidden border border-edge bg-deep"
        >
          <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {edges.map((e) => {
              const a = at(e.from)
              const b = at(e.to)
              if (!a || !b) return null
              const risky = b.cls === 'risk' || e.dash
              return (
                <line
                  key={e.from + e.to}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={risky ? '#bdbdbd' : '#4a4a4a'}
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray={risky ? '5 4' : undefined}
                />
              )
            })}
          </svg>
          {nodes.map((n) => (
            <button
              key={n.id}
              type="button"
              onPointerDown={(e) => onDown(e, n)}
              onPointerMove={onMove}
              onPointerUp={() => onUp(n)}
              className={
                'absolute min-h-8 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none border px-2.5 py-1.5 text-xs whitespace-nowrap select-none active:cursor-grabbing ' +
                NODE_STYLE[n.cls] +
                (selected === n.id ? ' outline-2 outline-offset-[3px] outline-bright' : '')
              }
              style={{ left: n.x + '%', top: n.y + '%' }}
            >
              {n.label}
            </button>
          ))}
        </div>
        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5 self-start border border-dashed border-line px-5 py-[18px]" aria-live="polite">
          <div className="mb-1 font-bold text-bright">{info ? info.label : state.kind === 'idle' ? 'Sem mapa' : 'Clique em um no'}</div>
          <div className="text-sm text-mute">{info ? info.info : state.kind === 'idle' ? state.message : HINT}</div>
          <div className="mt-2 flex flex-col gap-1.5 text-xs text-mute">
            <span>[ dominio ] centro do mapa</span>
            <span>[ subdominio ] enderecos publicados</span>
            <span>[- - infra - -] servidor e e-mail</span>
            <span>[ ! risco ] precisa de correcao</span>
          </div>
        </aside>
      </div>
    </main>
  )
}
