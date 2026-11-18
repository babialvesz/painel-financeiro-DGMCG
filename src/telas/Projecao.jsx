// Aba Projeção: projeção de repasses às OSS e situação dos pagamentos
// (planilha "Projeção + Fluxo de pagamento OSS", aba Consolidado → aba PROJECAO da base unificada)
import { Fragment, useMemo, useState } from 'react';
import { usePainel } from '../contexto/PainelContexto';
import { link, navegar } from '../hooks/useRota';
import { brl, nomeCurto, pct, rotuloMes } from '../utils/formatacao';
import { agrupar, competencias, mesLongo, pctPago, resumir, SEMANAS, semanaDe } from '../utils/projecao';
import { situacaoParcela } from '../services/projecao';
import { TabelaParcelas } from './unidade/ProjecaoUnidade';
import Icone from '../components/comum/Icone';
import '../styles/despesas.css';
import '../styles/projecao.css';

const SITUACOES = [['', 'Todas'], ['paga', 'Pagas'], ['apagar', 'A pagar'], ['risco', 'Em risco'], ['pendente', 'Com pendência']];
const SEM = '__sem';

export default function Projecao({ query = {} }) {
  const { modelo } = usePainel();
  const todas = modelo.projecao || [];
  const ir = (mudar) => navegar(link('projecao', { u: query.u, c: query.c, s: query.s, ...mudar }));
  const [aberta, setAberta] = useState(null);

  const comps = useMemo(() => competencias(todas), [todas]);
  const unidadesProj = useMemo(() => {
    const m = agrupar(todas.filter((l) => l.aba), 'aba');
    return [...m.keys()].map((a) => ({ aba: a, nome: nomeCurto(modelo.porAba[a]?.nome || a) })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [todas, modelo]);
  const semVinculo = useMemo(() => [...new Set(todas.filter((l) => !l.aba).map((l) => l.unidade))].sort(), [todas]);

  const filtradas = todas.filter((l) => (!query.c || l.comp === query.c)
    && (!query.u || (query.u === SEM ? !l.aba : l.aba === query.u))
    && (!query.s || situacaoParcela(l).id === query.s));
  const r = resumir(filtradas);
  const p = pctPago(r);

  if (!modelo.projecaoLigada) {
    return (
      <div className="dpi">
        <div className="titulo-pagina"><div><h1>Projeção de repasses</h1></div></div>
        <div className="card aviso-proj">
          <b>A projeção ainda não está ligada ao painel.</b>
          <p>Para ligar, crie na base unificada uma aba chamada <b>PROJECAO</b> e, na célula A1, cole a fórmula que trazemos da planilha “Projeção + Fluxo de pagamento OSS 2026” (aba Consolidado).</p>
          {modelo.projecaoErro && <small>{modelo.projecaoErro}</small>}
        </div>
      </div>
    );
  }

  // % pago por competência × semana
  const porComp = agrupar(todas.filter((l) => (!query.u || (query.u === SEM ? !l.aba : l.aba === query.u))), 'comp');
  const semanas = SEMANAS.filter((s) => todas.some((l) => semanaDe(l) === s));
  // por unidade
  const porUnidade = [...agrupar(filtradas, (l) => l.aba || SEM).entries()]
    .map(([a, ls]) => ({ a, ls, r: resumir(ls), nome: a === SEM ? 'Sem unidade no painel' : nomeCurto(modelo.porAba[a]?.nome || a), tipo: a === SEM ? '' : modelo.porAba[a]?.grupo }))
    .sort((x, y) => (x.a === SEM) - (y.a === SEM) || y.r.aPagar - x.r.aPagar || y.r.liquido - x.r.liquido);

  return (
    <div className="dpi pagina-projecao">
      <div className="titulo-pagina">
        <div>
          <h1>Projeção de repasses</h1>
          <p className="sub">Quanto a SES projetou repassar a cada unidade, por competência, e o que já foi pago (com ordem bancária). Fonte: planilha “Projeção + Fluxo de pagamento OSS 2026”. Os filtros do topo não se aplicam aqui: use os filtros abaixo.</p>
        </div>
      </div>

      <div className="card filtros-card">
        <div className="filtros-extra" style={{ borderTop: 'none', paddingTop: 0 }}>
          <div><label className="rotulo" htmlFor="f-comp">Competência</label>
            <div className="sel-desp"><select id="f-comp" value={query.c || ''} onChange={(e) => ir({ c: e.target.value })}>
              <option value="">Todas as competências</option>
              {comps.map((c) => <option key={c} value={c}>{mesLongo(c)}</option>)}
            </select></div></div>
          <div><label className="rotulo" htmlFor="f-un">Unidade</label>
            <div className="sel-desp"><select id="f-un" value={query.u || ''} onChange={(e) => ir({ u: e.target.value })}>
              <option value="">Todas as unidades</option>
              {unidadesProj.map((u) => <option key={u.aba} value={u.aba}>{u.nome}</option>)}
              {semVinculo.length > 0 && <option value={SEM}>Sem unidade no painel ({semVinculo.length})</option>}
            </select></div></div>
        </div>
        <div><span className="rotulo" id="lb-sit">Situação da parcela</span>
          <div className="pilulas" role="group" aria-labelledby="lb-sit">
            {SITUACOES.map(([v, n]) => <button key={n} type="button" className="pilula" aria-pressed={(query.s || '') === v} onClick={() => ir({ s: v })}>{n}</button>)}
          </div></div>
      </div>

      <div className="cartoes-proj grandes">
        <div><span>Projeção após descontos</span><b>{brl(r.liquido)}</b><small>{r.n} {r.n === 1 ? 'parcela' : 'parcelas'}{r.descontos ? ` · ${brl(r.descontos)} em descontos` : ''}</small></div>
        <div className="pos"><span>Pago</span><b>{brl(r.pago)}</b><small>{p === null ? '' : `${pct(p)} da projeção`}</small></div>
        <div><span>A pagar</span><b>{brl(r.aPagar)}</b><small>parcelas sem ordem bancária</small></div>
        <div className={r.risco ? 'neg' : ''}><span>Em risco</span><b>{brl(r.risco)}</b><small>semana marcada como RISCO</small></div>
      </div>

      {!query.c && (
        <section className="card">
          <h2>Pagamento por competência e semana</h2>
          <p className="frase">Quanto da projeção de cada competência já foi pago, em cada semana de pagamento.{query.u ? ' Só a unidade escolhida.' : ''}</p>
          <div className="matriz-wrap" style={{ marginTop: 12 }}>
            <table className="tabela-parcelas semanas">
              <caption className="sr">Percentual pago por competência e semana</caption>
              <thead><tr><th scope="col">Competência</th>{semanas.map((s) => <th key={s} scope="col">{s === 'RISCO' ? 'Risco' : s}</th>)}<th scope="col">Total</th></tr></thead>
              <tbody>
                {comps.filter((c) => porComp.has(c)).map((c) => {
                  const ls = porComp.get(c); const rt = resumir(ls); const porSem = agrupar(ls, semanaDe);
                  const cel = (rs) => { if (!rs.liquido) return <td className="vazia">—</td>; const q = pctPago(rs); return <td className={`pct ${q >= 0.999 ? 'tudo' : q === 0 ? 'nada' : 'parte'}`}><b>{pct(q, 0)}</b><small>de {brl(rs.liquido)}</small></td>; };
                  return (
                    <tr key={c}><th scope="row"><button type="button" className="link-dpi" onClick={() => ir({ c })}>{rotuloMes(c)}</button></th>
                      {semanas.map((s) => <Fragment key={s}>{cel(porSem.get(s) ? resumir(porSem.get(s)) : { liquido: 0 })}</Fragment>)}
                      {cel(rt)}</tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="nota">Verde = tudo pago · âmbar = parte paga · cinza = nada pago ainda. Clique numa competência para ver só ela.</p>
        </section>
      )}

      <section className="card">
        <div className="cab-resultado"><h2>{query.u && query.u !== SEM ? 'Parcelas da unidade' : 'Por unidade'}</h2>
          {(query.u || query.c || query.s) && <button type="button" className="link-dpi" onClick={() => navegar(link('projecao'))}>Limpar filtros</button>}</div>
        {!filtradas.length ? <p>Nenhuma parcela com esses filtros.</p> : query.u && query.u !== SEM ? (
          <>
            <p className="frase" style={{ margin: '0 0 12px' }}><a className="link-dpi" href={link('unidade', query.u, { proj: '1' })}>Comparar com a prestação de contas da unidade →</a></p>
            {[...agrupar(filtradas, 'comp').entries()].sort().map(([c, ls]) => (
              <details key={c} className="mes-proj" open={Boolean(query.c)}>
                <summary><span>{mesLongo(c)}</span><span className="resumo-mes"><b>{brl(resumir(ls).liquido)}</b> · {resumir(ls).aPagar ? `${brl(resumir(ls).aPagar)} a pagar` : 'tudo pago'}</span></summary>
                <TabelaParcelas parcelas={ls} />
              </details>
            ))}
          </>
        ) : (
          <ul className="lista-proj">
            {porUnidade.map((x) => {
              const q = pctPago(x.r); const ab = aberta === x.a;
              return (
                <li key={x.a} className={ab ? 'aberta' : ''}>
                  <div className="linha-proj">
                    <div className="nome"><b>{x.nome}</b><small>{[x.tipo, `${x.r.n} ${x.r.n === 1 ? 'parcela' : 'parcelas'}`, x.r.pendencias ? `${x.r.pendencias} com pendência` : ''].filter(Boolean).join(' · ')}</small></div>
                    <div className="barra-pago" aria-hidden="true"><span style={{ width: `${(q || 0) * 100}%` }} /></div>
                    <div className="valores"><b>{brl(x.r.liquido)}</b><small>{q === null ? '' : `${pct(q, 0)} pago`}{x.r.aPagar ? ` · ${brl(x.r.aPagar)} a pagar` : ''}</small></div>
                    <div className="acoes">
                      <button type="button" className="bt-detalhar" aria-expanded={ab} onClick={() => setAberta(ab ? null : x.a)}>{ab ? 'Fechar ▴' : 'Parcelas ▾'}</button>
                      {x.a !== SEM && <a className="bt-detalhar" href={link('unidade', x.a, { proj: '1' })} aria-label={`Comparar ${x.nome} com a prestação de contas`}>Comparar <Icone nome="seta" tamanho={14} /></a>}
                    </div>
                  </div>
                  {ab && <div className="detalhe-linha"><TabelaParcelas parcelas={x.ls} mostrarUnidade={x.a === SEM} /></div>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {semVinculo.length > 0 && (
        <p className="nota">Na planilha de projeção, {semVinculo.length === 1 ? 'este item não corresponde' : 'estes itens não correspondem'} a nenhuma unidade do painel: {semVinculo.join('; ')}. Para ligar uma unidade, use a aba Vínculos da base unificada (tipo “Projeção”, código da unidade → aba no painel).</p>
      )}
    </div>
  );
}

