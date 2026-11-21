import { CHIPS, FEATURES } from '../data/commands'
import { Lock, PixelTitle, Sky, Walker } from '../components/Pixel'
import { ago } from '../lib/format'
import { go } from '../lib/router'
import { Terminal } from '../terminal/Terminal'
import type { Terminal as TerminalApi } from '../terminal/useTerminal'

const Heading = ({ children }: { children: React.ReactNode }) => <div className="mb-1 font-bold text-bright">{children}</div>

export const Home = ({ term }: { term: TerminalApi }) => {
  const runChip = (cmd: string) => {
    if (location.hash !== '' && location.hash !== '#/') go('#/')
    term.run(cmd)
  }

  return (
    <main className="px-[clamp(20px,4vw,64px)]">
      <div className="flex flex-col gap-10 pt-10 pb-8">
        <div className="flex flex-wrap items-center gap-8">
          <PixelTitle />
          <Sky />
        </div>

        <div className="relative flex flex-wrap border border-dashed border-soft">
          <div className="absolute -top-3 left-5 bg-bg px-2.5 text-bright">
            SkunkScan <span className="text-mute">v0.1</span>
          </div>
          <div className="flex flex-[1_1_340px] flex-col items-center justify-center gap-[26px] px-6 pt-10 pb-8 text-center">
            <div className="text-bright">Bem-vindo ao SkunkScan.</div>
            <Lock />
            <div className="flex flex-col gap-0.5 text-sm text-mute">
              <span>auditoria passiva de seguranca</span>
              <span>~/crypto-skunks/hackbrasil-2026</span>
            </div>
          </div>
          <div className="flex flex-[1_1_420px] flex-col border-l border-dashed border-soft">
            <div className="flex flex-col gap-0.5 border-b border-dashed border-soft px-[22px] py-[18px]">
              <Heading>Ultimas varreduras</Heading>
              <div>
                {term.history.length === 0 && <div className="text-mute">nenhuma ainda. use /scan seusite.com.br</div>}
                {term.history.slice(0, 3).map((h) => (
                  <div key={h.domain} className="flex gap-[18px]">
                    <span className="w-16 text-mute">{ago(h.at)}</span>
                    <span>{h.domain}</span>
                    <span className="ml-auto font-bold">{h.grade}</span>
                  </div>
                ))}
              </div>
              <div className="text-mute">... /historico para mais</div>
            </div>
            <div className="flex flex-col gap-0.5 px-[22px] py-[18px]">
              <Heading>Novidades</Heading>
              <div>
                <a href="#/radar" className="no-underline">
                  /radar
                </a>{' '}
                mostra o mapa de seguranca do brasil
              </div>
              <div>/perguntar tira duvidas com a ia</div>
              <div>
                <a href="#/mapa" className="no-underline">
                  /mapa
                </a>{' '}
                desenha a superficie de ataque
              </div>
              <div className="text-mute">... /ajuda para mais</div>
            </div>
          </div>
        </div>

        <Walker />

        <Terminal term={term} />

        <div className="flex flex-col gap-3">
          <div className="text-xs text-mute">experimente:</div>
          <div className="flex flex-wrap gap-2.5">
            {CHIPS.map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => runChip(cmd)}
                className="min-h-11 cursor-pointer border border-dashed border-dash bg-transparent px-3.5 text-[13px] text-body hover:border-bright hover:text-white"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-14 flex flex-wrap items-start gap-8" aria-label="Linha de comando">
        <div className="flex flex-[1_1_300px] flex-col gap-3">
          <Heading>{'// tambem no seu terminal'}</Heading>
          <div className="text-sm text-mute">
            A mesma varredura, sem instalar nada. Da para usar no ci e travar o deploy se a nota cair. <a href="#/docs">ver documentacao</a>
          </div>
          <div className="bg-well px-3.5 py-2.5 text-sm text-bright">npx skunkscan seusite.com.br</div>
        </div>
        <pre className="m-0 min-w-0 flex-[2_1_480px] overflow-x-auto border border-edge bg-deep px-[18px] py-4 text-[13px]">
          {'$ npx skunkscan lojadojoao.com.br --min-grade B\n\n  skunkscan v0.1\n\n  '}
          <span className="font-bold">[ ok ]</span>
          {' https ativo\n  '}
          <span className="font-bold">[ ok ]</span>
          {' certificado valido ate 03/2027\n  '}
          <span className="font-bold underline">[ !! ]</span>
          {' dmarc ausente\n  '}
          <span className="bg-bright font-bold text-ink">[fail]</span>
          {' nginx/1.18.0 exposto, 2 cves\n  '}
          <span className="bg-bright font-bold text-ink">[fail]</span>
          {' 3 subdominios expostos\n\n  nota D   (minima exigida: B)\n'}
          <span className="text-mute">{'  processo encerrado com codigo 1'}</span>
        </pre>
      </section>

      <section className="mt-14" aria-label="Funcionalidades">
        <Heading>{'// o que o skunkscan faz'}</Heading>
        <div className="mt-5 grid grid-cols-1 border-t border-l border-dashed border-line min-[520px]:grid-cols-2 min-[1000px]:grid-cols-4">
          {FEATURES.map(([title, desc, cmd], i) => (
            <div key={title} className="flex flex-col gap-2 border-r border-b border-dashed border-line p-5">
              <div className="flex justify-between gap-3">
                <b className="text-bright">{title}</b>
                <span className="text-mute">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="text-[13px] text-mute">{desc}</div>
              <div className="text-[13px]">{cmd}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
