import { useEffect, useRef, type ReactNode } from 'react'
import type { Doc } from '../lib/router'

const UPDATED = '22/11/2026'
const ISSUES = 'https://github.com/Pedroaruana/Skunk-Scan/issues'

const H1 = ({ children }: { children: ReactNode }) => <h1 className="m-0 mb-1 text-[22px] text-bright">{children}</h1>
const H2 = ({ children }: { children: ReactNode }) => <h2 className="mt-7 mb-1.5 text-[15px] text-bright">{children}</h2>
const P = ({ children }: { children: ReactNode }) => <p className="text-[#c9c9c9]">{children}</p>
const Ul = ({ children }: { children: ReactNode }) => <ul className="my-1.5 pl-5 text-[#c9c9c9] [&_li]:text-[#c9c9c9]">{children}</ul>
const Meta = ({ children }: { children: ReactNode }) => <div className="mb-5 text-xs text-mute">{children}</div>
const Contact = () => (
  <P>
    Abra uma issue em{' '}
    <a href={ISSUES} target="_blank" rel="noreferrer">
      github.com/Pedroaruana/Skunk-Scan/issues
    </a>
    . A issue e publica: nao coloque dados pessoais nela. Se o assunto exigir, descreva so o pedido e combinamos outro canal.
  </P>
)

const Termos = () => (
  <article>
    <H1>Termos de uso</H1>
    <Meta>ultima atualizacao: {UPDATED}</Meta>
    <H2>1. O que e o SkunkScan</H2>
    <P>
      O SkunkScan analisa a seguranca de sites de forma passiva. Ele so le informacoes que o proprio site ja deixa publicas: certificado, headers, registros de DNS, registros publicos de certificados, bases publicas de vulnerabilidades e registros de dominios. Nenhum teste de invasao e feito. E um projeto da equipe Crypto Skunks, feito para o Hack Brasil 2026.
    </P>
    <H2>2. Uso permitido</H2>
    <Ul>
      <li>Analisar sites seus, da sua empresa ou de clientes que autorizaram.</li>
      <li>Analisar sites publicos para fins de estudo e pesquisa, sem causar dano.</li>
    </Ul>
    <H2>3. Uso proibido</H2>
    <Ul>
      <li>Usar o servico para preparar ataques, fraudes ou qualquer ato ilegal.</li>
      <li>Burlar os limites, automatizar acessos em massa ou tentar analisar enderecos internos.</li>
      <li>Publicar resultados de terceiros para expor ou prejudicar alguem.</li>
      <li>Cadastrar como webhook um endereco que voce nao controla ou nao esta autorizado a usar.</li>
    </Ul>
    <P>Podemos bloquear o acesso de quem violar estas regras.</P>
    <H2>4. Limites</H2>
    <P>Cada IP pode fazer ate 15 varreduras, 15 pedidos de correcao e 5 cadastros de monitoramento por hora, e ate 20 perguntas a IA por hora. Localhost e IPs internos sao bloqueados.</P>
    <H2>5. Resultados e IA</H2>
    <P>
      Os resultados e as correcoes sugeridas sao informativos. As frases de orientacao e as respostas do assistente sao geradas por IA e podem conter erros. Revise cada correcao antes de aplicar. O SkunkScan nao garante que um site esteja livre de falhas.
    </P>
    <H2>6. Relatorios e dados publicos</H2>
    <Ul>
      <li>O relatorio completo fica acessivel so por quem tem o link, por 30 dias.</li>
      <li>A nota, a quantidade de problemas e a data das varreduras de um dominio ficam publicas por ate 180 dias, no grafico de evolucao e no feed Atom do dominio.</li>
    </Ul>
    <H2>7. Selo</H2>
    <P>
      O selo "verificado" so aparece enquanto a varredura mais recente do dominio, de ate 30 dias, tiver nota A, e some sozinho se a nota cair. Ele nao prova que quem o exibe e dono do site: qualquer pessoa pode escanear um dominio.
    </P>
    <H2>8. Monitoramento</H2>
    <P>
      Ao cadastrar um dominio, e opcionalmente um webhook https, o SkunkScan escaneia o site uma vez por dia e envia um aviso ao webhook se a nota cair. O monitoramento vale por 90 dias e pode ser removido a qualquer momento com o token entregue no cadastro. Quem perder o token nao consegue remover antes do prazo.
    </P>
    <H2>9. Radar Brasil</H2>
    <P>As estatisticas do radar sao agregadas por estado e nunca identificam um site especifico. Neste momento o radar mostra dados de exemplo, avisado na propria tela.</P>
    <H2>10. Responsabilidade</H2>
    <P>
      O servico e gratuito, oferecido como esta e sem garantia de disponibilidade, e pode sair do ar ou mudar a qualquer momento. Nao nos responsabilizamos por decisoes tomadas com base nos resultados.
    </P>
    <H2>11. Alteracoes e lei aplicavel</H2>
    <P>Estes termos podem mudar, sempre com a data atualizada nesta pagina. Valem as leis do Brasil.</P>
    <H2>12. Contato</H2>
    <Contact />
  </article>
)

