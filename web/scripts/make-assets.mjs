// Gera public/og.png (imagem de compartilhamento) e public/favicon.svg com o mesmo pixel art do site.
// Sem dependencias: o PNG e montado a mao com zlib. Rode com: node scripts/make-assets.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const FONT = {
  S: ['11111', '10000', '11111', '00001', '11111'],
  K: ['10001', '10010', '11100', '10010', '10001'],
  U: ['10001', '10001', '10001', '10001', '11111'],
  N: ['10001', '11001', '10101', '10011', '10001'],
  C: ['11111', '10000', '10000', '10000', '11111'],
  A: ['11111', '10001', '11111', '10001', '10001'],
}
const LOCK = ['00011111000', '00110001100', '00100000100', '00100000100', '00100000100', '11111111111', '11111111111', '11111011111', '11110001111', '11111011111', '11111011111', '11111111111']

const W = 1200
const H = 630
const px = Buffer.alloc(W * H * 4)
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
const rect = (x, y, w, h, color) => {
  const [r, g, b] = hex(color)
  for (let j = Math.max(0, y); j < Math.min(H, y + h); j++)
    for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) {
      const o = (j * W + i) * 4
      px[o] = r
      px[o + 1] = g
      px[o + 2] = b
      px[o + 3] = 255
    }
}

rect(0, 0, W, H, '#121212')

// moldura tracejada, como a caixa da tela inicial
for (let x = 40; x < W - 40; x += 16) {
  rect(x, 40, 8, 2, '#6a6a6a')
  rect(x, H - 42, 8, 2, '#6a6a6a')
}
for (let y = 40; y < H - 40; y += 16) {
  rect(40, y, 2, 8, '#6a6a6a')
  rect(W - 42, y, 2, 8, '#6a6a6a')
}

// letra em pixels com a sombra deslocada, igual ao titulo do site
const CELL = 22
const GAP = 3
const letter = (ch, x, y) => {
  FONT[ch].forEach((row, r) =>
    [...row].forEach((c, k) => {
      if (c !== '1') return
      rect(x + k * (CELL + GAP) + 6, y + r * (CELL + GAP) + 6, CELL, CELL, '#6a6a6a')
    }),
  )
  FONT[ch].forEach((row, r) =>
    [...row].forEach((c, k) => {
      if (c === '1') rect(x + k * (CELL + GAP), y + r * (CELL + GAP), CELL, CELL, '#f2f2f2')
    }),
  )
}
const LETTER_W = 5 * CELL + 4 * GAP
const word = (w, x, y) => [...w].forEach((ch, i) => letter(ch, x + i * (LETTER_W + 26), y))
word('SKUNK', 96, 120)
word('SCAN', 96, 120 + LETTER_W + 44)

// cadeado a direita
const LC = 20
LOCK.forEach((row, r) =>
  [...row].forEach((c, k) => {
    if (c === '1') rect(870 + k * LC, 150 + r * LC, LC, LC, '#f2f2f2')
  }),
)

// estrelas
for (const [x, y, s] of [[820, 90, 6], [1090, 110, 8], [1040, 440, 6], [780, 400, 8], [1120, 330, 6], [900, 520, 6]]) rect(x, y, s, s, '#8a8a8a')

// PNG: assinatura, IHDR, IDAT (zlib sobre linhas com filtro 0), IEND
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8 // 8 bits por canal
ihdr[9] = 6 // RGBA
const raw = Buffer.alloc((W * 4 + 1) * H)
for (let y = 0; y < H; y++) px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4)
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])

// favicon: o mesmo cadeado em SVG, um retangulo por pixel aceso
const rects = LOCK.flatMap((row, y) => [...row].flatMap((c, x) => (c === '1' ? [`<rect x="${x}" y="${y}" width="1" height="1"/>`] : [])))
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11 12" shape-rendering="crispEdges"><rect width="11" height="12" fill="#121212"/><g fill="#f2f2f2">${rects.join('')}</g></svg>\n`

mkdirSync('public', { recursive: true })
writeFileSync('public/og.png', png)
writeFileSync('public/favicon.svg', svg)
console.log(`og.png ${(png.length / 1024).toFixed(1)} KB, favicon.svg ${svg.length} bytes`)
