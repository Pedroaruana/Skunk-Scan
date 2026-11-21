import { useEffect, useRef, type ReactNode } from 'react'
import type { Doc } from '../lib/router'

const H1 = ({ children }: { children: ReactNode }) => <h1 className="m-0 mb-1 text-[22px] text-bright">{children}</h1>
const H2 = ({ children }: { children: ReactNode }) => <h2 className="mt-7 mb-1.5 text-[15px] text-bright">{children}</h2>
const P = ({ children }: { children: ReactNode }) => <p className="text-[#c9c9c9]">{children}</p>
const Ul = ({ children }: { children: ReactNode }) => <ul className="my-1.5 pl-5 text-[#c9c9c9] [&_li]:text-[#c9c9c9]">{children}</ul>
const Meta = ({ children }: { children: ReactNode }) => <div className="mb-5 text-xs text-mute">{children}</div>

const Termos = () => (
  <article>
    <H1>Termos de uso</H1>
    <Meta>ultima atualizacao: 17/11/2026</Meta>
    <H2>1. O que e o SkunkScan</H2>
    <P>O SkunkScan analisa a seguranca de sites de forma passiva. Ele so le informacoes que o proprio site ja deixa publicas: certificado, headers, registros de DNS, registros publicos de certificados e registros de dominios. Nenhum teste de invasao e feito.</P>
    <H2>2. Uso permitido</H2>
    <Ul>
      <li>Analisar sites seus, da sua empresa ou de clientes que autorizaram.</li>
      <li>Analisar sites publicos para fins de estudo e pesquisa, sem causar dano.</li>
    </Ul>
    <H2>3. Uso proibido</H2>
    <Ul>
      <li>Usar o servico para preparar ataques, fraudes ou qualquer ato ilegal.</li>
      <li>Burlar o limite de varreduras, automatizar acessos em massa ou tentar analisar enderecos internos.</li>
      <li>Publicar resultados de terceiros para expor ou prejudicar alguem.</li>
    </Ul>
    <P>Podemos bloquear o acesso de quem violar estas regras.</P>
    <H2>4. Limites</H2>
    <P>Cada IP pode fazer ate 5 varreduras por hora. Localhost e IPs internos sao bloqueados.</P>
    <H2>5. Resultados</H2>
    <P>Os resultados e as correcoes sugeridas, incluindo as geradas por IA, sao informativos. Revise cada correcao antes de aplicar. O SkunkScan nao garante que um site esteja livre de falhas.</P>
    <H2>6. Selo</H2>
    <P>O selo "verificado" so pode ser exibido enquanto o site mantiver nota A. Ele e revalidado todo dia e deixa de aparecer se a nota cair.</P>
    <H2>7. Radar Brasil</H2>
    <P>As estatisticas do radar sao agregadas por estado e nunca identificam um site especifico.</P>
    <H2>8. Responsabilidade</H2>
    <P>O servico e oferecido como esta, sem garantias. Nao nos responsabilizamos por decisoes tomadas com base nos resultados.</P>
    <H2>9. Alteracoes e lei aplicavel</H2>
    <P>Estes termos podem mudar, sempre com a data atualizada nesta pagina. Valem as leis do Brasil.</P>
    <H2>10. Contato</H2>
    <P>[seu e-mail de contato]</P>
  </article>
)

