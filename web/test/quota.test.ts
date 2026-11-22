import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamScan, type ScanHandlers } from '../src/lib/api'
import { SCAN_LIMIT } from '../src/data/limits'

const sse = (remaining: string) =>
  new Response('event: done\ndata: {"domain":"a.com","total":0,"grade":"A","grave":0,"medio":0,"incomplete":[],"id":"abc123abc123"}\n\n', {
    headers: { 'x-ratelimit-remaining': remaining },
  })

const handlers = (remaining: ScanHandlers['remaining']): ScanHandlers => ({ step: () => {}, finding: () => {}, warn: () => {}, error: () => {}, remaining })

afterEach(() => vi.unstubAllGlobals())

describe('contador de varreduras', () => {
  it('usa o limite de 15 por hora, igual ao da API', () => {
    expect(SCAN_LIMIT).toBe(15)
  })

  it('so a rota de varredura atualiza o contador; dominios parecidos tem contagem propria', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => sse('9')))
    const remaining = vi.fn()
    await streamScan('/api/scan', 'a.com', handlers(remaining))
    expect(remaining).toHaveBeenCalledWith(9)

    const other = vi.fn()
    await streamScan('/api/lookalikes', 'a.com', handlers(other))
    expect(other).not.toHaveBeenCalled()
  })
})
