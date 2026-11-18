import { doh, txt } from '../dns'
import type { Finding } from '../types'

// seletores comuns: google, microsoft 365, mailchimp, sendgrid e genericos
const DKIM_SELECTORS = ['default', 'google', 'selector1', 'selector2', 'k1', 's1', 's2', 'mail', 'dkim', 'smtp']

const spfFindings = (records: string[]): Finding[] => {
  const spf = records.filter((r) => /^v=spf1(\s|$)/i.test(r))
  if (spf.length === 0) {
    return [
      {
        id: 'spf',
        severity: 'medio',
        title: 'SPF ausente',
        detail: 'Sem SPF, qualquer servidor pode enviar e-mail se passando pelo seu dominio.',
        fix: 'Crie um TXT no dominio: v=spf1 include:<seu provedor de e-mail> ~all',
      },
    ]
  }
  if (spf.length > 1) {
    return [
      {
        id: 'spf',
        severity: 'medio',
        title: 'Mais de um registro SPF',
        detail: 'O padrao permite so um registro SPF por dominio. Com varios, os receptores ignoram todos.',
        fix: 'Junte os registros em um unico TXT v=spf1 com todos os includes.',
      },
    ]
  }
  const match = /\s([+?~-]?)all\s*$/i.exec(spf[0])
  // sem "all" mas com redirect=, a politica vem do outro dominio (caso do gmail.com)
  if (!match && /\sredirect=/i.test(spf[0])) {
    return [{ id: 'spf', severity: 'ok', title: 'SPF configurado (via redirect)', detail: spf[0] }]
  }
  // "+all" e "?all" (ou sem all) nao bloqueiam ninguem; "all" sozinho equivale a "+all"
  const all = match ? match[1] || '+' : '?'
  if (all === '+' || all === '?') {
    return [
      {
        id: 'spf',
        severity: 'medio',
        title: 'SPF permissivo demais',
        detail: `O registro termina em "${all}all", entao nao bloqueia remetentes nao autorizados.`,
        fix: 'Troque o final por ~all (ou -all quando tiver certeza de todos os remetentes).',
      },
    ]
  }
  return [{ id: 'spf', severity: 'ok', title: 'SPF configurado', detail: spf[0] }]
}

const dmarcFindings = (records: string[]): Finding[] => {
  const dmarc = records.find((r) => /^v=DMARC1\s*;/i.test(r))
  if (!dmarc) {
    return [
      {
        id: 'dmarc',
        severity: 'medio',
        title: 'DMARC ausente',
        detail: 'Sem DMARC, e-mails falsos usando seu dominio chegam sem nenhum bloqueio ou aviso.',
        fix: 'Crie um TXT em _dmarc.seudominio: v=DMARC1; p=none; rua=mailto:<seu e-mail>, e suba para p=quarantine depois de acompanhar os relatorios.',
      },
    ]
  }
  const policy = /;\s*p=(\w+)/i.exec(dmarc)?.[1]?.toLowerCase()
  if (policy === 'quarantine' || policy === 'reject') {
    return [{ id: 'dmarc', severity: 'ok', title: `DMARC com politica ${policy}`, detail: dmarc }]
  }
  return [
    {
      id: 'dmarc',
      severity: 'medio',
      title: 'DMARC so monitora (p=none)',
      detail: 'O registro existe, mas nao pede que e-mails falsos sejam bloqueados.',
      fix: 'Depois de revisar os relatorios, mude para p=quarantine e por fim p=reject.',
    },
  ]
}

const dkimFinding = async (domain: string): Promise<Finding> => {
  const hits = await Promise.all(
    DKIM_SELECTORS.map(async (s) => ((await txt(`${s}._domainkey.${domain}`)).some((r) => /p=[A-Za-z0-9+/=]{16,}/.test(r)) ? s : null)),
  )
  const found = hits.filter((s): s is string => s !== null)
  if (found.length > 0) {
    return { id: 'dkim', severity: 'ok', title: 'DKIM encontrado', detail: `Seletores: ${found.join(', ')}.` }
  }
  return {
    id: 'dkim',
    severity: 'info',
    title: 'DKIM nao encontrado nos seletores comuns',
    detail: 'O seletor pode ter outro nome, entao isso nao prova que falta DKIM. Confira no painel do seu provedor de e-mail.',
  }
}

export const checkDns = async (domain: string): Promise<Finding[]> => {
  const [mx, spfTxt, dmarcTxt] = await Promise.all([doh(domain, 'MX'), txt(domain), txt(`_dmarc.${domain}`)])
  const hasSpf = spfTxt.some((r) => /^v=spf1/i.test(r))
  const hasDmarc = dmarcTxt.some((r) => /^v=DMARC1/i.test(r))

  // dominio sem e-mail nenhum: nao faz sentido cobrar autenticacao de e-mail
  if (mx.length === 0 && !hasSpf && !hasDmarc) {
    return [
      {
        id: 'email',
        severity: 'info',
        title: 'Dominio sem e-mail configurado',
        detail: 'Nao ha MX, SPF nem DMARC. Se o dominio nao envia e-mail, um SPF "v=spf1 -all" impede que o usem em golpes.',
      },
    ]
  }

  return [...spfFindings(spfTxt), ...dmarcFindings(dmarcTxt), await dkimFinding(domain)]
}
