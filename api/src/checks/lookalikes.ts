import { doh } from '../dns'
import { parseDomain } from '../domain'
import type { Finding } from '../types'

// limites pensados no teto de 50 subrequests: 1 (NS do original) + 28 (NS dos candidatos) + 8 x 2 (A e MX) = 45
const MAX_CANDIDATES = 28
const MAX_DETAILED = 8

const SECOND_LEVEL = new Set(['com.br', 'net.br', 'org.br', 'edu.br', 'gov.br', 'co.uk', 'com.pt', 'com.mx', 'com.ar'])
const SWAP_SUFFIXES = ['com', 'com.br', 'net', 'org', 'net.br', 'org.br']

const HOMOGLYPHS: Record<string, string[]> = {
  o: ['0'], l: ['1', 'i'], i: ['1', 'l'], e: ['3'], a: ['4'], s: ['5'], m: ['rn'], w: ['vv'],
}

// vizinhas no teclado qwerty, pra erro de digitacao
const NEIGHBORS: Record<string, string> = {
  q: 'wa', w: 'qes', e: 'wrd', r: 'etf', t: 'ryg', y: 'tuh', u: 'yij', i: 'uok', o: 'ipl', p: 'ol',
  a: 'qsz', s: 'awdx', d: 'sefc', f: 'drgv', g: 'fthb', h: 'gyjn', j: 'hukm', k: 'jil', l: 'kop',
  z: 'asx', x: 'zsdc', c: 'xdfv', v: 'cfgb', b: 'vghn', n: 'bhjm', m: 'njk',
}

// separa nome e sufixo ("loja.com.br" -> loja + com.br), ignorando subdominios
export const splitDomain = (domain: string): { name: string; suffix: string } => {
  const labels = domain.split('.')
  const two = labels.slice(-2).join('.')
  if (labels.length >= 3 && SECOND_LEVEL.has(two)) return { name: labels[labels.length - 3], suffix: two }
  return { name: labels[labels.length - 2], suffix: labels[labels.length - 1] }
}

const omissions = (n: string) => [...n].map((_, i) => n.slice(0, i) + n.slice(i + 1))
const transpositions = (n: string) =>
  [...n].slice(0, -1).map((c, i) => (c === n[i + 1] ? '' : n.slice(0, i) + n[i + 1] + c + n.slice(i + 2)))
const duplications = (n: string) => [...n].map((c, i) => n.slice(0, i) + c + n.slice(i))
const hyphens = (n: string) => [...n].slice(1).map((_, i) => `${n.slice(0, i + 1)}-${n.slice(i + 1)}`)
const homoglyphs = (n: string) =>
  [...n].flatMap((c, i) => (HOMOGLYPHS[c] ?? []).map((r) => n.slice(0, i) + r + n.slice(i + 1)))
const keyboard = (n: string) =>
  [...n].flatMap((c, i) => [...(NEIGHBORS[c] ?? '')].map((r) => n.slice(0, i) + r + n.slice(i + 1)))

// Intercala as familias de variacao pra o limite nao ser consumido so por uma delas
export const generateCandidates = (domain: string, max = MAX_CANDIDATES): string[] => {
  const { name, suffix } = splitDomain(domain)
  const original = `${name}.${suffix}`
  const withSuffix = (labels: string[]) => labels.map((l) => `${l}.${suffix}`)

  const buckets = [
    SWAP_SUFFIXES.filter((s) => s !== suffix).map((s) => `${name}.${s}`),
    withSuffix(homoglyphs(name)),
    withSuffix(transpositions(name)),
    withSuffix(omissions(name)),
    withSuffix(duplications(name)),
    withSuffix(hyphens(name)),
    withSuffix(keyboard(name)),
  ]

  const out = new Set<string>()
  for (let i = 0; out.size < max && buckets.some((b) => i < b.length); i++) {
    for (const b of buckets) {
      const c = b[i]
      if (c && c !== original && parseDomain(c) === c && out.size < max) out.add(c)
    }
  }
  return [...out]
}

const nsKey = (records: string[]) => records.map((r) => r.toLowerCase().replace(/\.$/, '')).sort().join(',')

type Hit = { domain: string; hasSite: boolean; hasMail: boolean }

export const checkLookalikes = async (domain: string): Promise<Finding[]> => {
  const { name, suffix } = splitDomain(domain)
  const registrable = `${name}.${suffix}`
  const candidates = generateCandidates(registrable)

  const ownNs = nsKey(await doh(registrable, 'NS').catch(() => []))
  const lookups = await Promise.all(
    candidates.map(async (c) => ({ domain: c, ns: nsKey(await doh(c, 'NS').catch(() => [])) })),
  )
  const registered = lookups.filter((l) => l.ns !== '')
  // mesmos servidores de nome que o dominio original: provavelmente registro defensivo do proprio dono
  const owned = ownNs ? registered.filter((l) => l.ns === ownNs) : []
  const others = registered.filter((l) => !owned.includes(l))

  const detailed: Hit[] = await Promise.all(
    others.slice(0, MAX_DETAILED).map(async ({ domain: d }) => {
      const [a, mx] = await Promise.all([doh(d, 'A').catch(() => []), doh(d, 'MX').catch(() => [])])
      return { domain: d, hasSite: a.length > 0, hasMail: mx.length > 0 }
    }),
  )
  const rest = others.slice(MAX_DETAILED).map((l) => l.domain)

  const note = owned.length > 0 ? ` ${owned.length} usam os mesmos servidores de nome que o seu dominio e foram tratados como registros seus.` : ''

  if (others.length === 0) {
    return [
      {
        id: 'lookalikes',
        severity: 'ok',
        title: `Nenhum dominio parecido registrado entre ${candidates.length} variacoes`,
        detail: `Testei erros de digitacao, letras trocadas por numeros e outras extensoes.${note}`,
      },
    ]
  }

  const active = detailed.filter((h) => h.hasSite || h.hasMail)
  const label = (h: Hit) => `${h.domain} (${[h.hasSite && 'site no ar', h.hasMail && 'recebe e-mail'].filter(Boolean).join(', ') || 'registrado, sem site nem e-mail'})`

  return [
    {
      id: 'lookalikes',
      severity: active.length > 0 ? 'medio' : 'info',
      title: `${others.length} dominios parecidos registrados`,
      detail:
        `${detailed.map(label).join('; ')}${rest.length ? `; tambem registrados: ${rest.join(', ')}` : ''}.` +
        ` Podem ser legitimos ou defensivos, so o dono do dominio sabe.${note}`,
      fix: active.length > 0
        ? 'Registre os principais para voce, ative DMARC com p=reject para barrar e-mail falso e avise clientes sobre golpes com o nome da empresa.'
        : 'Sem uso hoje. Vale registrar os principais e acompanhar.',
    },
  ]
}
