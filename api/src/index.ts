import { parseDomain } from './domain'
import { sseResponse } from './sse'
import { checkHost } from './ssrf'
import { checkWeb } from './checks/web'
import { checkDns } from './checks/dns'
import { checkSubdomains } from './checks/subdomains'
import type { Finding } from './types'

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } })

export default {
  async fetch(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (pathname !== '/api/scan') return json({ error: 'nao encontrado' }, 404)
    if (req.method !== 'POST') return json({ error: 'use POST' }, 405)

    const body = await req.json<{ domain?: unknown }>().catch(() => null)
    const domain = parseDomain(body?.domain)
    if (!domain) return json({ error: 'dominio invalido' }, 400)

    const host = await checkHost(domain)
    if (!host.ok) {
      const msg = {
        interno: 'dominio aponta para endereco interno',
        'sem-dns': 'dominio nao resolve',
        'dns-falhou': 'nao consegui consultar o dns agora',
      }[host.reason]
      return json({ error: msg }, host.reason === 'dns-falhou' ? 502 : 400)
    }

    return sseResponse(async (send) => {
      const findings: Finding[] = []
      await send('start', { domain })

      // cada check roda isolado: se um cair, o scan segue com os outros
      const run = async (id: string, label: string, check: () => Promise<Finding[] | null>) => {
        await send('step', { id, label })
        try {
          const result = await check()
          if (!result) return await send('warn', { id, message: 'o site nao respondeu a requisicao web' })
          for (const f of result) {
            findings.push(f)
            await send('finding', f)
          }
        } catch {
          await send('warn', { id, message: `falha ao checar ${label}` })
        }
      }

      await run('web', 'TLS e headers', async () => (await checkWeb(domain))?.findings ?? null)
      await run('dns', 'e-mail (SPF, DKIM, DMARC)', () => checkDns(domain))
      await run('subdomains', 'subdominios e certificado', () => checkSubdomains(domain))

      // os outros checks entram nos proximos PRs
      await send('done', { domain, total: findings.length })
    }, cors)
  },
}
