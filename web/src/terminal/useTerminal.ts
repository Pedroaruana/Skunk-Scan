import { useEffect, useRef, useState } from 'react'
import {
  ApiError,
  API,
  askQuestion,
  createMonitor,
  fetchEvolution,
  fetchFixes,
  removeMonitor,
  streamScan,
} from '../lib/api'
import { ago, chart, cleanDomain, evolutionMessage, isInternalTarget } from '../lib/format'
import { go } from '../lib/router'
import { copyText, loadHistory, saveHistory } from '../lib/storage'
import type { Finding, HistoryEntry, Line, LineInput, Severity } from '../lib/types'
import { CMDS } from '../data/commands'

const STEPS = 5
const SEV_KIND: Record<Severity, LineInput['kind']> = { ok: 'ok', medio: 'warn', grave: 'fail', info: 'dim' }

const L = (kind: LineInput['kind'], text: string, wait?: number, href?: string): LineInput => ({ kind, text, wait, href })

export const shareUrl = (id: string): string => location.origin + location.pathname + '#/r/' + id

const helpLines = (count: number): LineInput[] => CMDS.slice(0, count).map(([n, a, d]) => L('normal', (n + ' ' + a).padEnd(36) + d))

const intro = (): LineInput[] => [
  L('dim', 'skunkscan v0.1  auditoria passiva de seguranca'),
  L('title', 'comandos'),
  ...helpLines(12),
  L('dim', '/ajuda mostra todos. tab completa, seta para cima repete, perguntas com ? vao para a ia.'),
]

// nota usada nas telas que ainda comparam dominios pelo historico deste navegador
const profile = (grade: string) => {
  const g = 'ABCD'.indexOf(grade)
  return { grade, https: 'ok', csp: g === 0 ? 'ok' : 'ausente', dmarc: g <= 1 ? 'ok' : 'ausente', versao: g >= 2 ? 'exposta' : 'oculta', subs: [0, 0, 1, 3][g], falsos: [0, 0, 1, 2][g] }
}

export type Terminal = ReturnType<typeof useTerminal>

