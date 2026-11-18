import { doh } from '../dns'
import { isPrivateIp } from '../ssrf'
import type { Finding } from '../types'

const UA = 'SkunkScan/0.1 (auditoria passiva; +https://github.com/Pedroaruana/Skunk-Scan)'
const MAX_PAGES = 3
const MAX_RESOLVE = 20
const CERT_WARN_DAYS = 14

// nomes que costumam indicar ambiente interno ou painel administrativo
const SENSITIVE = new Set([
  'admin', 'painel', 'dev', 'staging', 'stage', 'homolog', 'hml', 'test', 'teste', 'qa', 'vpn', 'db', 'sql', 'mysql',
  'jenkins', 'git', 'gitlab', 'backup', 'old', 'beta', 'intranet', 'phpmyadmin', 'grafana', 'kibana', 'sandbox', 'debug',
])

type CtEntry = { names: string[]; notAfter: number }

// Cert Spotter: rapido e estavel, mas pagina de forma irregular, entao ando ate vir vazio
const fromCertSpotter = async (domain: string): Promise<CtEntry[]> => {
  const out: CtEntry[] = []
  let after = ''
  for (let page = 0; page < MAX_PAGES; page++) {
    const url =
      `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(domain)}` +
      `&include_subdomains=true&expand=dns_names&expand=not_after${after}`
    const res = await fetch(url, {
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(6000),
      cf: { cacheTtl: 14400, cacheEverything: true },
    })
    if (!res.ok) throw new Error('certspotter')
    const items = await res.json<{ id: string; dns_names?: string[]; not_after: string }[]>()
    if (items.length === 0) break
    out.push(...items.map((i) => ({ names: i.dns_names ?? [], notAfter: Date.parse(i.not_after) })))
    after = `&after=${items[items.length - 1].id}`
  }
  return out
}

// crt.sh: reserva, pode demorar muito (ja vi 23s), por isso o timeout curto
const fromCrtSh = async (domain: string): Promise<CtEntry[]> => {
  const res = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json&exclude=expired`, {
    headers: { 'user-agent': UA },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error('crt.sh')
  const items = await res.json<{ name_value: string; not_after: string }[]>()
  return items.map((i) => ({ names: i.name_value.split('\n'), notAfter: Date.parse(`${i.not_after}Z`) }))
}

const ctEntries = async (domain: string): Promise<CtEntry[]> => {
  try {
    return await fromCertSpotter(domain)
  } catch {
    return await fromCrtSh(domain)
  }
}

const isSensitive = (name: string, domain: string): boolean =>
  name
    .slice(0, -domain.length - 1)
    .split(/[.-]/)
    .some((token) => SENSITIVE.has(token.replace(/\d+$/, '')))

const certFinding = (entries: CtEntry[], domain: string, now: number): Finding | null => {
  const covers = (n: string) => n === domain || n === `*.${domain}`
  const latest = Math.max(0, ...entries.filter((e) => e.names.some(covers)).map((e) => e.notAfter))
  if (latest <= now) return null
  const days = Math.floor((latest - now) / 86_400_000)
  if (days <= CERT_WARN_DAYS) {
    return {
      id: 'cert',
      severity: 'medio',
      title: `Certificado vence em ${days} dias`,
      detail: 'O certificado mais recente do dominio esta perto de expirar. Depois disso os visitantes veem um aviso de site inseguro.',
      fix: 'Renove o certificado e ative a renovacao automatica (certbot, ou o recurso de SSL gerenciado da hospedagem).',
    }
  }
  return { id: 'cert', severity: 'ok', title: `Certificado valido por mais ${days} dias`, detail: 'Segundo os registros publicos de Certificate Transparency.' }
}

export const checkSubdomains = async (domain: string): Promise<Finding[]> => {
  const entries = await ctEntries(domain)
  const now = Date.now()
  const findings: Finding[] = []

  const cert = certFinding(entries, domain, now)
  if (cert) findings.push(cert)

  // so certificados ainda validos: subdominio de certificado vencido costuma ser lixo antigo
  const suffix = `.${domain}`
  const subs = [
    ...new Set(
      entries
        .filter((e) => e.notAfter > now)
        .flatMap((e) => e.names)
        .map((n) => n.toLowerCase())
        .filter((n) => n.endsWith(suffix) && !n.startsWith('*')),
    ),
  ]
  if (subs.length === 0) return findings

  findings.push({
    id: 'subdomains',
    severity: 'info',
    title: `${subs.length} subdominios encontrados`,
    detail: `Listados nos certificados publicos: ${subs.slice(0, 30).join(', ')}${subs.length > 30 ? ' e outros' : ''}.`,
  })

  // limite de consultas por scan (plano free do Workers): os de nome sensivel entram primeiro
  const batch = [...subs.filter((s) => isSensitive(s, domain)), ...subs.filter((s) => !isSensitive(s, domain))].slice(0, MAX_RESOLVE)
  const resolved = await Promise.all(
    batch.map(async (name) => ({ name, ips: await doh(name, 'A').catch(() => [] as string[]) })),
  )

  const exposed = resolved.filter((r) => r.ips.length > 0 && !r.ips.some(isPrivateIp) && isSensitive(r.name, domain))
  if (exposed.length > 0) {
    findings.push({
      id: 'sensitive-subdomains',
      severity: 'medio',
      title: 'Subdominios sensiveis acessiveis pela internet',
      detail: `Nomes que sugerem ambiente interno ou administrativo, ja resolvendo no DNS publico: ${exposed.map((e) => e.name).join(', ')}.`,
      fix: 'Restrinja por VPN, lista de IPs ou autenticacao, e apague do DNS os que nao estao em uso.',
    })
  }

  const internal = resolved.filter((r) => r.ips.some(isPrivateIp))
  if (internal.length > 0) {
    findings.push({
      id: 'internal-subdomains',
      severity: 'medio',
      title: 'Subdominios apontam para IP interno',
      detail: `O DNS publico revela enderecos da rede interna: ${internal.map((i) => `${i.name} (${i.ips.filter(isPrivateIp).join(', ')})`).join('; ')}.`,
      fix: 'Mova esses registros para um DNS interno (split-horizon) e deixe so os servicos publicos no DNS da internet.',
    })
  }

  if (subs.length > batch.length) {
    findings.push({
      id: 'subdomains-limit',
      severity: 'info',
      title: `Verifiquei ${batch.length} de ${subs.length} subdominios`,
      detail: 'O limite protege o servico. Os de nome mais sensivel foram verificados primeiro.',
    })
  }

  return findings
}
