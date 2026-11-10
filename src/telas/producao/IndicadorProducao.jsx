import { useMemo } from 'react';
import { useProducao } from '../../contexto/ProducaoContexto';
import { link } from '../../hooks/useRota';
import { corPct, inteiro, porIndicador } from '../../utils/producao';
import { pct, plural, rotuloMes, rotuloPeriodo } from '../../utils/formatacao';
import Card from '../../components/comum/Card';
import StatCard from '../../components/comum/StatCard';
import BarrasLista from '../../components/comum/BarrasLista';
import Trilha from '../../components/layout/Trilha';
import { CelulaMeta } from './UnidadeProducao';

export default function IndicadorProducao({ nome }) {
  const { unidades, comps, janela, filtro } = useProducao();
  const x = useMemo(() => porIndicador(unidades, comps).find((i) => i.indicador === nome), [unidades, comps, nome]);
  if (!x) return <div className="vazio-pagina">Sem dados de “{nome}” em {rotuloPeriodo(comps, filtro.periodo)}. <a href={link('producao', 'indicadores')}>Voltar para indicadores</a></div>;
  const ranking = [...x.unidades].sort((a, b) => b.pct - a.pct);
  const max = Math.max(1, ...ranking.map((r) => r.pct));

  return (
    <>
      <Trilha passos={[{ nome: 'Indicadores', href: link('producao', 'indicadores') }, { nome }]} />
      <div className="titulo-pagina">
        <div>
          <h1>{nome}</h1>
          <p className="sub">{rotuloPeriodo(comps, filtro.periodo)} · {plural(x.unidades.length, 'unidade tem', 'unidades têm')} meta neste indicador · cada uma comparada com a própria meta</p>
        </div>
      </div>

      <div className="grade-stats-unidade tres">
        <StatCard rotulo="Metas mensais cumpridas" valor={pct(x.pctMetas, 0)} cor={corPct(x.pctMetas)} linhas={[['Cumpridas', `${x.cumpridos} de ${x.avaliados}`]]} />
        <StatCard rotulo="Unidades abaixo da meta" valor={`${x.abaixo} de ${x.unidades.length}`} cor={x.abaixo ? 'var(--vermelho)' : 'var(--verde)'} linhas={[['No acumulado do período', '']]} />
        <StatCard rotulo="Maior % da meta" valor={pct(ranking[0].pct, 0)} cor="var(--verde)" linhas={[[ranking[0].u.nome, '']]} href={link('producao', 'unidade', ranking[0].u.id, { ind: nome })} />
      </div>

      <div className="pilha">
        <Card titulo="Ranking das unidades" sub="Percentual da meta atingido no período (produção ÷ meta de cada unidade).">
          <BarrasLista mostrarPct={false} max={max} linhas={ranking.map((r) => ({
            chave: r.u.id, rotulo: r.u.nome, sub: `produção ${inteiro(r.prod)} · meta ${inteiro(r.meta)}`,
            valor: r.pct, texto: pct(r.pct, 0), tom: r.pct < 1 ? 'neg' : undefined,
            href: link('producao', 'unidade', r.u.id, { ind: nome }),
          }))} />
        </Card>
        <Card titulo="Mês a mês" sub="Percentual da meta em cada mês. Passe o mouse para ver produção e meta.">
          <div className="rolagem">
            <table className="tabela tabela-entregas">
              <thead><tr><th>Unidade</th>{janela.map((c) => <th key={c} className="centro">{rotuloMes(c)}</th>)}</tr></thead>
              <tbody>
                {ranking.map((r) => (
                  <tr key={r.u.id}>
                    <td><a className="nome-unidade" href={link('producao', 'unidade', r.u.id, { ind: nome })}>{r.u.nome}</a></td>
                    {janela.map((c) => <td key={c} className="centro"><CelulaMeta r={r.u.dados[nome]?.[c]} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
