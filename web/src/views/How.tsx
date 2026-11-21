import { CHECKS } from '../data/commands'

const FLOW = `  voce
   |
   |  /scan lojadojoao.com.br
   v
+----------------------------------------------------------------------+
|                  coletores, rodando em paralelo                      |
+----------------------------------------------------------------------+
   |              |                |               |               |
   v              v                v               v               v
 tls e         dns              certificate     osv / nvd       rdap
 headers       spf, dkim,       transparency    cves da         dominios
               dmarc            subdominios     versao          parecidos
   |              |                |               |               |
   +--------------+-------+--------+---------------+---------------+
                          |
                          v
                 motor de nota (A a D)
                          |
                          v
              ia escreve as correcoes
                          |
          +---------------+---------------+---------------+
          v               v               v               v
      terminal        relatorio        link /r/        selo e
      ao vivo         em pdf           publico         monitoramento`

const GRADES: [string, string][] = [
  ['A', 'nenhum problema grave e no maximo 1 medio'],
  ['B', 'nenhum grave e ate 3 medios'],
  ['C', '1 grave, ou mais de 3 medios'],
  ['D', '2 ou mais graves, ou https quebrado'],
]

const NEVER = ['varredura de portas', 'tentativa de login ou de quebrar senha', 'envio de payload, injecao ou qualquer teste de invasao', 'acesso a areas que exigem autenticacao', 'analise de localhost ou ips internos']

export const How = () => (
  <main className="px-[clamp(20px,4vw,64px)]">
    <div className="flex flex-col gap-1.5 pt-10">
      <h1 className="m-0 text-[28px] tracking-[-0.01em] text-bright">Como funciona</h1>
      <p className="m-0 max-w-[760px] text-mute">O SkunkScan olha o seu site do jeito que um atacante olharia, mas sem encostar em nada. Ele so le informacao que ja e publica.</p>
    </div>

    <pre className="mt-7 overflow-x-auto border border-edge bg-deep px-6 py-5 text-[13px] leading-[1.35] text-body">{FLOW}</pre>

    <div className="mt-9 border-t border-dashed border-line">
      {CHECKS.map(([title, desc, source], i) => (
        <div key={title} className="flex flex-wrap gap-x-8 gap-y-3 border-b border-dashed border-line py-[22px]">
          <div className="flex-[0_0_40px] font-bold text-faint">{String(i + 1).padStart(2, '0')}</div>
          <div className="flex-[1_1_220px] font-bold text-bright">{title}</div>
          <div className="flex flex-[3_1_420px] flex-col gap-1.5 text-sm text-soft">
            <span>{desc}</span>
            <span className="text-xs text-mute">{source}</span>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-10 flex flex-wrap gap-10 pb-8">
      <div className="min-w-0 flex-[1_1_380px]">
        <div className="mb-1 font-bold text-bright">Como a nota e calculada</div>
        <table className="mt-2 w-full border-collapse text-sm">
          <tbody>
            {GRADES.map(([g, rule]) => (
              <tr key={g}>
                <td className="w-12 border-b border-dashed border-edge px-2.5 py-2 align-top font-extrabold text-bright">{g}</td>
                <td className="border-b border-dashed border-edge px-2.5 py-2 align-top">{rule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="min-w-0 flex-[1_1_380px]">
        <div className="mb-1 font-bold text-bright">O que o SkunkScan nunca faz</div>
        <ul className="mt-2 pl-5 text-soft">
          {NEVER.map((n) => (
            <li key={n} className="my-1">
              {n}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </main>
)