const Privacidade = () => (
  <article>
    <H1>Politica de privacidade</H1>
    <Meta>ultima atualizacao: {UPDATED} · em conformidade com a LGPD (Lei 13.709/2018)</Meta>
    <H2>1. Quem trata os dados</H2>
    <P>A equipe Crypto Skunks, responsavel pelo projeto SkunkScan (Hack Brasil 2026). Contato na secao 10.</P>
    <H2>2. Dados que tratamos</H2>
    <Ul>
      <li>
        <b>Dominio analisado</b> e o resultado da varredura (problemas encontrados, nota e data).
      </li>
      <li>
        <b>Endereco IP</b>, so para aplicar os limites de uso. Tambem passa pela Cloudflare, que entrega o servico.
      </li>
      <li>
        <b>Perguntas feitas a IA</b>, enviadas ao provedor de IA junto com o dominio, a nota e os problemas do seu ultimo relatorio, para gerar a resposta. Nao guardamos o texto da pergunta, so a resposta, identificada por um codigo gerado a partir dela.
      </li>
      <li>
        <b>Monitoramento</b>: o dominio, o webhook que voce informar (que pode conter chaves de acesso), a ultima nota e o token de remocao.
      </li>
      <li>
        <b>No seu navegador</b>: a lista das suas varreduras (dominio, nota e codigo do relatorio) e o registro do aviso de cookies.
      </li>
      <li>
        <b>Metricas de acesso</b>, se estiverem ligadas: contagem de visitas pelo Cloudflare Web Analytics, sem cookies e sem identificar voce. Nao carregamos o script de quem usa Do Not Track.
      </li>
    </Ul>
    <P>Nao pedimos nome, e-mail, CPF nem senha, e nao existe conta de usuario.</P>
    <H2>3. Para que usamos</H2>
    <Ul>
      <li>Fazer a varredura e mostrar o resultado, o relatorio, o mapa e a evolucao da nota.</li>
      <li>Impedir abuso do servico.</li>
      <li>Responder perguntas e gerar as correcoes com IA.</li>
      <li>Fazer o monitoramento diario e avisar o webhook quando a nota cair.</li>
      <li>Montar estatisticas agregadas do Radar Brasil, sem identificar sites.</li>
      <li>Entender quantas pessoas visitam o site.</li>
    </Ul>
    <H2>4. Base legal</H2>
    <P>
      Legitimo interesse (LGPD, art. 7, IX) para a varredura, a protecao contra abuso e as metricas. Execucao do servico que voce pediu, e consentimento ao informar um webhook, para o monitoramento, que voce pode cancelar a qualquer momento.
    </P>
    <H2>5. Por quanto tempo guardamos</H2>
    <Ul>
      <li>IP para o limite de uso: ate 1 hora.</li>
      <li>Relatorio completo (problemas e correcoes): 30 dias.</li>
      <li>Nota, quantidade de problemas, dominio e data: ate 180 dias.</li>
      <li>Resposta da IA em cache: 7 dias.</li>
      <li>Monitoramento (dominio, webhook, token): ate 90 dias, ou ate voce remover.</li>
      <li>Dados no seu navegador: ate voce limpar.</li>
    </Ul>
    <H2>6. Com quem compartilhamos</H2>
    <Ul>
      <li>Cloudflare: execucao do servico (Workers, banco de dados, Durable Objects, Workers AI e metricas).</li>
      <li>GitHub: hospedagem das paginas e do codigo.</li>
      <li>Servicos publicos consultados na varredura (DNS, registros de certificados, base de vulnerabilidades e registros de dominios): recebem o nome do dominio analisado, nunca dados do visitante.</li>
      <li>O webhook que voce cadastrou: recebe o dominio, a nota e o codigo do relatorio quando a nota cair.</li>
    </Ul>
    <P>Nao vendemos dados e nao usamos para publicidade.</P>
    <H2>7. Transferencia internacional</H2>
    <P>A Cloudflare e o GitHub processam dados em servidores fora do Brasil, com as garantias previstas na LGPD.</P>
    <H2>8. Seus direitos</H2>
    <P>
      Voce pode pedir confirmacao do tratamento, acesso, correcao, exclusao ou informacoes sobre o compartilhamento dos seus dados, e revogar o consentimento, conforme o art. 18 da LGPD. Para remover um monitoramento, use o comando /monitorar parar com o token.
    </P>
    <H2>9. Seguranca</H2>
    <P>Usamos conexao criptografada, guardamos so o minimo necessario e o link do relatorio e um codigo aleatorio de 12 caracteres.</P>
    <H2>10. Contato e encarregado</H2>
    <Contact />
  </article>
)

const Cookies = () => (
  <article>
    <H1>Politica de cookies</H1>
    <Meta>ultima atualizacao: {UPDATED}</Meta>
    <H2>1. Cookies</H2>
    <P>O SkunkScan nao usa cookies de rastreamento, de publicidade nem de analise de terceiros.</P>
    <H2>2. Armazenamento local</H2>
    <P>Guardamos no armazenamento local do seu navegador, e so nele:</P>
    <Ul>
      <li>um registro de que voce ja viu o aviso de cookies;</li>
      <li>a lista das suas ultimas varreduras (dominio, nota e codigo do relatorio), para o historico do terminal.</li>
    </Ul>
    <H2>3. Metricas de acesso</H2>
    <P>
      Quando estiverem ligadas, usamos o Cloudflare Web Analytics para contar visitas. Ele nao usa cookies nem guarda dados que identifiquem voce, e nao e carregado se o seu navegador envia o sinal Do Not Track.
    </P>
    <H2>4. Como remover</H2>
    <P>Limpe os dados do site nas configuracoes do navegador. O aviso volta a aparecer e a lista de varreduras some.</P>
    <H2>5. Mudancas</H2>
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
