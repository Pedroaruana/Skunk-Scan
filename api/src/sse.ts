const encoder = new TextEncoder()

export type Send = (event: string, data: unknown) => Promise<void>

// Abre um stream SSE e passa uma funcao send pro callback. Fecha sozinho no fim.
export const sseResponse = (run: (send: Send) => Promise<void>, headers: HeadersInit = {}): Response => {
  const { readable, writable } = new TransformStream<Uint8Array>()
  const writer = writable.getWriter()
  const send: Send = (event, data) =>
    writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))

  void (async () => {
    try {
      await run(send)
    } catch {
      await send('error', { message: 'falha interna no scan' }).catch(() => {})
    } finally {
      await writer.close().catch(() => {})
    }
  })()

  return new Response(readable, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      ...headers,
    },
  })
}
