const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/

// Aceita "site.com.br", "https://site.com.br/x" e devolve o host em minusculo, ou null se invalido
export const parseDomain = (input: unknown): string | null => {
  if (typeof input !== 'string') return null
  let host = input.trim().toLowerCase()
  if (!host || host.length > 253) return null
  host = host.replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0].replace(/:\d+$/, '').replace(/\.$/, '')
  const labels = host.split('.')
  if (labels.length < 2 || !labels.every((l) => LABEL.test(l))) return null
  if (/^\d+$/.test(labels[labels.length - 1])) return null
  return host
}
