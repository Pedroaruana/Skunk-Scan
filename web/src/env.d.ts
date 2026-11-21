/// <reference types="vite/client" />

interface ImportMetaEnv {
  // endereco do Worker; sem ele o front usa o de producao (ou o wrangler dev em localhost)
  readonly VITE_API_URL?: string
  // token publico do Cloudflare Web Analytics; sem ele nenhum script de metrica e carregado
  readonly VITE_CF_BEACON_TOKEN?: string
}
