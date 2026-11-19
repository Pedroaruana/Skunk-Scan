import { DurableObject } from 'cloudflare:workers'

export const LIMIT = 5
export const WINDOW_MS = 60 * 60 * 1000

export type LimitResult = { ok: boolean; remaining: number; retryAfter: number }

// Um objeto por chave (rota + IP). Guarda so os horarios dos ultimos usos dentro da janela.
// Duravel porque o limite e por hora e o Worker nao guarda memoria entre requisicoes.
export class RateLimiter extends DurableObject {
  async hit(): Promise<LimitResult> {
    const now = Date.now()
    const stored = (await this.ctx.storage.get<number[]>('hits')) ?? []
    const hits = stored.filter((t) => now - t < WINDOW_MS)

    if (hits.length >= LIMIT) {
      return { ok: false, remaining: 0, retryAfter: Math.ceil((hits[0] + WINDOW_MS - now) / 1000) }
    }

    hits.push(now)
    await this.ctx.storage.put('hits', hits)
    // limpa o objeto sozinho quando a janela do primeiro uso vence
    await this.ctx.storage.setAlarm(hits[0] + WINDOW_MS)
    return { ok: true, remaining: LIMIT - hits.length, retryAfter: 0 }
  }

  async alarm(): Promise<void> {
    const now = Date.now()
    const hits = ((await this.ctx.storage.get<number[]>('hits')) ?? []).filter((t) => now - t < WINDOW_MS)
    if (hits.length === 0) return await this.ctx.storage.deleteAll()
    await this.ctx.storage.put('hits', hits)
    await this.ctx.storage.setAlarm(hits[0] + WINDOW_MS)
  }
}

// Se o limitador cair, deixa passar: o limite protege o servico, nao pode derrubar o scan.
export const checkLimit = async (ns: DurableObjectNamespace<RateLimiter>, route: string, ip: string): Promise<LimitResult> => {
  try {
    return await ns.get(ns.idFromName(`${route}:${ip}`)).hit()
  } catch {
    return { ok: true, remaining: LIMIT, retryAfter: 0 }
  }
}
