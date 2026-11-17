const DOH = 'https://cloudflare-dns.com/dns-query'
const BLOCKED_SUFFIXES = ['.local', '.localhost', '.internal', '.lan', '.home', '.corp', '.intranet']

export const isPrivateIPv4 = (ip: string): boolean => {
  const p = ip.split('.').map(Number)
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true
  const [a, b] = p
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && p[2] === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

export const isPrivateIPv6 = (ip: string): boolean => {
  const v = ip.toLowerCase()
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIPv4(mapped[1])
  if (v === '::' || v === '::1') return true
  return /^(fc|fd|fe[89ab]|ff)/.test(v)
}

export const isPrivateIp = (ip: string): boolean => (ip.includes(':') ? isPrivateIPv6(ip) : isPrivateIPv4(ip))

export const hasBlockedSuffix = (host: string): boolean => BLOCKED_SUFFIXES.some((s) => host.endsWith(s))

type DohAnswer = { type: number; data: string }

const query = async (host: string, type: 'A' | 'AAAA'): Promise<string[]> => {
  const res = await fetch(`${DOH}?name=${encodeURIComponent(host)}&type=${type}`, {
    headers: { accept: 'application/dns-json' },
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) throw new Error('falha no dns')
  const body = await res.json<{ Answer?: DohAnswer[] }>()
  const wanted = type === 'A' ? 1 : 28
  return (body.Answer ?? []).filter((a) => a.type === wanted).map((a) => a.data)
}

export type HostCheck = { ok: true; ips: string[] } | { ok: false; reason: 'interno' | 'sem-dns' | 'dns-falhou' }

// Resolve o host e recusa se qualquer endereco for interno, evitando SSRF por dominio apontado pra rede privada
export const checkHost = async (host: string): Promise<HostCheck> => {
  if (hasBlockedSuffix(host)) return { ok: false, reason: 'interno' }
  let ips: string[]
  try {
    ips = (await Promise.all([query(host, 'A'), query(host, 'AAAA')])).flat()
  } catch {
    return { ok: false, reason: 'dns-falhou' }
  }
  if (ips.length === 0) return { ok: false, reason: 'sem-dns' }
  if (ips.some(isPrivateIp)) return { ok: false, reason: 'interno' }
  return { ok: true, ips }
}
