// Cloudflare Web Analytics: sem cookies e sem identificar o visitante. So liga se o token existir no build.
const BEACON = 'https://static.cloudflareinsights.com/beacon.min.js'

// o token do Cloudflare tem 32 caracteres hexa; qualquer outra coisa nao entra no HTML
export const beaconTag = (token: string | undefined): { src: string; config: string } | null =>
  token && /^[0-9a-f]{32}$/.test(token) ? { src: BEACON, config: JSON.stringify({ token }) } : null

export const loadAnalytics = (token: string | undefined): void => {
  const tag = beaconTag(token)
  // quem pede para nao ser rastreado (Do Not Track) nao carrega o script
  if (!tag || navigator.doNotTrack === '1' || document.querySelector('script[data-cf-beacon]')) return
  const s = document.createElement('script')
  s.defer = true
  s.src = tag.src
  s.setAttribute('data-cf-beacon', tag.config)
  document.head.appendChild(s)
}
