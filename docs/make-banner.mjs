// Gera docs/banner.svg: "SKUNK SCAN" em pixels, numa linha so, no mesmo estilo do titulo do site.
// Rode com: node docs/make-banner.mjs
import { writeFileSync } from 'node:fs'

const FONT = {
  S: ['11111', '10000', '11111', '00001', '11111'],
  K: ['10001', '10010', '11100', '10010', '10001'],
  U: ['10001', '10001', '10001', '10001', '11111'],
  N: ['10001', '11001', '10101', '10011', '10001'],
  C: ['11111', '10000', '10000', '10000', '11111'],
  A: ['11111', '10001', '11111', '10001', '10001'],
}

const CELL = 20
const GAP = 3
const LETTER_GAP = 24
const WORD_GAP = 72
const SHADOW = 5

const letterW = 5 * CELL + 4 * GAP
const letterH = letterW
const words = ['SKUNK', 'SCAN']
const textW = words.reduce((w, word, i) => w + word.length * letterW + (word.length - 1) * LETTER_GAP + (i ? WORD_GAP : 0), 0)

const W = 1280
const H = 252
const x0 = Math.round((W - textW) / 2)
const y0 = Math.round((H - letterH) / 2)

const rects = []
let x = x0
words.forEach((word, wi) => {
  if (wi) x += WORD_GAP
  for (const ch of word) {
    FONT[ch].forEach((row, r) =>
      [...row].forEach((c, k) => {
        if (c !== '1') return
        const px = x + k * (CELL + GAP)
        const py = y0 + r * (CELL + GAP)
        // sombra: quadrado escuro com contorno cinza deslocado, como no titulo do site
        rects.push(`<rect x="${px + SHADOW}" y="${py + SHADOW}" width="${CELL}" height="${CELL}" fill="#121212" stroke="#6a6a6a"/>`)
        rects.push(`<rect x="${px}" y="${py}" width="${CELL}" height="${CELL}" fill="#f2f2f2"/>`)
      }),
    )
    x += letterW + LETTER_GAP
  }
  x -= LETTER_GAP
})

// as sombras ficam todas atras das letras: primeiro todas as sombras, depois os quadrados brancos
const shadows = rects.filter((r) => r.includes('stroke'))
const faces = rects.filter((r) => !r.includes('stroke'))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="SKUNK SCAN" shape-rendering="crispEdges">
<title>SkunkScan</title>
<rect width="${W}" height="${H}" fill="#121212"/>
<g>${shadows.join('')}</g>
<g>${faces.join('')}</g>
</svg>
`
writeFileSync(new URL('./banner.svg', import.meta.url), svg)
console.log(`banner.svg ${W}x${H}, texto com ${textW}px de largura, ${(svg.length / 1024).toFixed(1)} KB`)
