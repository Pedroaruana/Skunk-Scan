import type { Finding } from './types'

export type Fix = {
  id: string
  severity: Finding['severity']
  title: string
  // o que colar: sai de modelo fixo, nunca da IA, pra nao receber config inventada
  code: string
  // texto curto e sem jargao de como aplicar; vem da IA quando disponivel
  how: string | null
}

export type FixResult = { fixes: Fix[]; ai: boolean }

const MODEL = '@cf/meta/llama-3.1-8b-instruct'
const MAX_FIXES = 12

const header = (name: string, value: string) => `add_header ${name} "${value}" always;`

// correcao pronta por tipo de achado; o que nao tem modelo cai no fix escrito pelo proprio check
const templates: Record<string, (domain: string) => string> = {
  hsts: () => header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'),
  csp: () => header('Content-Security-Policy', "default-src 'self'"),
  nosniff: () => header('X-Content-Type-Options', 'nosniff'),
  clickjacking: () => header('X-Frame-Options', 'DENY'),
  version: () => 'server_tokens off;   # nginx\nServerTokens Prod   # apache',
  https: (d) => `server {\n  listen 80;\n  server_name ${d} www.${d};\n  return 301 https://${d}$request_uri;\n}`,
  redirect: (d) => `server {\n  listen 80;\n  server_name ${d} www.${d};\n  return 301 https://${d}$request_uri;\n}`,
  spf: () => 'Tipo TXT, nome @\nv=spf1 include:<seu provedor de e-mail> ~all',
  dmarc: (d) => `Tipo TXT, nome _dmarc\nv=DMARC1; p=quarantine; rua=mailto:dmarc@${d}`,
}

export const buildFixes = (domain: string, findings: Finding[]): Fix[] =>
  findings
    .filter((f) => (f.severity === 'grave' || f.severity === 'medio') && (templates[f.id] || f.fix))
    .slice(0, MAX_FIXES)
    .map((f) => ({
      id: f.id,
      severity: f.severity,
      title: f.title,
      code: templates[f.id]?.(domain) ?? f.fix ?? '',
      how: null,
    }))

const prompt = (domain: string, fixes: Fix[]) =>
  [
    `O site ${domain} tem os problemas de seguranca abaixo. Para cada um, escreva em portugues do Brasil UMA frase curta`,
    'dizendo onde aplicar a correcao (arquivo de configuracao, painel da hospedagem ou do DNS), para um dono de pequena empresa sem experiencia tecnica.',
    'Nao invente comandos nem configuracoes, nao repita o titulo. Responda so com JSON: [{"id": "...", "how": "..."}]',
    '',
    ...fixes.map((f) => `- id=${f.id}: ${f.title}`),
  ].join('\n')

type AiBinding = { run: (model: string, input: { prompt: string; max_tokens: number }) => Promise<unknown> }

// pega o primeiro array JSON da resposta e so aceita ids que pedimos, com texto curto
const parseHow = (raw: unknown, fixes: Fix[]): Map<string, string> => {
  const out = new Map<string, string>()
  const text = typeof raw === 'object' && raw && 'response' in raw ? String((raw as { response: unknown }).response) : ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return out
  let list: unknown
  try {
    list = JSON.parse(match[0])
  } catch {
    return out
  }
  if (!Array.isArray(list)) return out
  const ids = new Set(fixes.map((f) => f.id))
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const { id, how } = item as { id?: unknown; how?: unknown }
    if (typeof id === 'string' && typeof how === 'string' && ids.has(id) && how.trim()) out.set(id, how.trim().slice(0, 300))
  }
  return out
}

// A IA so personaliza o "como aplicar". Se ela falhar ou nao estiver ligada, a resposta sai igual, so sem esse texto.
export const generateFixes = async (domain: string, findings: Finding[], ai?: AiBinding): Promise<FixResult> => {
  const fixes = buildFixes(domain, findings)
  if (!ai || fixes.length === 0) return { fixes, ai: false }
  try {
    const how = parseHow(await ai.run(MODEL, { prompt: prompt(domain, fixes), max_tokens: 900 }), fixes)
    return { fixes: fixes.map((f) => ({ ...f, how: how.get(f.id) ?? null })), ai: how.size > 0 }
  } catch (e) {
    console.error(JSON.stringify({ event: 'ai_failed', message: e instanceof Error ? e.message : 'desconhecido' }))
    return { fixes, ai: false }
  }
}
