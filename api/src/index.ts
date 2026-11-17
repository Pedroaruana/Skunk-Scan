import { parseDomain } from './domain'
import { sseResponse } from './sse'

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

    return sseResponse(async (send) => {
      await send('start', { domain })
      // os checks entram aqui nos proximos PRs
      await send('done', { domain })
    }, cors)
  },
}
