// Gera docs/fluxo-usuario.svg e docs/fluxo-dados.svg, no estilo de papel com caixas finas.
// Rode com: node docs/make-diagrams.mjs
import { writeFileSync } from 'node:fs'

const PAPER = '#121212'
const BOX = '#1a1a1a'
const LINE = '#e6e6e6'
const SOFT = '#8a8a8a'
const MONO = "ui-monospace, 'JetBrains Mono', Menlo, Consolas, monospace"

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const text = (x, y, lines, { size = 12, anchor = 'start', fill = LINE, family = MONO, weight = 400, lh = 18 } = {}) =>
  lines
    .map((l, i) => `<text x="${x}" y="${y + i * lh}" font-family="${family}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${esc(l)}</text>`)
    .join('')

const rect = (x, y, w, h, { fill = BOX, stroke = '#4a4a4a', rx = 4 } = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`

// seta com ponta
const arrow = (x1, y1, x2, y2) => {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const hx = x2 - ux * 9
  const hy = y2 - uy * 9
  return `<line x1="${x1}" y1="${y1}" x2="${hx}" y2="${hy}" stroke="${LINE}" stroke-width="1.4"/><polygon points="${x2},${y2} ${hx - uy * 4.5},${hy + ux * 4.5} ${hx + uy * 4.5},${hy - ux * 4.5}" fill="${LINE}"/>`
}
const poly = (pts) => `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${LINE}" stroke-width="1.4"/>`

const wrap = (w, h, title, subtitle, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<rect width="${w}" height="${h}" fill="${PAPER}"/>
${text(40, 62, [title], { size: 26, weight: 800 })}
${text(40, 88, [subtitle], { size: 11, fill: SOFT })}
<line x1="40" y1="102" x2="${w - 40}" y2="102" stroke="${LINE}" stroke-width="1.4"/>
${body}
</svg>
`

// ---------------- fluxo do usuario ----------------
{
  const W = 1000
  const H = 790
  const cols = [
    { name: 'ESCANEAR', accent: '#f2f2f2', steps: [['digita', '/scan dominio'], ['dominio invalido, interno', 'ou sem DNS', '→ erro na hora, sem gastar', 'varredura'], ['achados chegam ao vivo,', 'um por um', '→ nota de A a D']] },
    { name: 'CORRIGIR', accent: '#bdbdbd', steps: [['digita', '/corrigir'], ['passou de 5 pedidos', 'na hora', '→ diz quando tentar de novo'], ['correcao pronta por problema', '(header, DNS, redirect);', 'a IA so escreve onde aplicar']] },
    { name: 'VER E COMPARTILHAR', accent: '#8a8a8a', steps: [['digita /mapa,', '/compartilhar ou', '/comparar a b'], ['relatorio com mais de', '30 dias expirou', '→ mensagem clara'], ['abre o relatorio, o mapa', 'de ataque ou a tabela', 'com os dois sites']] },
    { name: 'MONITORAR', accent: '#6a6a6a', steps: [['digita', '/monitorar dominio [webhook]'], ['webhook que nao e', 'https publico', '→ recusado antes de salvar'], ['recebe um token; o feed', 'Atom cresce todo dia e o', 'webhook avisa se a nota cair']] },
  ]
  const cw = 205
  const gap = 28
  const x0 = 40
  const yTop = 140
  let body = ''
  // topo
  body += `<rect x="${W / 2 - 80}" y="${yTop}" width="160" height="40" rx="20" fill="${BOX}" stroke="${LINE}" stroke-width="1.4"/>${text(W / 2, yTop + 25, ['abre o site'], { anchor: 'middle', size: 13 })}`
  body += arrow(W / 2, yTop + 40, W / 2, yTop + 64)
  body += `${rect(W / 2 - 200, yTop + 64, 400, 52, { stroke: LINE })}${text(W / 2, yTop + 86, ['ve o terminal e os comandos'], { anchor: 'middle', size: 13 })}${text(W / 2, yTop + 104, ['(/ajuda lista todos)'], { anchor: 'middle', size: 11, fill: SOFT })}`
  // ramificacao
  const busY = yTop + 150
  body += `<line x1="${W / 2}" y1="${yTop + 116}" x2="${W / 2}" y2="${busY}" stroke="${LINE}" stroke-width="1.4"/>`
  const centers = cols.map((_, i) => x0 + i * (cw + gap) + cw / 2)
  body += `<line x1="${centers[0]}" y1="${busY}" x2="${centers[3]}" y2="${busY}" stroke="${LINE}" stroke-width="1.4"/>`
  const colTop = busY + 26
  cols.forEach((c, i) => {
    const cx = centers[i]
    const x = cx - cw / 2
    body += arrow(cx, busY, cx, colTop)
    body += `<rect x="${x}" y="${colTop}" width="${cw}" height="38" fill="${BOX}" stroke="#bdb6a2"/><rect x="${x}" y="${colTop}" width="5" height="38" fill="${c.accent}"/>${text(cx + 2, colTop + 24, [c.name], { anchor: 'middle', size: 11, weight: 700 })}`
    let y = colTop + 38 + 24
    c.steps.forEach((s, si) => {
      const h = 22 + s.length * 17
      body += arrow(cx, y - 24, cx, y)
      body += `${rect(x, y, cw, h)}${text(cx, y + 24, s, { anchor: 'middle', size: 12, lh: 17 })}`
      y += h + 24
    })
    c.endY = y - 24
  })
  // convergencia
  const mergeY = Math.max(...cols.map((c) => c.endY)) + 34
  cols.forEach((c, i) => {
    body += poly([[centers[i], c.endY], [centers[i], mergeY]])
  })
  body += `<line x1="${centers[0]}" y1="${mergeY}" x2="${centers[3]}" y2="${mergeY}" stroke="${LINE}" stroke-width="1.4"/>`
  body += arrow(W / 2, mergeY, W / 2, mergeY + 26)
  body += `${rect(W / 2 - 230, mergeY + 26, 460, 56, { stroke: LINE })}${text(W / 2, mergeY + 50, ['varredura salva no banco (D1)'], { anchor: 'middle', size: 13, weight: 700 })}${text(W / 2, mergeY + 69, ['link do relatorio vale 30 dias; nota e data ficam 180 dias'], { anchor: 'middle', size: 11, fill: SOFT })}`
  const finalH = mergeY + 82 + 40
  writeFileSync(new URL('./fluxo-usuario.svg', import.meta.url), wrap(W, finalH, 'Fluxo do usuario: SkunkScan', 'ACOES PRINCIPAIS NO TERMINAL', body))
}

// ---------------- fluxo de dados ----------------
{
  const W = 1000
  const H = 640
  let body = ''
  const bx = (x, y, w, h, accent, title, sub, lines) =>
    `${rect(x, y, w, h, { stroke: '#5a5a5a' })}<rect x="${x}" y="${y}" width="5" height="${h}" fill="${accent}"/>${text(x + 20, y + 28, [title], { size: 12, weight: 700 })}${text(x + 20, y + 46, [sub], { size: 11, fill: SOFT })}${text(x + 20, y + 78, lines, { size: 12, lh: 21 })}`

  const yRow = 130
  const h = 190
  body += bx(40, yRow, 250, h, '#6a6a6a', 'FRONTEND', 'React + Vite + TypeScript', ['terminal que le o SSE', 'estado do terminal no App', 'historico so no navegador', 'hospedado no GitHub Pages'])
  body += bx(375, yRow, 250, h, '#f2f2f2', 'API', 'Cloudflare Worker · TypeScript', ['valida e bloqueia alvo interno', 'roda os 5 checks em ordem', 'limite por IP e rota', 'cron diario dos monitores'])
  body += bx(710, yRow, 250, h, '#bdbdbd', 'ARMAZENAMENTO', 'D1 (SQLite) + Durable Object', ['relatorios, notas e datas', 'cache das respostas da IA', 'monitores e tokens', 'contagem do limite por IP'])

  // setas frontend <-> api
  body += arrow(290, yRow + 60, 375, yRow + 60)
  body += text(332, yRow + 50, ['POST'], { anchor: 'middle', size: 10, fill: SOFT })
  body += arrow(375, yRow + 130, 290, yRow + 130)
  body += text(332, yRow + 154, ['eventos SSE'], { anchor: 'middle', size: 10, fill: SOFT })
  // api <-> armazenamento
  body += arrow(625, yRow + 60, 710, yRow + 60)
  body += text(667, yRow + 50, ['grava'], { anchor: 'middle', size: 10, fill: SOFT })
  body += arrow(710, yRow + 130, 625, yRow + 130)
  body += text(667, yRow + 154, ['le'], { anchor: 'middle', size: 10, fill: SOFT })

  // fontes publicas e IA, embaixo da API
  const y2 = 400
  body += poly([[500, yRow + h], [500, y2 - 30]])
  body += `<line x1="230" y1="${y2 - 30}" x2="770" y2="${y2 - 30}" stroke="${LINE}" stroke-width="1.4"/>`
  body += arrow(230, y2 - 30, 230, y2)
  body += arrow(500, y2 - 30, 500, y2)
  body += arrow(770, y2 - 30, 770, y2)
  const sub = (x, accent, title, subtitle, lines) => `${rect(x, y2, 250, 130, { stroke: '#5a5a5a' })}<rect x="${x}" y="${y2}" width="5" height="130" fill="${accent}"/>${text(x + 20, y2 + 26, [title], { size: 12, weight: 700 })}${text(x + 20, y2 + 43, [subtitle], { size: 11, fill: SOFT })}${text(x + 20, y2 + 70, lines, { size: 11, lh: 19 })}`
  body += sub(105, '#8a8a8a', 'O PROPRIO SITE', 'so leitura, uma requisicao', ['certificado e headers', 'redirecionamento para https', 'versao do servidor'])
  body += sub(375, '#8a8a8a', 'FONTES PUBLICAS', 'so leitura', ['DNS (DoH da Cloudflare)', 'Cert Spotter e crt.sh', 'NVD, base de CVEs'])
  body += sub(645, '#6a6a6a', 'WORKERS AI', 'modelo de linguagem', ['frase de onde aplicar a', 'correcao e respostas do chat', 'o codigo colado nunca vem dela'])
  body += text(W / 2, 570, ['cada varredura usa ~45 dos 50 subrequests de um Worker gratis; por isso os dominios parecidos ficam em outra rota'], { anchor: 'middle', size: 11, fill: SOFT })
  writeFileSync(new URL('./fluxo-dados.svg', import.meta.url), wrap(W, H, 'Fluxo de dados: SkunkScan', 'FRONTEND ⇄ API ⇄ ARMAZENAMENTO E FONTES EXTERNAS', body))
}
console.log('fluxo-usuario.svg e fluxo-dados.svg gerados')
