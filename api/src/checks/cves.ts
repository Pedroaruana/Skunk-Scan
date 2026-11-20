import type { Finding } from '../types'

const UA = 'SkunkScan/0.1 (auditoria passiva; +https://github.com/Pedroaruana/Skunk-Scan)'
const MAX_PRODUCTS = 3
const PER_PAGE = 100

// produto no banner -> vendor:produto do CPE usado pelo NVD
const CPE: Record<string, string> = {
  nginx: 'f5:nginx',
  openresty: 'openresty:openresty',
  apache: 'apache:http_server',
  php: 'php:php',
  openssl: 'openssl:openssl',
  'microsoft-iis': 'microsoft:internet_information_services',
  lighttpd: 'lighttpd:lighttpd',
}

type Software = { product: string; version: string }

// "nginx/1.18.0 (Ubuntu)", "Apache/2.4.41 OpenSSL/1.1.1f", "PHP/7.4.3"
export const parseBanners = (banners: string[]): Software[] => {
  const seen = new Set<string>()
  const out: Software[] = []
  for (const banner of banners) {
    for (const m of banner.matchAll(/([A-Za-z][A-Za-z0-9-]*)\/(\d+(?:\.\d+)+[a-z]?)(?![A-Za-z0-9])/g)) {
      const product = m[1].toLowerCase()
      const key = `${product}/${m[2]}`
      if (CPE[product] && !seen.has(key)) {
        seen.add(key)
        out.push({ product, version: m[2] })
      }
    }
  }
  return out.slice(0, MAX_PRODUCTS)
}

type NvdMetric = { cvssData?: { baseScore?: number } }
type NvdCve = {
  id: string
  cisaExploitAdd?: string
  metrics?: Record<string, NvdMetric[] | undefined>
}

const score = (cve: NvdCve): number => {
  const m = cve.metrics ?? {}
  return (m.cvssMetricV40 ?? m.cvssMetricV31 ?? m.cvssMetricV30 ?? m.cvssMetricV2 ?? [])[0]?.cvssData?.baseScore ?? 0
}

const lookup = async ({ product, version }: Software): Promise<Finding> => {
  const name = `${product} ${version}`
  const cpe = `cpe:2.3:a:${CPE[product]}:${version}:*:*:*:*:*:*:*`
  const res = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=${cpe}&resultsPerPage=${PER_PAGE}`, {
    headers: { 'user-agent': UA },
    signal: AbortSignal.timeout(8000),
    // a resposta so muda quando o NVD publica algo novo, e o limite sem chave e baixo
    cf: { cacheTtl: 86400, cacheEverything: true },
  })
  if (!res.ok) throw new Error('nvd')
  const body = await res.json<{ totalResults: number; vulnerabilities?: { cve: NvdCve }[] }>()
  const cves = (body.vulnerabilities ?? []).map((v) => v.cve)

  if (body.totalResults === 0) {
    return { id: `cve-${product}`, severity: 'ok', title: `Nenhum CVE conhecido para ${name}`, detail: 'Consulta ao NVD pela versao informada no header.' }
  }

  const top = [...cves].sort((a, b) => score(b) - score(a)).slice(0, 3)
  const exploited = cves.filter((c) => c.cisaExploitAdd)
  // grave so com exploracao ativa conhecida e CVSS critico; o resto pode ser correcao aplicada sem mudar a versao
  const critical = exploited.some((c) => score(c) >= 9)
  const total = body.totalResults > cves.length ? `pelo menos ${cves.length}` : String(body.totalResults)
  const list = top.map((c) => `${c.id} (CVSS ${score(c)})`).join(', ')

  return {
    id: `cve-${product}`,
    severity: critical ? 'grave' : 'medio',
    title: `${name} tem ${total} CVEs conhecidos`,
    detail:
      `Mais graves: ${list}.` +
      (exploited.length > 0
        ? ` ${exploited.map((c) => c.id).join(', ')} ${exploited.length > 1 ? 'constam' : 'consta'} no catalogo da CISA de falhas exploradas na pratica.`
        : '') +
      ' A versao vem do header do servidor; se o provedor aplica correcoes sem mudar o numero (comum no Debian e Ubuntu), pode ser falso positivo.',
    fix: `Atualize ${product} para a versao estavel mais recente, ou confirme com o provedor que as correcoes de seguranca foram aplicadas.`,
    items: top.map((c) => c.id),
  }
}

export const checkCves = async (banners: string[]): Promise<Finding[]> =>
  Promise.all(parseBanners(banners).map(lookup))
