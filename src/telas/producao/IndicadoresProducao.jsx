import { useMemo } from 'react';
import { useProducao } from '../../contexto/ProducaoContexto';
import { link, navegar } from '../../hooks/useRota';
import { corPct, porIndicador } from '../../utils/producao';
import { pct, rotuloPeriodo } from '../../utils/formatacao';
import Card from '../../components/comum/Card';
import { Progresso } from '../../components/comum/Graficos';

export default function IndicadoresProducao() {
  const { unidades, comps, filtro } = useProducao();
  const inds = useMemo(() => porIndicador(unidades, comps), [unidades, comps]);
  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Indicadores</h1>
          <p className="sub">{rotuloPeriodo(comps, filtro.periodo)} · cada indicador comparado unidade a unidade, pelo percentual da meta de cada uma</p>
        </div>
      </div>
      <Card titulo="Todos os indicadores" sub="Clique num indicador para ver o ranking das unidades.">
        <div className="rolagem">
          <table className="tabela">
            <thead>
              <tr><th>Indicador</th><th className="centro">Unidades</th><th className="num">Metas mensais cumpridas</th><th className="num">% médio da meta</th><th className="centro">Abaixo da meta</th></tr>
            </thead>
            <tbody>
              {inds.map((x) => (
                <tr key={x.indicador} className="clicavel" onClick={() => navegar(link('producao', 'indicador', x.indicador))}>
                  <td><a className="nome-unidade" href={link('producao', 'indicador', x.indicador)} onClick={(e) => e.stopPropagation()}>{x.indicador}</a></td>
                  <td className="centro">{x.unidades.length}</td>
                  <td className="num"><div className="pct-barra"><b style={{ color: corPct(x.pctMetas) }}>{pct(x.pctMetas, 0)}</b><Progresso valor={x.pctMetas} cor={corPct(x.pctMetas)} /></div><span className="meta">{x.cumpridos} de {x.avaliados}</span></td>
                  <td className="num forte" style={{ color: corPct(x.pctMedio) }}>{pct(x.pctMedio, 0)}</td>
                  <td className="centro">{x.abaixo ? <span className="pill pill-neg">{x.abaixo}</span> : <span className="pill pill-pos">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
