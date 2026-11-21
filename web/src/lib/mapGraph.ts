import type { Finding, Report } from './types'

export type MapNode = { id: string; label: string; cls: 'root' | 'risk' | 'infra' | 'phish' | ''; info: string; x: number; y: number }
export type MapEdge = { from: string; to: string; dash: boolean }
export type MapGraph = { nodes: MapNode[]; edges: MapEdge[] }

// posicao em % a partir do centro: angulo em graus (0 = direita, 90 = baixo) e raio de 0 a 1
const pol = (deg: number, r: number): [number, number] => {
  const a = (deg * Math.PI) / 180
  return [50 + Math.cos(a) * 34 * r, 48 + Math.sin(a) * 38 * r]
}

// n angulos distribuidos em volta de um centro, sem passar de um arco maximo
export const fan = (n: number, center: number, step: number, max: number): number[] => {
  const span = Math.min(max, step * (n - 1))
  return Array.from({ length: n }, (_, i) => (n === 1 ? center : center - span / 2 + (span * i) / (n - 1)))
}

const SITE_IDS = ['https', 'redirect', 'hsts', 'csp', 'nosniff', 'clickjacking', 'cert']
const MAIL_IDS = ['spf', 'dkim', 'dmarc', 'email']
const short = (t: string) => (t.length > 26 ? t.slice(0, 25) + '.' : t)
const isRisk = (f: Finding) => f.severity === 'grave' || f.severity === 'medio'

// monta o grafo so com o que o relatorio da varredura realmente achou
export const buildGraph = (r: Report): MapGraph => {
  const fs = r.findings
  const byId = (id: string) => fs.find((f) => f.id === id)
  const nodes: MapNode[] = []
  const edges: MapEdge[] = []
  const put = (n: Omit<MapNode, 'x' | 'y'>, from: string | null, ang: number, rad: number, dash = false) => {
    const [x, y] = pol(ang, rad)
    nodes.push({ ...n, x, y })
    if (from) edges.push({ from, to: n.id, dash })
  }

  const risks = fs.filter(isRisk).length
  const subs = byId('subdomains')?.items ?? []
  put(
    {
      id: 'root',
      label: r.domain,
      cls: 'root',
      info: `Dominio principal, nota ${r.grade}. ${risks} ${risks === 1 ? 'problema encontrado' : 'problemas encontrados'} e ${subs.length} ${subs.length === 1 ? 'subdominio publicado' : 'subdominios publicados'}. Tudo o que aparece no mapa sai de informacao publica ligada a ele.`,
    },
    null,
    0,
    0,
  )

  // subdominios dos certificados publicos; os de risco vem primeiro
  const hot = new Set([...(byId('sensitive-subdomains')?.items ?? []), ...(byId('internal-subdomains')?.items ?? [])])
  const shown = [...subs.filter((s) => hot.has(s)), ...subs.filter((s) => !hot.has(s))].slice(0, 10)
  fan(shown.length, 290, 19, 170).forEach((a, i) => {
    const s = shown[i]
    const bad = hot.has(s)
    put(
      {
        id: 'sub' + i,
        label: short(s),
        cls: bad ? 'risk' : '',
        info: s + '. ' + (bad ? 'Nome que sugere ambiente interno ou administrativo e ja resolve no DNS publico. Restrinja por VPN, IP ou senha, e apague do DNS se nao for usado.' : 'Subdominio listado nos certificados publicos do dominio.'),
      },
      'root',
      a,
      i % 2 ? 0.7 : 1,
      bad,
    )
  })

  // servidor e CVEs
  const banners = (byId('version')?.items ?? []).slice(0, 2)
  const srvAngle = fan(banners.length, 150, 22, 44)
  banners.forEach((b, i) =>
    put({ id: 'srv' + i, label: 'servidor ' + b, cls: 'infra', info: 'O header do servidor mostra a versao. Isso entrega quais falhas procurar nessa versao.' }, 'root', srvAngle[i], 0.5),
  )
  const cves: { c: string; f: Finding; hub: string }[] = []
  for (const f of fs.filter((x) => x.id.startsWith('cve-') && isRisk(x))) {
    const product = f.id.slice(4)
    const hub = banners.findIndex((b) => b.toLowerCase().includes(product))
    for (const c of f.items ?? []) cves.push({ c, f, hub: hub >= 0 ? 'srv' + hub : 'root' })
  }
  fan(cves.length, 150, 12, 56).forEach((a, i) => {
    const { c, f, hub } = cves[i]
    put({ id: 'cve' + i, label: c, cls: 'risk', info: f.title + '. ' + f.detail }, hub, a, 0.95, true)
  })

  // grupos com um no central e um filho por problema: headers do site e e-mail
  const group = (id: string, label: string, ids: string[], angle: number, info: string) => {
    const all = fs.filter((f) => ids.includes(f.id))
    if (!all.length) return
    put({ id, label, cls: 'infra', info }, 'root', angle, 0.5)
    const bad = all.filter(isRisk)
    fan(bad.length, angle, 13, 48).forEach((a, i) => {
      const f = bad[i]
      put({ id: id + i, label: short(f.title), cls: 'risk', info: f.detail + (f.fix ? ' Correcao: ' + f.fix : '') }, id, a, 0.95, true)
    })
  }
  group('site', 'site e headers', SITE_IDS, 195, 'Certificado, redirecionamento para HTTPS e headers de seguranca que o servidor envia.')
  group('mail', 'e-mail do dominio', MAIL_IDS, 112, 'Registros SPF, DKIM e DMARC no DNS. Eles impedem que alguem mande e-mail se passando pela empresa.')

  // dominios parecidos
  const look = (byId('lookalikes')?.items ?? []).slice(0, 6)
  fan(look.length, 50, 14, 70).forEach((a, i) =>
    put(
      { id: 'look' + i, label: short(look[i]), cls: 'phish', info: look[i] + '. Dominio parecido com o seu, ja registrado por outra pessoa. Pode ser legitimo ou defensivo; so o dono sabe. Os detalhes estao no relatorio.' },
      'root',
      a,
      0.95,
      true,
    ),
  )

  return { nodes, edges }
}
