import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { CMDS } from '../data/commands'
import type { Line, LineKind } from '../lib/types'
import type { Terminal as TerminalApi } from './useTerminal'

const PREFIX: Partial<Record<LineKind, string>> = { cmd: '> ', ok: '[ ok ] ', warn: '[ !! ] ', fail: '[fail] ', ai: 'ia' }

// cada tipo de linha tem seu proprio visual, sempre em tons de cinza
const PREFIX_STYLE: Partial<Record<LineKind, string>> = {
  cmd: 'font-bold text-bright',
  ok: 'font-bold text-bright',
  warn: 'font-bold text-bright underline',
  fail: 'bg-bright px-0.5 font-bold text-ink',
  ai: 'mr-2 bg-bright px-1 font-bold text-ink',
}
const TEXT_STYLE: Partial<Record<LineKind, string>> = {
  cmd: 'text-bright',
  dim: 'text-mute',
  fail: 'text-bright',
  title: 'mt-3 inline-block font-bold text-bright',
  code: 'my-0.5 mb-2 block bg-well px-3 py-1 text-bright',
  grade: 'mt-3 inline-block bg-bright px-3 py-0.5 font-extrabold text-ink',
  ai: 'text-bright',
  link: 'text-bright underline',
  chart: 'block leading-[1.35] text-body',
}

const LineView = ({ line }: { line: Line }) => {
  const text = TEXT_STYLE[line.kind] ?? ''
  return (
    <div className="min-h-[1.6em] break-words whitespace-pre-wrap">
      {PREFIX[line.kind] && <span className={PREFIX_STYLE[line.kind]}>{PREFIX[line.kind]}</span>}
      {line.href ? (
        <a className={text} href={line.href}>
          {line.text}
        </a>
      ) : (
        <span className={text}>{line.text}</span>
      )}
    </div>
  )
}

const Smoke = () => {
  // 46 nuvens de fumaca em posicoes sorteadas uma vez por disparo
  const puffs = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        delay: Math.random() * 0.5 + 's',
        bg: ['#9a9a9a', '#7a7a7a', '#bdbdbd'][i % 3],
      })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
      {puffs.map((p, i) => (
        <div key={i} className="absolute size-7 animate-puff" style={{ left: p.left, top: p.top, animationDelay: p.delay, background: p.bg }} />
      ))}
    </div>
  )
}

export const Terminal = ({ term }: { term: TerminalApi }) => {
  const { lines, running, showProgress, progress, scansLeft, smoke, run, previousCommand } = term
  const [value, setValue] = useState('')
  const out = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const sugs = value.startsWith('/') && !value.includes(' ') ? CMDS.filter(([n]) => n.startsWith(value.toLowerCase())) : []

  useEffect(() => {
    out.current?.scrollTo({ top: out.current.scrollHeight })
  }, [lines])

  // volta o foco para o campo quando um comando termina
  useEffect(() => {
    if (!running) input.current?.focus({ preventScroll: true })
  }, [running])

  const submit = () => {
    if (running || !value.trim()) return
    run(value)
    setValue('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    } else if (e.key === 'Tab' && sugs.length) {
      e.preventDefault()
      setValue(sugs[0][0] + ' ')
    } else if (e.key === 'ArrowUp') {
      const prev = previousCommand()
      if (prev !== null) {
        e.preventDefault()
        setValue(prev)
      }
    }
  }

  const filled = Math.round((progress / 100) * 28)
  const bar = '[' + '#'.repeat(filled) + '.'.repeat(28 - filled) + ']'

  return (
    <section className="relative flex flex-col border-y border-line" aria-label="Terminal">
      <div ref={out} className="scroll-term max-h-[52vh] overflow-y-auto px-1 py-4 text-sm" role="log" aria-live="polite">
        {lines.map((l) => (
          <LineView key={l.id} line={l} />
        ))}
      </div>
      {showProgress && (
        <div className="flex gap-4 border-t border-dashed border-line px-1 py-2 text-[13px] whitespace-pre text-bright">
          <span>{bar}</span>
          <span className="text-mute">{progress}%</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-1 py-2.5">
        <label htmlFor="cmd" className="font-bold text-bright">
          &gt;
        </label>
        {!running && value === '' && <span className="inline-block h-[1.15em] w-[0.6em] animate-blink bg-bright align-text-bottom" aria-hidden="true" />}
        <input
          id="cmd"
          ref={input}
          type="text"
          value={value}
          disabled={running}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={running ? 'executando...' : 'digite um comando, ex.: /scan seusite.com.br'}
          className="min-h-11 min-w-0 flex-[1_1_260px] border-0 bg-transparent text-[15px] text-bright placeholder:text-faint focus:outline-none"
        />
        <span className="text-xs text-mute">varreduras: {scansLeft}/5 por hora</span>
        <button type="button" onClick={submit} className="inline-flex min-h-11 items-center bg-bright px-[18px] text-[13px] font-bold text-ink">
          enter
        </button>
      </div>
      {sugs.length > 0 && !running && (
        <div className="flex flex-col border-t border-dashed border-line py-1.5">
          {sugs.map(([n, a, d]) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setValue(n + ' ')
                input.current?.focus()
              }}
              className="flex min-h-9 w-full cursor-pointer gap-[18px] px-3 text-left text-sm text-body hover:bg-well"
            >
              <b className="min-w-[150px] text-bright">{n}</b>
              <span className="text-mute">{a}</span>
              <span className="ml-auto text-mute">{d}</span>
            </button>
          ))}
          <div className="px-3 py-1 text-xs text-faint">tab para completar</div>
        </div>
      )}
      {smoke && <Smoke />}
    </section>
  )
}
