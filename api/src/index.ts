import { parseDomain } from './domain'
import { sseResponse, type Send } from './sse'
import { checkHost } from './ssrf'
import { checkWeb } from './checks/web'
import { checkDns } from './checks/dns'
import { checkSubdomains } from './checks/subdomains'
import { checkCves } from './checks/cves'
import { checkLookalikes } from './checks/lookalikes'
import { countFindings, gradeOf } from './scoring'
import { checkLimit, LIMIT, RateLimiter, type LimitResult } from './ratelimit'
import { isId, loadHistory, loadReport, saveReport } from './reports'
import type { Finding } from './types'

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-expose-headers': 'retry-after, x-ratelimit-limit, x-ratelimit-remaining',
}

export { RateLimiter }

type Env = { RATE_LIMITER: DurableObjectNamespace<RateLimiter>; DB: D1Database }

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors, ...extra } })

type Run = (id: string, label: string, check: () => Promise<Finding[] | null>) => Promise<void>

// cada rota recebe o dominio ja validado e um run que isola cada check: se um cair, os outros seguem
const routes: Record<string, (domain: string, run: Run) => Promise<void>> = {
  '/api/scan': async (domain, run) => {
    let banners: string[] = []
    await run('web', 'TLS e headers', async () => {
      const web = await checkWeb(domain)
      banners = web?.banners ?? []
      return web?.findings ?? null
    })
    await run('dns', 'e-mail (SPF, DKIM, DMARC)', () => checkDns(domain))
    await run('subdomains', 'subdominios e certificado', () => checkSubdomains(domain))
    await run('cves', 'CVEs conhecidos', () => checkCves(banners))
  },
  // fica fora do scan porque cada variacao e uma consulta DNS e o scan ja usa cerca de 43 dos 50 subrequests
  '/api/lookalikes': async (domain, run) => {
    await run('lookalikes', 'dominios parecidos', () => checkLookalikes(domain))
  },
}

const stream = (domain: string, route: (domain: string, run: Run) => Promise<void>, graded: boolean, headers: Record<string, string>, db: D1Database) =>
  sseResponse(async (send: Send) => {
    const findings: Finding[] = []
    const failed: string[] = []
    await send('start', { domain })

    const run: Run = async (id, label, check) => {
      await send('step', { id, label })
      try {
        const result = await check()
        if (!result) {
          failed.push(id)
          return await send('warn', { id, message: 'o site nao respondeu a requisicao web' })
        }
        for (const f of result) {
          findings.push(f)
          await send('finding', f)
        }
      } catch {
        failed.push(id)
        await send('warn', { id, message: `falha ao checar ${label}` })
      }
    }

    await route(domain, run)

    if (!graded) return await send('done', { domain, total: findings.length })
    // sem resposta do site nao existe base pra nota: melhor nao dar nota do que dar uma enganosa
    const grade = failed.includes('web') ? null : gradeOf(findings)
    const counts = countFindings(findings)
    // so guarda relatorio quando ha nota; sem ela nao tem o que mostrar na pagina publica
    const id = grade ? await saveReport(db, { domain, grade, ...counts, findings }) : null
    await send('done', { domain, total: findings.length, grade, ...counts, incomplete: failed, id })
  }, headers)

const rateHeaders = (l: LimitResult) => ({
  ...cors,
  'x-ratelimit-limit': String(LIMIT),
  'x-ratelimit-remaining': String(l.remaining),
})

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(req.url)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    const report = pathname.startsWith('/api/r/') ? pathname.slice('/api/r/'.length) : null
    if (report !== null) {
      if (req.method !== 'GET') return json({ error: 'use GET' }, 405)
      const found = isId(report) ? await loadReport(env.DB, report) : null
      return found ? json(found) : json({ error: 'relatorio nao encontrado ou expirado' }, 404)
    }
    if (pathname.startsWith('/api/history/')) {
      if (req.method !== 'GET') return json({ error: 'use GET' }, 405)
      const domain = parseDomain(pathname.slice('/api/history/'.length))
      if (!domain) return json({ error: 'dominio invalido' }, 400)
      return json({ domain, scans: await loadHistory(env.DB, domain) })
    }
    const route = routes[pathname]
    if (!route) return json({ error: 'nao encontrado' }, 404)
    if (req.method !== 'POST') return json({ error: 'use POST' }, 405)

    const body = await req.json<{ domain?: unknown }>().catch(() => null)
    const domain = parseDomain(body?.domain)
    if (!domain) return json({ error: 'dominio invalido' }, 400)

    // so conta depois de validar o dominio, pra entrada invalida nao gastar a cota de ninguem
    const ip = req.headers.get('cf-connecting-ip') ?? 'local'
    const limit = await checkLimit(env.RATE_LIMITER, pathname, ip)
    if (!limit.ok) {
      return json({ error: 'limite de 5 scans por hora atingido', retryAfter: limit.retryAfter }, 429, {
        'retry-after': String(limit.retryAfter),
        'x-ratelimit-limit': String(LIMIT),
        'x-ratelimit-remaining': '0',
      })
    }

    const host = await checkHost(domain)
    if (!host.ok) {
      const msg = {
        interno: 'dominio aponta para endereco interno',
        'sem-dns': 'dominio nao resolve',
        'dns-falhou': 'nao consegui consultar o dns agora',
      }[host.reason]
      return json({ error: msg }, host.reason === 'dns-falhou' ? 502 : 400)
    }

    return stream(domain, route, pathname === '/api/scan', rateHeaders(limit), env.DB)
  },
}