export const useTerminal = () => {
  const [lines, setLines] = useState<Line[]>([])
  const [running, setRunningState] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scansLeft, setScansLeft] = useState(5)
  const [history, setHistoryState] = useState<HistoryEntry[]>(loadHistory)
  const [smoke, setSmoke] = useState(false)
  const [lastId, setLastId] = useState<string | null>(null)

  // estado que as funcoes assincronas precisam ler no valor atual, nao no da renderizacao em que nasceram
  const s = useRef({
    running: false,
    lastScan: null as string | null,
    lastId: null as string | null,
    cmdHist: [] as string[],
    histIdx: -1,
    nextId: 1,
    timers: new Set<number>(),
    history: [] as HistoryEntry[],
  })
  s.current.history = history

  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      s.current.timers.delete(t)
      fn()
    }, ms)
    s.current.timers.add(t)
  }

  useEffect(() => {
    const timers = s.current.timers
    return () => timers.forEach((t) => clearTimeout(t))
  }, [])

  const print = (l: LineInput): number => {
    const id = s.current.nextId++
    setLines((prev) => [...prev, { ...l, id }])
    return id
  }
  const say = (ls: LineInput[]) => ls.forEach(print)
  const setText = (id: number, text: string) => setLines((prev) => prev.map((l) => (l.id === id ? { ...l, text } : l)))

  const setRunning = (on: boolean, bar = true) => {
    s.current.running = on
    setRunningState(on)
    setShowProgress(on && bar)
  }

  const setHistory = (next: HistoryEntry[]) => {
    s.current.history = next
    setHistoryState(next)
    saveHistory(next)
  }

  // mostra uma lista de linhas aos poucos, com a barra de progresso
  const play = (ls: LineInput[], done?: () => void) => {
    let i = 0
    setRunning(true)
    setProgress(0)
    const step = () => {
      if (i >= ls.length) {
        setRunning(false)
        done?.()
        return
      }
      const l = ls[i++]
      print(l)
      setProgress(Math.round((i / ls.length) * 100))
      later(step, l.wait ?? 140)
    }
    step()
  }

  const typeText = (text: string) => {
    const id = print(L('ai', ''))
    let i = 0
    const tick = () => {
      i += 2
      setText(id, text.slice(0, i))
      if (i < text.length) later(tick, 16)
      else setRunning(false)
    }
    tick()
  }

  const failWith = (e: unknown, hint?: string) => {
    print(L('fail', e instanceof Error ? e.message : 'erro inesperado'))
    const after = e instanceof ApiError ? e.retryAfter : undefined
    if (after) print(L('dim', 'tente de novo em ' + Math.ceil(after / 60) + ' min.' + (hint ? ' ' + hint : '')))
  }

  const needScan = () => say([L('fail', 'nenhuma varredura ainda. use /scan <dominio> primeiro')])

  const printFinding = (f: Finding) => {
    print(L(SEV_KIND[f.severity] ?? 'normal', f.title))
    if (f.severity !== 'ok' && f.detail) print(L('dim', f.detail))
    if (f.fix) print(L('code', f.fix))
  }

  const ask = async (question: string) => {
    setRunning(true, false)
    print(L('dim', 'pensando...'))
    try {
      typeText(await askQuestion(question, s.current.lastId))
    } catch (e) {
      failWith(e)
      setRunning(false)
    }
  }

  const realScan = async (d: string) => {
    setRunning(true)
    setProgress(0)
    let n = 0
    const handlers = {
      step: (label: string) => {
        print(L('title', `[${++n}/${STEPS}] ${label}`))
        setProgress(Math.round(((n - 1) / STEPS) * 100))
      },
      finding: printFinding,
      warn: (m: string) => print(L('warn', m)),
      error: (m: string) => print(L('fail', m)),
      remaining: setScansLeft,
    }
    try {
      print(L('dim', 'escaneando ' + d + '...'))
      const scan = await streamScan('/api/scan', d, handlers)
      // dominios parecidos ficam em outra rota (limite de consultas por requisicao do Worker); se falhar, o scan vale mesmo assim
      await streamScan('/api/lookalikes', d, handlers).catch((e: unknown) =>
        print(L('warn', 'dominios parecidos indisponiveis: ' + (e instanceof Error ? e.message : 'erro'))),
      )
      setProgress(100)
      if (!scan) return print(L('fail', 'a varredura terminou sem resultado. tente de novo.'))
      if (!scan.grade) return print(L('fail', 'sem nota: o site nao respondeu a requisicao web, entao nao ha base para avaliar.'))
      const total = scan.grave + scan.medio
      print(L('grade', `nota final: ${scan.grade}   ${total} ${total === 1 ? 'problema' : 'problemas'}, ${scan.grave} ${scan.grave === 1 ? 'grave' : 'graves'}`))
      s.current.lastScan = d
      s.current.lastId = scan.id
      setLastId(scan.id)
      setHistory([{ id: scan.id, domain: d, grade: scan.grade, at: Date.now() }, ...s.current.history.filter((h) => h.domain !== d)])
      print(L('dim', 'proximo passo: /corrigir, /mapa, /compartilhar ou /perguntar'))
    } catch (e) {
      failWith(e, 'o limite impede que o servico vire ferramenta de ataque.')
    } finally {
      setRunning(false)
    }
  }

  const corrigir = async () => {
    const d = s.current.lastScan
    if (!d) return needScan()
    const id = s.current.lastId
    if (!id) return say([L('fail', 'esse scan nao gerou relatorio salvo. rode /scan de novo.')])
    setRunning(true, false)
    print(L('dim', 'gerando correcoes para ' + d + '...'))
    try {
      const { fixes, ai } = await fetchFixes(id)
      if (!fixes.length) return say([L('ok', 'nada para corrigir em ' + d + '.')])
      const out: LineInput[] = []
      fixes.forEach((f, i) => {
        out.push(L('title', String(i + 1).padStart(2, '0') + '  ' + f.title))
        if (f.how) out.push(L('normal', f.how))
        out.push(L('code', f.code))
      })
      if (!ai) out.push(L('dim', 'sem o texto da ia agora, so os modelos prontos.'))
      out.push(L('dim', 'teste cada mudanca antes de publicar. depois rode /scan ' + d + ' de novo para ver a nota.'))
      say(out)
    } catch (e) {
      failWith(e)
    } finally {
      setRunning(false)
    }
  }

  const evolucao = async (arg: string | undefined) => {
    const d = cleanDomain(arg) || s.current.lastScan
    if (!d) return say([L('fail', 'uso: /evolucao <dominio>   ex.: /evolucao lojadojoao.com.br')])
    setRunning(true, false)
    print(L('dim', 'buscando o historico de ' + d + '...'))
    try {
      const sr = await fetchEvolution(d)
      if (!sr.length) return say([L('fail', 'nenhuma varredura de ' + d + ' no historico. use /scan ' + d)])
      say([L('title', 'evolucao da nota  ' + d), L('chart', chart(sr)), L('dim', evolutionMessage(sr))])
    } catch {
      say([L('fail', 'nao consegui buscar o historico agora. tente de novo em instantes.')])
    } finally {
      setRunning(false)
    }
  }

  const monitorar = async (args: string[]) => {
    const usage = () =>
      say([L('fail', 'uso: /monitorar <dominio> [webhook]   ex.: /monitorar lojadojoao.com.br https://hooks.slack.com/...'), L('dim', 'para parar: /monitorar parar <token>')])
    if (args[0] === 'parar') {
      if (!args[1]) return usage()
      setRunning(true, false)
      try {
        const r = await removeMonitor(args[1])
        say([r === 'removed' ? L('ok', 'monitoramento removido.') : L('fail', 'token nao encontrado. ele ja foi removido ou expirou.')])
      } catch (e) {
        say([L('fail', e instanceof Error ? e.message : 'nao consegui remover agora.')])
      } finally {
        setRunning(false)
      }
      return
    }
    const d = cleanDomain(args[0])
    if (!d || !d.includes('.')) return usage()
    setRunning(true, false)
    print(L('dim', 'cadastrando ' + d + '...'))
    try {
      const m = await createMonitor(d, args[1])
      say([
        L('ok', `monitoramento ativo para ${m.domain} por ${m.expiresInDays} dias`),
        L('normal', 'confere uma vez por dia. o feed abaixo ganha uma linha a cada varredura, e da para assinar no leitor de rss.'),
        L('code', API + m.feed),
        L('normal', m.webhook ? 'se a nota cair, o webhook recebe um aviso.' : 'sem webhook: so o feed. para receber aviso, cadastre de novo passando a url.'),
        L('warn', 'guarde este token, ele e a unica forma de parar o monitoramento:'),
        L('code', m.token),
        L('dim', 'para parar: /monitorar parar <token>'),
      ])
    } catch (e) {
      failWith(e)
    } finally {
      setRunning(false)
    }
  }

  // easter egg: o gamba solta o spray e limpa o terminal
  const gamba = () => {
    setSmoke(true)
    setRunning(true, false)
    later(() => setLines([]), 900)
    later(() => {
      setSmoke(false)
      setRunning(false)
      say([L('normal', 'o gamba soltou o spray. terminal limpo, cheiro forte.'), L('dim', 'nenhum dado foi ferido nesta operacao.')])
    }, 2100)
  }

  const run = (raw: string): void => {
    const text = raw.trim()
    if (!text || s.current.running) return
    s.current.histIdx = -1
    s.current.cmdHist.push(text)
    print(L('cmd', text))
    const [c0, ...args] = text.split(/\s+/)
    const low = c0.toLowerCase()
    const lastScan = s.current.lastScan
    const lastId = s.current.lastId
    const hist = s.current.history

    if (low === 'sudo') {
      return say([L('fail', /rm\s+-rf/.test(text) ? 'boa tentativa. o gamba nao concede root e acabou de anotar isso no log.' : 'sudo: voce nao esta no arquivo sudoers. este incidente sera reportado ao gamba.')])
    }
    if (low === 'ls') return say([L('normal', 'radar/   mapa/   como-funciona/   docs/   termos.md   privacidade.md   cookies.md')])
    if (low === 'cd') {
      const p = (args[0] || '').replace(/\/$/, '')
      const map: Record<string, string> = { radar: '#/radar', mapa: '#/mapa', 'como-funciona': '#/como-funciona', docs: '#/docs' }
      return map[p] ? go(map[p]) : say([L('fail', 'cd: ' + (p || '~') + ': diretorio nao encontrado')])
    }
    if (low === 'man') return go('#/docs')
    if (low === 'whoami') return say([L('normal', 'visitante. nivel de acesso: curioso.')])
    if (low === 'exit') return say([L('dim', 'nao tem saida. o gamba fica.')])
    if (!c0.startsWith('/') && /\?$/.test(text)) return void ask(text)

    const c = (c0.startsWith('/') ? c0 : '/' + c0).toLowerCase()

    switch (c) {
      case '/ajuda':
        return say([L('title', 'comandos'), ...helpLines(CMDS.length), L('dim', 'dica: seta para cima repete o ultimo comando. perguntas terminadas em ? vao direto para a ia.')])
      case '/limpar':
        return setLines([])
      case '/gamba':
        return gamba()
      case '/scan': {
        const d = cleanDomain(args[0])
        if (!d || (!d.includes('.') && d !== 'localhost')) return say([L('fail', 'uso: /scan <dominio>   ex.: /scan lojadojoao.com.br')])
        if (isInternalTarget(d)) return say([L('fail', 'alvo bloqueado: localhost e ips internos nao podem ser escaneados'), L('dim', 'protecao contra abuso. o skunkscan so analisa sites publicos.')])
        return void realScan(d)
      }
      case '/corrigir':
        return void corrigir()
      case '/perguntar': {
        const q = args.join(' ')
        if (!q) return say([L('fail', 'uso: /perguntar <pergunta>   ex.: /perguntar o que e dmarc?')])
        return void ask(q)
      }
      case '/evolucao':
        return void evolucao(args[0])
      case '/mapa': {
        const d = cleanDomain(args[0])
        const id = d ? hist.find((h) => h.domain === d)?.id : lastId
        if (!id) return say([L('fail', d ? 'nenhuma varredura de ' + d + ' neste navegador. use /scan ' + d : 'nenhuma varredura ainda. use /scan <dominio> primeiro')])
        say([L('dim', 'abrindo o mapa...')])
        return later(() => go('#/mapa/' + id), 400)
      }
      case '/radar':
        return go('#/radar')
      case '/como-funciona':
        return go('#/como-funciona')
      case '/docs':
      case '/cli':
        return go('#/docs')
      case '/historico':
        if (!hist.length) return say([L('dim', 'nenhuma varredura neste navegador ainda. use /scan <dominio>')])
        return say([
          L('title', 'historico (neste navegador, clique para abrir o relatorio)'),
          ...hist.map((x) => L(x.id ? 'link' : 'normal', ago(x.at).padEnd(8) + x.domain.padEnd(30) + 'nota ' + x.grade, 0, x.id ? '#/r/' + x.id : undefined)),
        ])
      case '/comparar': {
        const a = cleanDomain(args[0])
        const b = cleanDomain(args[1])
        if (!a || !b) return say([L('fail', 'uso: /comparar <dominio1> <dominio2>')])
        const gradeOf = (d: string) => hist.find((x) => x.domain === d)?.grade ?? 'D'
        const pa = profile(gradeOf(a))
        const pb = profile(gradeOf(b))
        const row = (k: string, x: string | number, y: string | number) => L('normal', k.padEnd(24) + String(x).padEnd(28) + y, 160)
        return play([
          L('dim', 'carregando as duas varreduras...', 600),
          row('', a, b),
          row('nota', pa.grade, pb.grade),
          row('https', pa.https, pb.https),
          row('content-security-policy', pa.csp, pb.csp),
          row('dmarc', pa.dmarc, pb.dmarc),
          row('versao do servidor', pa.versao, pb.versao),
          row('subdominios expostos', pa.subs, pb.subs),
          row('sites imitando', pa.falsos, pb.falsos),
          L('dim', (pa.grade <= pb.grade ? a : b) + ' esta mais protegido', 100),
        ])
      }
      case '/monitorar':
        return void monitorar(args)
      case '/relatorio': {
        if (!lastScan) return needScan()
        if (!lastId) return say([L('fail', 'esse scan nao gerou relatorio salvo. rode /scan de novo.')])
        return play([L('dim', 'montando relatorio...', 500), L('ok', 'relatorio-' + lastScan + '.pdf pronto. abrindo para salvar...', 600)], () => {
          go('#/r/' + lastId)
          later(() => window.print(), 1500)
        })
      }
      case '/compartilhar': {
        if (!lastScan) return needScan()
        if (!lastId) return say([L('fail', 'esse scan nao gerou relatorio salvo. rode /scan de novo.')])
        void copyText(shareUrl(lastId))
        return play([
          L('dim', 'publicando resultado de ' + lastScan + '...', 600),
          L('ok', shareUrl(lastId), 200),
          L('link', 'abrir a pagina do resultado', 200, '#/r/' + lastId),
          L('dim', 'link copiado. quem abrir ve a nota, os problemas e as correcoes, sem precisar de conta. expira em 30 dias.', 100),
        ])
      }
      case '/selo': {
        const d = cleanDomain(args[0]) || lastScan
        if (!d) return say([L('fail', 'uso: /selo <dominio>')])
        const entry = hist.find((x) => x.domain === d)
        if (!entry) return say([L('fail', d + ' ainda nao foi escaneado. use /scan ' + d)])
        if (entry.grade !== 'A') return say([L('fail', 'selo indisponivel: ' + d + ' tem nota ' + entry.grade), L('dim', 'o selo so e liberado com nota A. use /corrigir para chegar la.')])
        return play([
          L('ok', d + ' tem nota A. selo liberado.', 300),
          L('normal', '┌──────────────────────────────┐', 60),
          L('normal', '│  [#]  verificado             │', 60),
          L('normal', '│       skunkscan   nota A     │', 60),
          L('normal', '└──────────────────────────────┘', 200),
          L('dim', 'cole no rodape do seu site:', 200),
          L('code', '<a href="https://skunkscan.app/v/' + d + '"><img src="https://skunkscan.app/selo/' + d + '.svg" alt="verificado pelo skunkscan, nota A"></a>', 200),
          L('dim', 'o selo e checado todo dia. se a nota cair, ele some sozinho.', 100),
        ])
      }
      case '/termos':
      case '/privacidade':
      case '/cookies':
        return go(c.slice(1))
      default:
        return say([L('fail', 'comando nao encontrado: ' + c0 + '. digite /ajuda')])
    }
  }

  // seta para cima: volta pelos comandos ja digitados
  const previousCommand = (): string | null => {
    const st = s.current
    if (!st.cmdHist.length) return null
    st.histIdx = st.histIdx === -1 ? st.cmdHist.length - 1 : Math.max(0, st.histIdx - 1)
    return st.cmdHist[st.histIdx]
  }

  // primeira renderizacao: mensagem de boas-vindas
  useEffect(() => {
    setLines((prev) => (prev.length ? prev : intro().map((l) => ({ ...l, id: s.current.nextId++ }))))
  }, [])

  return { lines, running, showProgress, progress, scansLeft, history, smoke, lastId, run, say, previousCommand }
}
