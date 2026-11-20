import { parseDomain } from './domain'
import { sseResponse, type Send } from './sse'
import { checkHost } from './ssrf'
import { checkLookalikes } from './checks/lookalikes'
import { countFindings, gradeOf } from './scoring'
import { checkLimit, LIMIT, RateLimiter, type LimitResult } from './ratelimit'
import { answerQuestion, MAX_QUESTION } from './ask'
import { generateFixes } from './llm'
import { atomFeed } from './feed'
import { createMonitor, isToken, parseWebhook, removeMonitor, runDueMonitor, TTL_DAYS } from './monitor'
import { isId, loadHistory, loadReport, saveReport } from './reports'
import { scanChecks, type Run } from './scan'
import type { Finding } from './types'

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-expose-headers': 'retry-after, x-ratelimit-limit, x-ratelimit-remaining',
}

export { RateLimiter }

// perguntas sao baratas e vem em sequencia, entao o limite e maior que o do scan
const ASK_LIMIT = 20

type Env = { RATE_LIMITER: DurableObjectNamespace<RateLimiter>; DB: D1Database; AI?: Ai }

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors, ...extra } })

// cada rota recebe o dominio ja validado e um run que isola cada check: se um cair, os outros seguem
const routes: Record<string, (domain: string, run: Run) => Promise<void>> = {
  '/api/scan': scanChecks,
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
    if (pathname.startsWith('/api/feed/')) {
      if (req.method !== 'GET') return json({ error: 'use GET' }, 405)
      const domain = parseDomain(pathname.slice('/api/feed/'.length))
      if (!domain) return json({ error: 'dominio invalido' }, 400)
      const xml = atomFeed(domain, await loadHistory(env.DB, domain), req.url)
      return new Response(xml, { headers: { 'content-type': 'application/atom+xml; charset=utf-8', 'cache-control': 'public, max-age=300', ...cors } })
    }
    if (pathname.startsWith('/api/monitor/')) {
      if (req.method !== 'DELETE') return json({ error: 'use DELETE' }, 405)
      const token = pathname.slice('/api/monitor/'.length)
      const removed = isToken(token) ? await removeMonitor(env.DB, token) : false
      return removed ? json({ removed: true }) : json({ error: 'monitor nao encontrado' }, 404)
    }
    if (pathname === '/api/monitor') {
      if (req.method !== 'POST') return json({ error: 'use POST' }, 405)
      const body = await req.json<{ domain?: unknown; webhook?: unknown }>().catch(() => null)
      const domain = parseDomain(body?.domain)
      if (!domain) return json({ error: 'dominio invalido' }, 400)
      const wantsWebhook = typeof body?.webhook === 'string' && body.webhook.trim() !== ''
      const webhook = wantsWebhook ? parseWebhook(body?.webhook) : null
      if (wantsWebhook && !webhook) return json({ error: 'webhook invalido: use uma url https publica' }, 400)
      const ip = req.headers.get('cf-connecting-ip') ?? 'local'
      const limit = await checkLimit(env.RATE_LIMITER, pathname, ip)
      if (!limit.ok) {
        return json({ error: 'limite de 5 cadastros por hora atingido', retryAfter: limit.retryAfter }, 429, {
          'retry-after': String(limit.retryAfter),
          'x-ratelimit-limit': String(LIMIT),
          'x-ratelimit-remaining': '0',
        })
      }
      if (!(await checkHost(domain)).ok) return json({ error: 'dominio nao resolve ou aponta para endereco interno' }, 400)
      if (webhook && !(await checkHost(webhook.hostname)).ok) return json({ error: 'webhook invalido: o endereco nao e publico' }, 400)
      const created = await createMonitor(env.DB, domain, webhook ? webhook.toString() : null)
      if (!created.ok) {
        return created.reason === 'cheio'
          ? json({ error: 'limite de monitores atingido, tente mais tarde' }, 503)
          : json({ error: 'esse dominio ja esta monitorado com esse webhook' }, 409)
      }
      return json({ domain, token: created.token, feed: `/api/feed/${domain}`, webhook: webhook !== null, expiresInDays: TTL_DAYS }, 201, rateHeaders(limit))
    }
    if (pathname.startsWith('/api/history/')) {
      if (req.method !== 'GET') return json({ error: 'use GET' }, 405)
      const domain = parseDomain(pathname.slice('/api/history/'.length))
      if (!domain) return json({ error: 'dominio invalido' }, 400)
      return json({ domain, scans: await loadHistory(env.DB, domain) })
    }
    if (pathname === '/api/fix') {
      if (req.method !== 'POST') return json({ error: 'use POST' }, 405)
      const body = await req.json<{ id?: unknown }>().catch(() => null)
      const id = typeof body?.id === 'string' ? body.id : ''
      if (!isId(id)) return json({ error: 'id de relatorio invalido' }, 400)
      const ip = req.headers.get('cf-connecting-ip') ?? 'local'
      const limit = await checkLimit(env.RATE_LIMITER, pathname, ip)
      if (!limit.ok) {
        return json({ error: 'limite de 5 pedidos de correcao por hora atingido', retryAfter: limit.retryAfter }, 429, {
          'retry-after': String(limit.retryAfter),
          'x-ratelimit-limit': String(LIMIT),
          'x-ratelimit-remaining': '0',
        })
      }
      // as correcoes saem do relatorio salvo, nao de dados enviados pelo cliente
      const found = await loadReport(env.DB, id)
      if (!found) return json({ error: 'relatorio nao encontrado ou expirado' }, 404)
      return json({ domain: found.domain, ...(await generateFixes(found.domain, found.findings, env.AI)) }, 200, rateHeaders(limit))
    }
    if (pathname === '/api/ask') {
      if (req.method !== 'POST') return json({ error: 'use POST' }, 405)
      const body = await req.json<{ question?: unknown; id?: unknown }>().catch(() => null)
      const question = typeof body?.question === 'string' ? body.question.trim() : ''
      if (question.length < 2 || question.length > MAX_QUESTION) return json({ error: `a pergunta deve ter de 2 a ${MAX_QUESTION} caracteres` }, 400)
      const ip = req.headers.get('cf-connecting-ip') ?? 'local'
      const limit = await checkLimit(env.RATE_LIMITER, pathname, ip, ASK_LIMIT)
      if (!limit.ok) {
        return json({ error: `limite de ${ASK_LIMIT} perguntas por hora atingido`, retryAfter: limit.retryAfter }, 429, {
          'retry-after': String(limit.retryAfter),
          'x-ratelimit-limit': String(ASK_LIMIT),
          'x-ratelimit-remaining': '0',
        })
      }
      // o contexto vem do relatorio salvo; id invalido ou vencido so tira o contexto, a pergunta ainda vale
      const reportId = typeof body?.id === 'string' && isId(body.id) ? body.id : null
      const found = reportId ? await loadReport(env.DB, reportId) : null
      const ctx = found ? { domain: found.domain, grade: found.grade, findings: found.findings } : null
      return json(await answerQuestion(question, ctx, found ? reportId : null, env.DB, env.AI))
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
  // cron: confere um monitor vencido por disparo
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runDueMonitor(env.DB))
  },
}
