const DOH = 'https://cloudflare-dns.com/dns-query'

const RR = { A: 1, AAAA: 28, MX: 15, TXT: 16 } as const
export type RecordType = keyof typeof RR

type DohAnswer = { type: number; data: string }

// Consulta DNS over HTTPS e devolve so os dados do tipo pedido (CNAMEs no meio do caminho sao ignorados)
export const doh = async (name: string, type: RecordType): Promise<string[]> => {
  const res = await fetch(`${DOH}?name=${encodeURIComponent(name)}&type=${type}`, {
    headers: { accept: 'application/dns-json' },
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) throw new Error('falha no dns')
  const body = await res.json<{ Answer?: DohAnswer[] }>()
  return (body.Answer ?? []).filter((a) => a.type === RR[type]).map((a) => a.data)
}

// TXT vem entre aspas e pode vir partido em varios pedacos: "abc" "def"
export const txt = async (name: string): Promise<string[]> =>
  (await doh(name, 'TXT')).map((raw) =>
    [...raw.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]).join('') || raw,
  )
