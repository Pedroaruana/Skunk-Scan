import { checkWeb } from './checks/web'
import { checkDns } from './checks/dns'
import { checkSubdomains } from './checks/subdomains'
import { checkCves } from './checks/cves'
import { gradeOf, type Grade } from './scoring'
import type { Finding } from './types'

export type Run = (id: string, label: string, check: () => Promise<Finding[] | null>) => Promise<void>

// os checks do scan, na ordem; o run isola cada um pra que um que caia nao derrube os outros
export const scanChecks = async (domain: string, run: Run): Promise<void> => {
  let banners: string[] = []
  await run('web', 'TLS e headers', async () => {
    const web = await checkWeb(domain)
    banners = web?.banners ?? []
    return web?.findings ?? null
  })
  await run('dns', 'e-mail (SPF, DKIM, DMARC)', () => checkDns(domain))
  await run('subdomains', 'subdominios e certificado', () => checkSubdomains(domain))
  await run('cves', 'CVEs conhecidos', () => checkCves(banners))
}

// mesmo scan sem streaming, pro monitoramento. Sem resposta do site nao existe nota.
export const scanOnce = async (domain: string): Promise<{ findings: Finding[]; grade: Grade | null }> => {
  const findings: Finding[] = []
  const failed = new Set<string>()
  await scanChecks(domain, async (id, _label, check) => {
    try {
      const result = await check()
      if (result) findings.push(...result)
      else failed.add(id)
    } catch {
      failed.add(id)
    }
  })
  return { findings, grade: failed.has('web') ? null : gradeOf(findings) }
}