const Privacidade = () => (
  <article>
    <H1>Politica de privacidade</H1>
    <Meta>ultima atualizacao: 17/11/2026 · em conformidade com a LGPD (Lei 13.709/2018)</Meta>
    <H2>1. Dados que coletamos</H2>
    <Ul>
      <li>
        <b>Dominio analisado</b> e o resultado da varredura.
      </li>
      <li>
        <b>Endereco IP</b>, so para aplicar o limite de varreduras.
      </li>
      <li>
        <b>E-mail</b>, apenas se voce ativar o monitoramento.
      </li>
      <li>
        <b>Perguntas feitas a IA</b>, para gerar a resposta.
      </li>
    </Ul>
    <P>Nao pedimos nome, CPF, senha nem criamos conta.</P>
    <H2>2. Para que usamos</H2>
    <Ul>
      <li>Fazer a varredura e mostrar o resultado.</li>
      <li>Impedir abuso do servico.</li>
      <li>Enviar alertas do monitoramento.</li>
      <li>Montar as estatisticas agregadas do Radar Brasil, sem identificar sites.</li>
    </Ul>
    <H2>3. Base legal</H2>
    <P>Legitimo interesse para a varredura, o radar e a protecao contra abuso. Consentimento para o monitoramento por e-mail, que voce pode cancelar a qualquer momento.</P>
    <H2>4. Por quanto tempo guardamos</H2>
    <Ul>
      <li>IP: 24 horas.</li>
      <li>Links compartilhados: 30 dias.</li>
      <li>Perguntas a IA: 7 dias.</li>
      <li>E-mail: ate voce cancelar o monitoramento.</li>
    </Ul>
    <H2>5. Com quem compartilhamos</H2>
    <Ul>
      <li>Provedor de hospedagem, para o site funcionar.</li>
      <li>Provedor de e-mail (Resend), para enviar os alertas.</li>
      <li>Provedor de IA, que recebe apenas dados tecnicos do dominio e a pergunta. Nenhum dado pessoal e enviado.</li>
    </Ul>
    <P>Nao vendemos dados e nao usamos para publicidade.</P>
    <H2>6. Seus direitos</H2>
    <P>Voce pode pedir acesso, correcao ou exclusao dos seus dados, e revogar o consentimento, conforme o art. 18 da LGPD.</P>
    <H2>7. Seguranca</H2>
    <P>Usamos conexao criptografada e guardamos so o minimo necessario.</P>
    <H2>8. Contato do encarregado</H2>
    <P>[seu e-mail de contato]</P>
  </article>
)

const Cookies = () => (
  <article>
    <H1>Politica de cookies</H1>
    <Meta>ultima atualizacao: 17/11/2026</Meta>
    <H2>1. O que usamos</H2>
    <P>O SkunkScan nao usa cookies de rastreamento, de publicidade ou de analise de terceiros.</P>
    <P>Guardamos apenas um registro no armazenamento local do seu navegador para lembrar que voce ja viu o aviso de cookies.</P>
    <H2>2. Como remover</H2>
    <P>Limpe os dados do site nas configuracoes do navegador. O aviso volta a aparecer e nada mais muda.</P>
    <H2>3. Mudancas</H2>
    <P>Se um dia passarmos a usar outro tipo de cookie, esta pagina sera atualizada e pediremos seu consentimento antes.</P>
  </article>
)

const PAGES: Record<Doc, () => ReactNode> = { termos: Termos, privacidade: Privacidade, cookies: Cookies }

// leitor de documentos estilo "less": cobre a tela, fecha com Esc ou q
export const LegalDoc = ({ doc, onClose }: { doc: Doc; onClose: () => void }) => {
  const scroll = useRef<HTMLDivElement>(null)
  const Page = PAGES[doc]

  useEffect(() => {
    scroll.current?.scrollTo({ top: 0 })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'q') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [doc, onClose])

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-ink print:hidden" role="dialog" aria-modal="true" aria-labelledby="doc-t">
      <div className="sticky top-0 z-[5] flex items-center gap-2 border-b border-edge bg-panel px-4 py-2.5">
        <span className="size-3 flex-none rounded-full bg-[#5a5a5a]" />
        <span className="size-3 flex-none rounded-full bg-[#5a5a5a]" />
        <span className="size-3 flex-none rounded-full bg-[#5a5a5a]" />
        <span id="doc-t" className="flex-1 text-center text-xs text-mute">
          less {doc}.md
        </span>
        <button type="button" autoFocus onClick={onClose} className="min-h-8 cursor-pointer border border-dashed border-dash bg-transparent px-3 text-xs text-body hover:border-white">
          q / esc para sair
        </button>
      </div>
      <div ref={scroll} className="flex-1 overflow-y-auto px-[clamp(20px,4vw,64px)] pt-8 pb-16">
        <div className="max-w-[820px] text-sm">
          <Page />
        </div>
      </div>
    </div>
  )
}
