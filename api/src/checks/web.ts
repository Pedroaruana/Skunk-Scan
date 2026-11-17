import { checkHost } from '../ssrf'
import type { Finding } from '../types'

const UA = 'SkunkScan/0.1 (auditoria passiva; +https://github.com/Pedroaruana/Skunk-Scan)'
const MAX_HOPS = 3
const TIMEOUT_MS = 6000
const HSTS_MIN = 15552000

type Fetched = { res: Response; url: URL }

// Segue redirects na mao pra revalidar cada destino contra ssrf. Le so os headers.
const get = async (start: string): Promise<Fetched> => {
  let url = new URL(start)
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    void res.body?.cancel()
    const loc = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && loc) {
      const next = new URL(loc, url)
      if (next.protocol !== 'http:' && next.protocol !== 'https:') throw new Error('redirect invalido')
      if (next.hostname !== url.hostname && !(await checkHost(next.hostname)).ok) throw new Error('redirect interno')
      url = next
      continue
    }
    return { res, url }
  }
  throw new Error('redirects demais')
}

const hstsMaxAge = (value: string): number => Number(/max-age=(\d+)/i.exec(value)?.[1] ?? 0)

export type WebResult = { findings: Finding[]; server: string | null }

// Retorna null quando o site nao responde nem em https nem em http
export const checkWeb = async (domain: string): Promise<WebResult | null> => {
  let final: Fetched
  try {
    final = await get(`https://${domain}/`)
  } catch {
    // so prova que o http responde, sem seguir o redirect (que pode levar justo pro https quebrado)
    const http = await fetch(`http://${domain}/`, {
      redirect: 'manual',
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch(() => null)
    void http?.body?.cancel()
    if (!http) return null
    return {
      server: http.headers.get('server'),
      findings: [
        {
          id: 'https',
          severity: 'grave',
          title: 'HTTPS quebrado ou ausente',
          detail: 'O site responde em http, mas a conexao https falha (certificado invalido, expirado ou porta 443 fechada).',
          fix: 'Instale um certificado valido (Let\'s Encrypt e gratuito) e confirme que a porta 443 esta aberta.',
        },
      ],
    }
  }

  const findings: Finding[] = []
  const h = final.res.headers
  const server = h.get('server')

  if (final.url.protocol !== 'https:') {
    findings.push({
      id: 'https',
      severity: 'grave',
      title: 'O site termina em http',
      detail: `Os redirecionamentos levam para ${final.url.origin}, sem criptografia.`,
      fix: 'Redirecione todo o trafego para https e sirva o site so por https.',
    })
    return { findings, server }
  }

  findings.push({ id: 'https', severity: 'ok', title: 'HTTPS funcionando', detail: 'Certificado aceito e conexao criptografada.' })

  const http = await fetch(`http://${domain}/`, {
    redirect: 'manual',
    headers: { 'user-agent': UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch(() => null)
  void http?.body?.cancel()
  if (http) {
    const loc = http.headers.get('location') ?? ''
    if (http.status >= 300 && http.status < 400 && loc.startsWith('https://')) {
      findings.push({ id: 'redirect', severity: 'ok', title: 'http redireciona para https', detail: `Status ${http.status}.` })
    } else {
      findings.push({
        id: 'redirect',
        severity: 'medio',
        title: 'http nao redireciona para https',
        detail: 'Quem digitar o endereco sem https continua em uma conexao sem criptografia.',
        fix: 'Configure um redirecionamento 301 de http para https no servidor ou na CDN.',
      })
    }
  }

  const hsts = h.get('strict-transport-security')
  if (!hsts || hstsMaxAge(hsts) < HSTS_MIN) {
    findings.push({
      id: 'hsts',
      severity: 'medio',
      title: hsts ? 'HSTS com validade curta' : 'HSTS ausente',
      detail: 'Sem HSTS o navegador pode aceitar uma primeira visita sem https e ficar exposto a downgrade.',
      fix: 'Strict-Transport-Security: max-age=31536000; includeSubDomains',
    })
  } else {
    findings.push({ id: 'hsts', severity: 'ok', title: 'HSTS configurado', detail: hsts })
  }

  const csp = h.get('content-security-policy')
  if (!csp) {
    findings.push({
      id: 'csp',
      severity: 'medio',
      title: 'CSP ausente',
      detail: 'Sem Content-Security-Policy, um script injetado na pagina roda sem restricao.',
      fix: "Content-Security-Policy: default-src 'self' (teste antes e libere so as origens que o site usa)",
    })
  } else {
    findings.push({ id: 'csp', severity: 'ok', title: 'CSP presente', detail: 'Politica de conteudo definida.' })
  }

  if (h.get('x-content-type-options')?.toLowerCase() !== 'nosniff') {
    findings.push({
      id: 'nosniff',
      severity: 'medio',
      title: 'X-Content-Type-Options ausente',
      detail: 'O navegador pode tentar adivinhar o tipo de um arquivo e executar conteudo inesperado.',
      fix: 'X-Content-Type-Options: nosniff',
    })
  } else {
    findings.push({ id: 'nosniff', severity: 'ok', title: 'X-Content-Type-Options correto', detail: 'nosniff' })
  }

  const framed = h.has('x-frame-options') || /frame-ancestors/i.test(csp ?? '')
  if (!framed) {
    findings.push({
      id: 'clickjacking',
      severity: 'medio',
      title: 'Sem protecao contra clickjacking',
      detail: 'Outro site pode embutir esta pagina num iframe e enganar o usuario para clicar.',
      fix: "X-Frame-Options: DENY (ou Content-Security-Policy: frame-ancestors 'none')",
    })
  } else {
    findings.push({ id: 'clickjacking', severity: 'ok', title: 'Protecao contra clickjacking', detail: 'Embutir em iframe e restrito.' })
  }

  const powered = h.get('x-powered-by')
  const exposed = [server, powered].filter((v): v is string => !!v && /\d+\.\d+/.test(v))
  if (exposed.length > 0) {
    findings.push({
      id: 'version',
      severity: 'medio',
      title: 'Versao do servidor exposta',
      detail: `Os headers revelam: ${exposed.join(', ')}. Isso ajuda quem procura falhas conhecidas dessa versao.`,
      fix: 'Remova ou oculte os headers Server e X-Powered-By (ex.: server_tokens off no nginx, ServerTokens Prod no Apache).',
    })
  }

  return { findings, server }
}
