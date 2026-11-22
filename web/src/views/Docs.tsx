import type { ReactNode } from 'react'

const TOC: [id: string, label: string][] = [
  ['nome', 'NOME'],
  ['sinopse', 'SINOPSE'],
  ['opcoes', 'OPCOES'],
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
      <p className="m-0 max-w-[760px] text-mute">Documentacao da linha de comando e da API.</p>
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
        <Pre>npx skunkscan &lt;dominio&gt; [--json] [--min-grade A|B|C|D] [--sem-cor] [--timeout segundos]</Pre>
        <P>Le apenas informacoes publicas do dominio: certificado, headers, dns, registros de Certificate Transparency, bases de CVE e registros de dominios. Nao faz teste de invasao.</P>

        <H2 id="opcoes">OPCOES</H2>
        <Dl
          items={[
            ['--json', 'imprime o resultado em JSON, sem animacao. Bom para ci e scripts.'],
            ['--min-grade <nota>', 'encerra com codigo 1 se a nota for menor que a informada.'],
            ['--sem-cor', 'desliga as cores e os efeitos do terminal.'],
            ['--timeout <segundos>', 'tempo maximo da varredura. Padrao: 30.'],
          ]}
        />

        <H2 id="saida">CODIGOS DE SAIDA</H2>
        <Dl
          items={[
            ['0', 'nota igual ou acima da minima'],
            ['1', 'nota abaixo da minima'],
            ['2', 'erro: dominio invalido ou fora do ar'],
            ['3', 'limite de varreduras atingido'],
          ]}
        />

        <H2 id="api">API</H2>
        <Dl items={[['POST /api/scan', 'inicia uma varredura. Responde em text/event-stream, uma linha por checagem concluida.']]} />
        <Pre>{`curl -N -X POST https://skunkscan.app/api/scan \\
  -H "content-type: application/json" \\
  -d '{"dominio":"lojadojoao.com.br"}'

event: linha
data: {"etapa":1,"status":"ok","texto":"https ativo"}

event: fim
data: {"id":"8f2k1a","nota":"D","graves":3,"medios":3}`}</Pre>
        <Dl
          items={[
            ['GET /api/r/:id', 'resultado completo de uma varredura compartilhada.'],
            ['GET /api/selo/:dominio.svg', 'selo do site em SVG. So existe enquanto a varredura mais recente (ate 30 dias) tiver nota A; fora disso responde 404 e a imagem some. A resposta fica em cache por 1 hora.'],
            ['POST /api/monitor', 'corpo {"domain","webhook?"}. Ativa a verificacao diaria e devolve o token para remover. Com webhook https, recebe um POST quando a nota cair. Vale por 90 dias.'],
            ['DELETE /api/monitor/:token', 'remove o monitoramento.'],
            ['GET /api/feed/:dominio', 'feed Atom com as ultimas varreduras do dominio: nota, contagens e data.'],
            ['POST /api/perguntar', 'corpo {"pergunta","id?"}. Resposta da ia, usando o resultado da varredura como contexto quando o id e enviado.'],
          ]}
        />

        <H2 id="exemplos">EXEMPLOS</H2>
        <Pre>{`npx skunkscan lojadojoao.com.br
npx skunkscan lojadojoao.com.br --json > resultado.json
npx skunkscan lojadojoao.com.br --min-grade B   # trava o ci se cair abaixo de B`}</Pre>
        <P>No GitHub Actions, com a Action do SkunkScan (o job falha se a nota ficar abaixo da minima):</P>
        <Pre>{`- uses: Pedroaruana/Skunk-Scan@main
  with:
    domain: meusite.com.br
    min-grade: B`}</Pre>

        <H2 id="limites">LIMITES</H2>
        <P>5 varreduras por hora por IP. Localhost e IPs internos (10.x, 172.16 a 31.x, 192.168.x, 169.254.x) sao recusados.</P>

        <H2>VEJA TAMBEM</H2>
        <P>
          <a href="#/como-funciona">como funciona</a>, <a href="#termos">termos de uso</a>, <a href="#privacidade">privacidade</a>
        </P>
      </div>
    </div>
  </main>
)
