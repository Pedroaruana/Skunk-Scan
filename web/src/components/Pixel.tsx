import { useMemo } from 'react'

const FONT: Record<string, string[]> = {
  S: ['11111', '10000', '11111', '00001', '11111'],
  K: ['10001', '10010', '11100', '10010', '10001'],
  U: ['10001', '10001', '10001', '10001', '11111'],
  N: ['10001', '11001', '10101', '10011', '10001'],
  C: ['11111', '10000', '10000', '10000', '11111'],
  A: ['11111', '10001', '11111', '10001', '10001'],
  B: ['11110', '10001', '11110', '10001', '11110'],
  D: ['11110', '10001', '10001', '10001', '11110'],
}

// size e em px; cssSize aceita uma expressao CSS (var, min, calc) pra letra acompanhar a largura da tela
export const PixelLetter = ({ ch, size = 16, cssSize }: { ch: string; size?: number; cssSize?: string }) => {
  const cell = cssSize ?? `${size}px`
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(5,${cell})`, gridAutoRows: cell, gap: cssSize ? `max(2px, calc(${cell} / 8))` : Math.max(2, size / 8) }}>
      {(FONT[ch] ?? FONT.A).join('').split('').map((c, i) => (
        <div key={i} className={c === '1' ? 'letter-on' : ''} />
      ))}
    </div>
  )
}

// 16px no desktop; no celular a palavra SKUNK (a maior) cabe inteira na largura disponivel
const TITLE_CELL = 'min(16px, calc((100vw - 56px) / 34))'

export const PixelTitle = () => (
  <div className="flex flex-col pt-2 pb-2.5" style={{ gap: `calc(${TITLE_CELL} * 1.4)` }} role="img" aria-label="SKUNK SCAN">
    {['SKUNK', 'SCAN'].map((w) => (
      <div key={w} className="flex" style={{ gap: `calc(${TITLE_CELL} * 1.25)` }}>
        {w.split('').map((ch, i) => (
          <PixelLetter key={i} ch={ch} cssSize={TITLE_CELL} />
        ))}
      </div>
    ))}
  </div>
)

const Grid = ({ cols, cell, rows }: { cols: number; cell: number; rows: (string | null)[] }) => (
  <div className="grid" style={{ gridTemplateColumns: `repeat(${cols},${cell}px)`, gridAutoRows: `${cell}px` }}>
    {rows.map((bg, i) => (
      <div key={i} style={bg ? { background: bg } : undefined} />
    ))}
  </div>
)

const LOCK = '00011111000 00110001100 00100000100 00100000100 00100000100 11111111111 11111111111 11111011111 11110001111 11111011111 11111011111 11111111111'.replace(/ /g, '')
export const Lock = () => <Grid cols={11} cell={9} rows={LOCK.split('').map((c) => (c === '1' ? '#f2f2f2' : null))} />

const SKUNK = ['...WWWW...............', '..WBBBBW..............', '.WBBWWBBW.............', '.WBW..WBBW............', '.WBW...WBW............', '..W....WBW............', '.......WBW............', '......WBBW.....BB.....', '....BBBWWWWWWWBBBBB...', '...BBBBBBWWWWWBBBEBB..', '...BBBBBBBBBBBBBBBBBBW', '...BBBBBBBBBBBBBBBBB..', '....BBBBBBBBBBBBBB....', '....BB..BB....BB.BB...', '....BB..BB....BB.BB...'].join('')
const SKUNK_COLORS: Record<string, string> = { W: '#f2f2f2', B: '#4d4d4d', E: '#121212' }

export const Skunk = () => (
  <div className="animate-bob">
    <Grid cols={22} cell={7} rows={SKUNK.split('').map((c) => SKUNK_COLORS[c] ?? null)} />
  </div>
)

// lua em pixels: um disco com um recorte, dando o crescente
export const Moon = () => {
  const cells = useMemo(() => {
    const out: (string | null)[] = []
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const inBig = Math.hypot(x - 7.5, y - 7.5) <= 7.6
        const dCut = Math.hypot(x - 11.5, y - 5.5)
        out.push(inBig && dCut > 6.2 ? (dCut <= 7.4 ? '#9a9a9a' : '#f2f2f2') : null)
      }
    return out
  }, [])
  return (
    <div className="absolute top-1.5 right-6 animate-float">
      <Grid cols={16} cell={8} rows={cells} />
    </div>
  )
}

const STARS: [string, string, number, number][] = [['8%', '6%', 4, 0], ['36%', '14%', 6, 1.2], ['58%', '4%', 4, 0.6], ['22%', '62%', 6, 2], ['48%', '46%', 4, 0.3], ['4%', '88%', 4, 1.6], ['70%', '60%', 6, 0.9], ['94%', '84%', 4, 2.4], ['42%', '90%', 4, 1.8]]

type CloudSpec = { top: number; duration: number; delay: number; opacity?: number; parts: [margin: number, width: number, height: number][] }
const CLOUDS: CloudSpec[] = [
  { top: 46, duration: 55, delay: -20, parts: [[30, 54, 10], [10, 110, 10], [0, 150, 12]] },
  { top: 120, duration: 90, delay: -60, opacity: 0.6, parts: [[20, 40, 8], [0, 90, 8]] },
  { top: 176, duration: 70, delay: -45, parts: [[40, 60, 10], [14, 120, 10], [0, 170, 12]] },
]

export const Sky = () => (
  <div className="relative h-[250px] min-w-[300px] flex-[1_1_340px] overflow-hidden" aria-hidden="true">
    <Moon />
    <div className="shoot" />
    <div className="shoot b" />
    {STARS.map(([x, y, size, delay], i) => (
      <div key={i} className="absolute animate-twinkle bg-body" style={{ left: x, top: y, width: size, height: size, animationDelay: `${delay}s` }} />
    ))}
    {CLOUDS.map((c, i) => (
      <div
        key={i}
        className="absolute flex flex-col"
        style={{ top: c.top, opacity: c.opacity, animation: `drift ${c.duration}s linear ${c.delay}s infinite` }}
      >
        {c.parts.map(([m, w, h], j) => (
          <div key={j} className="cloud" style={{ marginLeft: m, width: w, height: h }} />
        ))}
      </div>
    ))}
  </div>
)

// gamba andando e pulando pela linha acima do terminal
export const Walker = () => (
  <div className="relative -mb-10 h-[105px]" aria-hidden="true">
    <div className="absolute bottom-0 left-0" style={{ animation: 'walk 14s linear infinite' }}>
      <div style={{ animation: 'hop 14s ease-in-out infinite' }}>
        <Skunk />
      </div>
    </div>
  </div>
)
