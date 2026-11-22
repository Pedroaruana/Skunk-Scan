import type { ReactNode } from 'react'
import { API } from '../lib/api'

const TOC: [id: string, label: string][] = [
  ['nome', 'NOME'],
  ['sinopse', 'SINOPSE'],
  ['action', 'ACTION DO GITHUB'],
  ['saida', 'CODIGOS DE SAIDA'],
  ['api', 'API'],
  ['exemplos', 'EXEMPLOS'],
  ['limites', 'LIMITES'],
]

const H2 = ({ id, children }: { id?: string; children: ReactNode }) => (
  <h2 id={id && 's-' + id} className="mt-[26px] mb-1.5 text-sm tracking-[0.06em] text-bright">
    {children}
  </h2>
)
const P = ({ children }: { children: ReactNode }) => <p className="my-1 ml-8 text-[#c9c9c9]">{children}</p>
const Pre = ({ children }: { children: string }) => <pre className="my-2 ml-8 overflow-x-auto bg-well px-3.5 py-2.5 text-[13px] text-bright">{children}</pre>
const Dl = ({ items }: { items: [string, ReactNode][] }) => (
  <dl className="m-0">
    {items.map(([t, d]) => (
      <div key={t}>
        <dt className="mt-2.5 ml-8 font-bold text-bright">{t}</dt>
        <dd className="my-1 ml-16 text-[#c9c9c9]">{d}</dd>
      </div>
    ))}
  </dl>
)

const scrollTo = (id: string) => {
  const t = document.getElementById('s-' + id)
  if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' })
}

export const Docs = () => (
  <main className="px-[clamp(20px,4vw,64px)]">
    <div className="flex flex-col gap-1.5 pt-10">
      <h1 className="m-0 text-[28px] tracking-[-0.01em] text-bright">man skunkscan</h1>
      <p className="m-0 max-w-[760px] text-mute">Documentacao do terminal, da Action do GitHub e da API.</p>
    </div>
    <div className="flex flex-wrap items-start gap-10 pt-7 pb-8">
      <nav className="sticky top-16 flex flex-[0_0_200px] flex-col text-[13px]" aria-label="Secoes">
        {TOC.map(([id, label]) => (
          <a
            key={id}
            href="#/docs"
            onClick={(e) => {
              e.preventDefault()
              scrollTo(id)
            }}
            className="py-1 text-mute no-underline hover:text-bright"
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="min-w-0 flex-[1_1_560px] text-sm">
        <div className="mb-2 flex flex-wrap justify-between gap-3 border-b border-dashed border-line pb-2 text-mute">
          <span>SKUNKSCAN(1)</span>
          <span>Manual do SkunkScan</span>
          <span>SKUNKSCAN(1)</span>
        </div>

        <H2 id="nome">NOME</H2>
        <P>skunkscan - auditoria passiva de seguranca de sites</P>

        <H2 id="sinopse">SINOPSE</H2>
        <P>Tres formas de usar: o terminal desta pagina (digite /ajuda), a Action do GitHub e a API HTTP.</P>
        <P>Le apenas informacoes publicas do dominio: certificado, headers, dns, registros de Certificate Transparency, bases de CVE e registros de dominios. Nao faz teste de invasao.</P>

        <H2 id="action">ACTION DO GITHUB</H2>
        <Pre>{`- uses: Pedroaruana/Skunk-Scan@main
  with:
    domain: meusite.com.br
    min-grade: B`}</Pre>
        <Dl
          items={[
            ['domain', 'dominio a escanear. Obrigatorio.'],
            ['min-grade', 'nota minima, de A a D. Abaixo dela o job falha. Padrao: B.'],
            ['api-url', 'endereco da API. Padrao: a API publica do SkunkScan.'],
            ['saidas', 'grade, grave, medio e report-id (o relatorio vale 30 dias).'],
          ]}
        />

        <H2 id="saida">CODIGOS DE SAIDA</H2>
        <Dl
          items={[
            ['0', 'nota igual ou acima da minima'],
            ['1', 'nota abaixo da minima'],
            ['2', 'erro: dominio invalido, site sem resposta ou falha da API'],
            ['3', 'limite de varreduras atingido'],
          ]}
        />

        <H2 id="api">API</H2>
        <P>Base: {API}</P>
        <Dl items={[['POST /api/scan', 'corpo {"domain"}. Inicia a varredura e responde em text/event-stream, com os eventos start, step, finding, warn, done e error.']]} />
        <Pre>{`curl -N -X POST ${API}/api/scan \\
  -H "content-type: application/json" \\
  -d '{"domain":"lojadojoao.com.br"}'

event: step
data: {"id":"web","label":"TLS e headers"}

event: finding
data: {"id":"hsts","severity":"medio","title":"HSTS ausente", ...}

event: done
data: {"domain":"lojadojoao.com.br","grade":"C","grave":0,"medio":4,"id":"8f2k1a9c03de"}`}</Pre>
        <Dl
          items={[
            ['POST /api/lookalikes', 'corpo {"domain"}. Dominios parecidos registrados, em outra rota por causa do limite de consultas por requisicao.'],
            ['GET /api/r/:id', 'relatorio completo de uma varredura, por 30 dias.'],
            ['POST /api/fix', 'corpo {"id"}. Correcoes prontas para os problemas do relatorio, com o texto da IA quando disponivel.'],
            ['POST /api/ask', 'corpo {"question","id?"}. Resposta da IA, usando o relatorio como contexto quando o id e enviado.'],
            ['GET /api/history/:dominio', 'nota, contagens e data das ultimas varreduras do dominio, por ate 180 dias.'],
            ['GET /api/feed/:dominio', 'feed Atom com as ultimas varreduras do dominio: nota, contagens e data.'],
            ['GET /api/selo/:dominio.svg', 'selo do site em SVG. So existe enquanto a varredura mais recente (ate 30 dias) tiver nota A; fora disso responde 404 e a imagem some. A resposta fica em cache por 1 hora.'],
            ['POST /api/monitor', 'corpo {"domain","webhook?"}. Ativa a verificacao diaria e devolve o token para remover. Com webhook https, recebe um POST quando a nota cair. Vale por 90 dias.'],
            ['DELETE /api/monitor/:token', 'remove o monitoramento.'],
          ]}
        />

        <H2 id="exemplos">EXEMPLOS</H2>
        <Pre>{`curl -s ${API}/api/history/lojadojoao.com.br
curl -s ${API}/api/feed/lojadojoao.com.br`}</Pre>
        <P>Selo no rodape de um site:</P>
        <Pre>{`<img src="${API}/api/selo/meusite.com.br.svg" alt="verificado pelo skunkscan, nota A">`}</Pre>

        <H2 id="limites">LIMITES</H2>
        <P>
          Por IP e por hora: 5 varreduras, 5 pedidos de correcao, 5 cadastros de monitoramento e 20 perguntas a IA. Localhost e IPs internos (10.x, 172.16 a 31.x, 192.168.x, 169.254.x) sao recusados.
        </P>

        <H2>VEJA TAMBEM</H2>
        <P>
          <a href="#/como-funciona">como funciona</a>, <a href="#termos">termos de uso</a>, <a href="#privacidade">privacidade</a>
        </P>
      </div>
    </div>
  </main>
)
