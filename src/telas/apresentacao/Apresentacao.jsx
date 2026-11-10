// Apresentação de UMA unidade para reunião externa.
// Regra: nada de outras unidades aparece aqui (sem rankings, médias da rede, comparações ou links).
import { useMemo, useState } from 'react';
import { CONFIG } from '../../config';
import { anosDisponiveis, analisarItensUnidade, mesesDaJanela, mesesDoAno, mesesDoPeriodo, situacao, valor } from '../../utils/analise';
import { indicadores } from '../../utils/entregas';
import { corPct, inteiro, resumoIndicador, resumoUnidade } from '../../utils/producao';
import { brl, pct, plural, rotuloMes, rotuloPeriodo } from '../../utils/formatacao';
import Card from '../../components/comum/Card';
import StatCard from '../../components/comum/StatCard';
import BarrasLista from '../../components/comum/BarrasLista';
import GraficoMensal from '../../components/comum/GraficoMensal';
import { Seletor } from '../../components/layout/Shell';
import { Celula, Legenda } from '../Entregas';
import { CelulaMeta } from '../producao/UnidadeProducao';
import { Progresso } from '../../components/comum/Graficos';
import { contrato } from '../../utils/apresentacao';

export default function Apresentacao({ item, fin, prod }) {
  const abas = [
    item.fin && fin && { id: 'fin', nome: 'Financeiro' },
    item.prod.length > 0 && prod && { id: 'prod', nome: 'Produção' },
  ].filter(Boolean);
  const [aba, setAba] = useState(abas[0]?.id);

  if (!abas.length) return <div className="vazio-pagina">Não há dados desta unidade nas áreas liberadas para o seu perfil.</div>;

  return (
    <>
      <div className="apres-titulo">
        <h1>{item.nome}</h1>
        <p>{[item.tipo, item.cidade, item.oss && `OSS ${item.oss}`, item.fin && contrato(item.fin.aba) && `Contrato de gestão ${contrato(item.fin.aba)}`].filter(Boolean).join(' · ')}</p>
      </div>
      {abas.length > 1 && (
        <div className="segmentado apres-abas" role="tablist">
          {abas.map((a) => <button key={a.id} role="tab" aria-selected={aba === a.id} className={aba === a.id ? 'ativo' : ''} onClick={() => setAba(a.id)}>{a.nome}</button>)}
        </div>
      )}
      {aba === 'fin' && <Financeiro modelo={fin} u={item.fin} />}
      {aba === 'prod' && <Producao modelo={prod} unidades={item.prod} />}
    </>
  );
}

