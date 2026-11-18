// Painel lateral: repasse informado pela unidade (prestação de contas) × projeção de repasse da SES
import { useEffect, useMemo, useRef } from 'react';
import { usePainel } from '../../contexto/PainelContexto';
import { link } from '../../hooks/useRota';
import { brl, nomeCurto, pct, rotuloMes } from '../../utils/formatacao';
import { comparacaoUnidade, mesLongo, resumir } from '../../utils/projecao';
import { situacaoParcela } from '../../services/projecao';
import GraficoMensal from '../../components/comum/GraficoMensal';
import Icone from '../../components/comum/Icone';
import '../../styles/despesas.css';
import '../../styles/projecao.css';

export function SeloParcela({ l }) {
  const s = situacaoParcela(l);
  const icone = { paga: '✓', risco: '▲', pendente: '!', apagar: '◷' }[s.id];
  return <span className={`selo-parcela ${s.id}`}><span aria-hidden="true">{icone}</span> {s.nome}</span>;
}

export function TabelaParcelas({ parcelas, mostrarUnidade = false }) {
  return (
    <div className="matriz-wrap">
      <table className="tabela-parcelas">
        <thead><tr>
          {mostrarUnidade && <th scope="col">Unidade</th>}
          <th scope="col">Parcela</th><th scope="col" className="num">Valor</th><th scope="col">Semana</th><th scope="col">Situação</th><th scope="col">O.B. / pendência</th>
        </tr></thead>
        <tbody>
          {parcelas.map((l, i) => (
            <tr key={i}>
              {mostrarUnidade && <td>{l.aba ? nomeCurto(l.nome) : l.unidade}</td>}
              <td><b>{l.objeto || '—'}</b><small>Fonte {l.fonte || '—'}{l.descontos ? ` · desconto de ${brl(l.descontos)}` : ''}</small></td>
              <td className="num"><b>{brl(l.liquido)}</b>{l.descontos > 0 && <small>projeção {brl(l.projecao)}</small>}</td>
              <td>{l.semana || '—'}</td>
              <td><SeloParcela l={l} /></td>
              <td className="ob">{l.ob || l.pendencia || '—'}{l.sei && <small>SEI {l.sei}</small>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProjecaoUnidade({ u, onFechar }) {
  const { modelo, meses } = usePainel();
  const fechar = useRef(null);
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFechar();
    document.addEventListener('keydown', esc);
    document.body.classList.add('sem-rolagem');
    fechar.current?.focus();
    return () => { document.removeEventListener('keydown', esc); document.body.classList.remove('sem-rolagem'); };
  }, [onFechar]);

  const parcelas = useMemo(() => (modelo.projecao || []).filter((l) => l.aba === u.aba), [modelo, u]);
  const ano = meses[0]?.slice(0, 4);
  const linhas = useMemo(() => comparacaoUnidade(u, parcelas.filter((l) => !ano || l.comp.startsWith(ano)), modelo.meses.filter((m) => !ano || m.startsWith(ano))), [u, parcelas, modelo, ano]);
  const comPcf = linhas.filter((l) => l.temPcf && l.parcelas.length);
  const rTodos = resumir(linhas.flatMap((l) => l.parcelas));
  const repPcf = comPcf.reduce((a, l) => a + l.rep, 0), projPcf = comPcf.reduce((a, l) => a + l.liquido, 0);
  const comGrafico = linhas.filter((l) => l.parcelas.length || l.temPcf);

  return (
    <div className="gaveta-fundo" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <aside className="gaveta gaveta-projecao dpi" role="dialog" aria-modal="true" aria-labelledby="titulo-projecao">
        <div className="gaveta-topo">
          <div>
            <span className="gaveta-sobre">Repasse × projeção</span>
            <h2 id="titulo-projecao">{nomeCurto(u.nome)}</h2>
            <p className="frase">Compara o repasse que a unidade informou na prestação de contas com o que a SES projetou pagar para cada competência.</p>
          </div>
          <button ref={fechar} type="button" className="bt-fechar" onClick={onFechar} aria-label="Fechar painel"><Icone nome="fechar" tamanho={20} /></button>
        </div>

        {!modelo.projecaoLigada ? (
          <div className="aviso-proj"><b>A projeção ainda não está ligada ao painel.</b> Falta a aba PROJECAO na base unificada.{modelo.projecaoErro && <small>{modelo.projecaoErro}</small>}</div>
        ) : !parcelas.length ? (
          <div className="aviso-proj"><b>Esta unidade não aparece na planilha de projeção.</b> Se ela estiver lá com outro nome, ligue as duas na aba Vínculos da base unificada (tipo “Projeção”).</div>
        ) : (
          <>
            <div className="cartoes-proj">
              <div><span>Repasse informado</span><b>{brl(repPcf)}</b><small>{comPcf.length} {comPcf.length === 1 ? 'competência' : 'competências'} com prestação de contas</small></div>
              <div><span>Projeção da SES</span><b>{brl(projPcf)}</b><small>mesmas competências, após descontos</small></div>
              <div className={repPcf - projPcf < 0 ? 'neg' : ''}><span>Diferença</span><b>{brl(repPcf - projPcf)}</b><small>{projPcf ? `${pct((repPcf - projPcf) / projPcf)} da projeção` : ''}</small></div>
              <div><span>A pagar (todas)</span><b>{brl(rTodos.aPagar)}</b><small>{rTodos.liquido ? `${pct(rTodos.pago / rTodos.liquido)} já pago` : ''}{rTodos.risco ? ` · ${brl(rTodos.risco)} em risco` : ''}</small></div>
            </div>

            <h3>Mês a mês</h3>
            <GraficoMensal altura={210} meses={comGrafico.map((l) => l.comp)} rotulo="Repasse informado e projeção por competência"
              series={[
                { nome: 'Repasse informado', cor: '--acento-suave', valores: comGrafico.map((l) => l.rep ?? 0) },
                { nome: 'Projeção da SES', cor: '--acento', valores: comGrafico.map((l) => l.liquido) },
              ]} />

            <div className="matriz-wrap" style={{ marginTop: 14 }}>
              <table className="tabela-parcelas comparacao">
                <caption className="sr">Repasse informado × projeção por competência</caption>
                <thead><tr><th scope="col">Competência</th><th scope="col" className="num">Repasse informado</th><th scope="col" className="num">Projeção</th><th scope="col" className="num">Diferença</th><th scope="col" className="num">Pago</th><th scope="col" className="num">A pagar</th></tr></thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.comp}>
                      <th scope="row">{rotuloMes(l.comp)}</th>
                      <td className="num">{l.temPcf ? brl(l.rep) : <span className="muted">ainda não enviou</span>}</td>
                      <td className="num">{l.parcelas.length ? brl(l.liquido) : <span className="muted">sem projeção</span>}</td>
                      <td className={`num ${l.dif < 0 ? 'neg' : ''}`}>{l.dif === null ? '—' : brl(l.dif)}</td>
                      <td className="num">{l.parcelas.length ? brl(l.pago) : '—'}</td>
                      <td className="num">{l.parcelas.length ? brl(l.aPagar) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="nota">Repasse informado = “Total de repasses” da prestação de contas. Projeção = valor após descontos na planilha de projeção. Pago = parcelas com ordem bancária (O.B.).</p>

            <h3>Detalhamento das parcelas</h3>
            {linhas.filter((l) => l.parcelas.length).map((l) => (
              <details key={l.comp} className="mes-proj">
                <summary><span>{mesLongo(l.comp)}</span><span className="resumo-mes"><b>{brl(l.liquido)}</b> · {l.parcelas.length} {l.parcelas.length === 1 ? 'parcela' : 'parcelas'}{l.aPagar ? ` · ${brl(l.aPagar)} a pagar` : ' · tudo pago'}</span></summary>
                <TabelaParcelas parcelas={l.parcelas} />
              </details>
            ))}
          </>
        )}

        <a className="bt-contorno bt-ir-proj" href={link('projecao', { u: u.aba })} onClick={onFechar}>Abrir na aba Projeção <Icone nome="seta" tamanho={16} /></a>
      </aside>
    </div>
  );
}