/* ---------- Financeiro da unidade ---------- */
function Financeiro({ modelo, u }) {
  const anos = anosDisponiveis(modelo).filter((a) => mesesDoAno(modelo, a).some((m) => u.v[m]));
  const [ano, setAno] = useState(anos[0] || '');
  const [periodo, setPeriodo] = useState('acum');
  const mesesAno = mesesDoAno(modelo, ano).filter((m) => u.v[m]);
  const meses = periodo === 'acum' ? mesesAno : mesesDoPeriodo(modelo, ano, periodo);
  const janela = periodo === 'acum' ? mesesAno : mesesDaJanela(modelo, ano, periodo).filter((m) => u.v[m]);
  const s = situacao(u, meses, janela);
  const an = useMemo(() => analisarItensUnidade(modelo, u, meses, janela), [modelo, u, meses, janela]);
  const descontos = modelo.descontos.filter((d) => d.aba === u.aba && d.comp.startsWith(ano) && (periodo === 'acum' || d.comp === periodo));
  const deducao = descontos.reduce((t, d) => t + d.valor, 0);
  const entrega = modelo.entregas.filter((e) => e.aba === u.aba).sort((a, b) => b.ano.localeCompare(a.ano)).find((e) => e.ano === ano) || null;
  const indEnt = entrega ? indicadores(Object.values(entrega.meses)) : null;
  const grupos = modelo.raizes.map((c) => ({ c, total: meses.reduce((t, m) => t + valor(u, m, c), 0) })).filter((g) => g.total > 0).sort((a, b) => b.total - a.total);

  return (
    <>
      <div className="apres-filtros">
        <Seletor rotulo="Ano" valor={ano} onChange={(v) => { setAno(v); setPeriodo('acum'); }} opcoes={anos.map((a) => [a, a])} />
        <Seletor rotulo="Período" valor={periodo} onChange={setPeriodo} opcoes={[['acum', 'Ano todo (acumulado)'], ...mesesAno.map((m) => [m, `Só ${rotuloMes(m)}`])]} />
        <span className="muted">{rotuloPeriodo(meses, periodo)}{modelo.atualizado && ` · dados atualizados em ${modelo.atualizado}`}</span>
      </div>

      <div className={`grade-stats-unidade ${deducao ? 'cinco' : ''}`}>
        <StatCard rotulo="Receitas" valor={brl(s.rec)} linhas={[['Média por mês', brl(meses.length ? s.rec / Math.max(1, s.mesesJanela || meses.length) : 0)]]} />
        <StatCard rotulo="Despesas" valor={brl(s.desp)} linhas={[['Média por mês', brl(meses.length ? s.desp / Math.max(1, s.mesesJanela || meses.length) : 0)]]} />
        <StatCard rotulo="Resultado" valor={brl(s.res)} cor={s.res < 0 ? 'var(--vermelho)' : 'var(--verde)'}
          linhas={[[s.res < 0 ? 'Déficit: despesas maiores que as receitas' : 'Superávit: despesas menores que as receitas', '']]} />
        {deducao > 0 && <StatCard rotulo="Com deduções" valor={brl(s.res - deducao)} cor={s.res - deducao < 0 ? 'var(--vermelho)' : 'var(--verde)'} linhas={[['Deduções no período', brl(deducao)]]} />}
        <StatCard rotulo="Meses em déficit" valor={`${s.mesesDef} de ${s.mesesJanela}`} cor={s.mesesDef ? 'var(--vermelho)' : 'var(--verde)'} linhas={[['Meses com prestação de contas', s.mesesJanela]]} />
      </div>

      <div className="grade-2 iguais">
        <Card titulo="Receitas × despesas por mês" sub="Passe o mouse para ver o valor exato.">
          <GraficoMensal altura={240} meses={janela} series={[
            { nome: 'Receitas', cor: '--acento-suave', valores: janela.map((m) => valor(u, m, 'REC')) },
            { nome: 'Despesas', cor: '--acento', valores: janela.map((m) => valor(u, m, 'DESP')) },
          ]} />
        </Card>
        <Card titulo="Resultado de cada mês" sub="Verde = superávit · vermelho = déficit.">
          <GraficoMensal altura={240} corPorSinal meses={janela} series={[{ nome: 'Resultado', valores: janela.map((m) => valor(u, m, 'RES')) }]} />
        </Card>
      </div>

      <div className="grade-2 iguais">
        <Card titulo="Despesas por grupo" sub="Quanto cada grupo de despesa pesa no total da unidade.">
          <BarrasLista linhas={grupos.map((g) => ({ chave: g.c, rotulo: `${g.c}. ${modelo.itens[g.c].n}`, valor: g.total, pct: s.desp ? g.total / s.desp : 0 }))} />
        </Card>
        <Card titulo="Maiores despesas" sub="Itens com maior valor no período.">
          <BarrasLista linhas={an.maioresDespesas.map((l) => ({ chave: l.c, rotulo: `${l.c} ${l.item.n}`, valor: l.total, pct: l.pct }))} />
        </Card>
      </div>

      {(descontos.length > 0 || entrega) && (
        <div className="grade-2 iguais">
          {descontos.length > 0 && (
            <Card titulo="Descontos e deduções" sub={`${plural(descontos.length, 'lançamento', 'lançamentos')} · total ${brl(deducao)}`}>
              <div className="rolagem">
                <table className="tabela">
                  <thead><tr><th>Competência</th><th>Classificação</th><th>Objeto</th><th className="num">Valor</th></tr></thead>
                  <tbody>
                    {descontos.map((d, i) => (
                      <tr key={i}><td>{rotuloMes(d.comp)}</td><td>{d.classificacao || '—'}</td><td>{d.objeto || '—'}</td><td className="num forte">{brl(d.valor)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {entrega && (
            <Card titulo="Entrega das prestações de contas" sub={indEnt.avaliadas ? `${indEnt.noPrazo} de ${indEnt.avaliadas} entregues no prazo (dia ${CONFIG.entregas.diaPrazo} do mês seguinte)` : 'Sem entregas avaliadas ainda.'}>
              <Legenda status={['prazo', 'limite', 'atraso', 'pendente', 'aberto']} />
              <div className="ent-linha">
                {Object.keys(entrega.meses).sort().map((c) => <div key={c}><small>{rotuloMes(c)}</small><Celula s={entrega.meses[c]} /></div>)}
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

/* ---------- Produção da unidade ---------- */
function Producao({ modelo, unidades }) {
  const [idSel, setIdSel] = useState(unidades[0].id);
  const u = unidades.find((x) => x.id === idSel) || unidades[0];
  const anos = modelo.anos.filter((a) => modelo.meses.some((m) => m.startsWith(a) && Object.values(u.dados).some((d) => d[m]?.prod !== null && d[m]?.prod !== undefined)));
  const [ano, setAno] = useState(anos[0] || modelo.anos[0]);
  const [periodo, setPeriodo] = useState('acum');
  const mesesAno = modelo.meses.filter((m) => m.startsWith(ano));
  const comps = periodo === 'acum' ? mesesAno : [periodo];
  const janela = periodo === 'acum' ? mesesAno : mesesAno.filter((m) => m <= periodo);
  const r = resumoUnidade(u, comps);
  const inds = [...r.inds].sort((a, b) => a.indicador.localeCompare(b.indicador, 'pt-BR'));
  const [indSel, setIndSel] = useState('');
  const sel = inds.find((i) => i.indicador === indSel) || r.inds[0];
  const serie = sel ? resumoIndicador(u, sel.indicador, janela) : null;

  return (
    <>
      <div className="apres-filtros">
        {unidades.length > 1 && <Seletor rotulo="Unidade" valor={u.id} onChange={setIdSel} opcoes={unidades.map((x) => [x.id, x.nome])} />}
        <Seletor rotulo="Ano" valor={ano} onChange={(v) => { setAno(v); setPeriodo('acum'); }} opcoes={(anos.length ? anos : modelo.anos).map((a) => [a, a])} />
        <Seletor rotulo="Período" valor={periodo} onChange={setPeriodo} opcoes={[['acum', 'Ano todo (acumulado)'], ...mesesAno.map((m) => [m, `Só ${rotuloMes(m)}`])]} />
        <span className="muted">{rotuloPeriodo(comps, periodo)}</span>
      </div>

      {!r.avaliados ? <div className="vazio-pagina">Sem produção informada neste período.</div> : (
        <>
          <div className="grade-stats-unidade tres">
            <StatCard rotulo="Metas cumpridas" valor={pct(r.pctMetas, 0)} cor={corPct(r.pctMetas === 1 ? 1 : r.pctMetas >= 0.7 ? 0.9 : 0)} linhas={[['Metas mensais cumpridas', `${r.cumpridos} de ${r.avaliados}`]]} />
            <StatCard rotulo="Indicadores na meta" valor={`${r.inds.length - r.naoCumpridos.length} de ${r.inds.length}`} cor="var(--verde)" linhas={[['No acumulado do período', '']]} />
            <StatCard rotulo="Indicadores abaixo da meta" valor={r.naoCumpridos.length} cor={r.naoCumpridos.length ? 'var(--vermelho)' : 'var(--verde)'} linhas={[['No acumulado do período', '']]} />
          </div>

          <div className="grade-2">
            <Card titulo="Indicadores" sub="Meta e produção somadas no período. Clique num indicador para ver mês a mês.">
              <div className="rolagem">
                <table className="tabela">
                  <thead><tr><th>Indicador</th><th className="num">Meta</th><th className="num">Produção</th><th className="num">% da meta</th><th className="centro">Meses na meta</th></tr></thead>
                  <tbody>
                    {inds.map((i) => (
                      <tr key={i.indicador} className={`clicavel ${sel?.indicador === i.indicador ? 'linha-sel' : ''}`} onClick={() => setIndSel(i.indicador)}>
                        <td>{i.indicador}</td>
                        <td className="num">{inteiro(i.meta)}</td>
                        <td className="num forte">{inteiro(i.prod)}</td>
                        <td className="num"><div className="pct-barra"><b style={{ color: corPct(i.pct) }}>{i.pct === null ? '—' : pct(i.pct, 0)}</b><Progresso valor={Math.min(1, i.pct ?? 0)} cor={corPct(i.pct)} /></div></td>
                        <td className="centro">{i.avaliados ? `${i.cumpridos} de ${i.avaliados}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            {sel && (
              <Card titulo={sel.indicador} sub="Meta e produção de cada mês.">
                <GraficoMensal altura={280} meses={janela} formato={inteiro} eixo={(v) => v.toLocaleString('pt-BR')} series={[
                  { nome: 'Meta', cor: '--acento-suave', valores: serie.serie.map((x) => x?.meta ?? null) },
                  { nome: 'Produção', cor: '--acento', valores: serie.serie.map((x) => x?.prod ?? null) },
                ]} />
              </Card>
            )}
          </div>

          <Card titulo="Mês a mês" sub="Percentual da meta em cada mês. Verde = cumpriu · amarelo = 80% a 99% · vermelho = abaixo de 80%.">
            <div className="rolagem">
              <table className="tabela tabela-entregas">
                <thead><tr><th>Indicador</th>{janela.map((c) => <th key={c} className="centro">{rotuloMes(c)}</th>)}</tr></thead>
                <tbody>
                  {inds.map((i) => (
                    <tr key={i.indicador}><td>{i.indicador}</td>{janela.map((c) => <td key={c} className="centro"><CelulaMeta r={u.dados[i.indicador]?.[c]} /></td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
