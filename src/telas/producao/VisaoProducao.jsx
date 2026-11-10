import { useMemo } from 'react';
import { useProducao } from '../../contexto/ProducaoContexto';
import { link } from '../../hooks/useRota';
import { corPct, inteiro, metasPorMes, porIndicador, resumoUnidade } from '../../utils/producao';
import { pct, plural, rotuloMes, rotuloPeriodo } from '../../utils/formatacao';
import Card from '../../components/comum/Card';
import StatCard from '../../components/comum/StatCard';
import BarrasLista from '../../components/comum/BarrasLista';
import GraficoMensal from '../../components/comum/GraficoMensal';
import Icone from '../../components/comum/Icone';
import { Progresso } from '../../components/comum/Graficos';

export default function VisaoProducao() {
  const { modelo, unidades, comps, janela, filtro } = useProducao();
  const resumos = useMemo(() => unidades.map((u) => resumoUnidade(u, comps)).filter((r) => r.avaliados), [unidades, comps]);
  const inds = useMemo(() => porIndicador(unidades, comps), [unidades, comps]);
  const porMes = useMemo(() => metasPorMes(unidades, janela), [unidades, janela]);

  const avaliados = resumos.reduce((s, r) => s + r.avaliados, 0);
  const cumpridos = resumos.reduce((s, r) => s + r.cumpridos, 0);
  const todas = resumos.filter((r) => r.cumpridos === r.avaliados);
  const abaixo70 = resumos.filter((r) => r.pctMetas < 0.7);
  const semProd = resumos.reduce((s, r) => s + r.semProd, 0);
  const atencao = [...resumos].sort((a, b) => a.pctMetas - b.pctMetas).slice(0, 8);
  const periodo = rotuloPeriodo(comps, filtro.periodo);

  if (!comps.length) return <div className="vazio-pagina">Ainda não há produção informada em {filtro.ano}.</div>;

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Produção das unidades</h1>
          <p className="sub">{periodo} · meta × produção informada de cada indicador · cada unidade é avaliada pelas próprias metas</p>
        </div>
      </div>

      {modelo.divergentes > 0 && (
        <div className="aviso-suave"><Icone nome="info" tamanho={16} /> Em {plural(modelo.divergentes, 'linha', 'linhas')} da planilha, a coluna Status_Meta não bate com meta × produção. O painel usa a conta (produção ≥ meta = cumprida).</div>
      )}

      <div className="grade-stats-unidade">
        <StatCard rotulo="Metas cumpridas" ajuda="Cada meta mensal de cada indicador de cada unidade conta uma vez." valor={avaliados ? pct(cumpridos / avaliados, 0) : '—'} cor={corPct(avaliados ? cumpridos / avaliados : null)}
          linhas={[['Cumpridas', `${inteiro(cumpridos)} de ${inteiro(avaliados)}`]]} />
        <StatCard rotulo="Cumpriram todas as metas" valor={`${todas.length} de ${resumos.length}`} cor="var(--verde)" linhas={[['Unidades avaliadas', resumos.length]]} href={link('producao', 'unidades', { f: 'todas' })} />
        <StatCard rotulo="Abaixo de 70% das metas" valor={abaixo70.length} cor={abaixo70.length ? 'var(--vermelho)' : undefined}
          linhas={[['Unidades', `${abaixo70.length} de ${resumos.length}`]]} href={link('producao', 'unidades', { f: 'abaixo' })} />
        <StatCard rotulo="Produção não informada" ajuda="Meses em que havia meta, mas a produção não foi preenchida na planilha." valor={semProd}
          linhas={[['Unidades', resumos.filter((r) => r.semProd).length]]} />
      </div>

      <div className="grade-2 iguais">
        <Card titulo="Metas cumpridas por mês" sub="Quantas metas (unidade × indicador) foram cumpridas ou não em cada mês. Passe o mouse para ver os números.">
          <GraficoMensal empilhado altura={420} meses={janela} formato={(v) => plural(v, 'meta', 'metas')} eixo={(v) => v}
            series={[
              { nome: 'Cumpridas', cor: '--verde', valores: porMes.map((m) => m.cumprida) },
              { nome: 'Não cumpridas', cor: '--vermelho', valores: porMes.map((m) => m.nao) },
              ...(porMes.some((m) => m.semProd) ? [{ nome: 'Sem produção', cor: '--acento-suave', valores: porMes.map((m) => m.semProd) }] : []),
            ]} />
        </Card>
        <Card titulo="Unidades que mais precisam de atenção" sub="Menor percentual de metas cumpridas no período. Clique para ver os indicadores.">
          <BarrasLista mostrarPct={false} max={1} linhas={atencao.map((r) => ({
            chave: r.u.id, rotulo: r.u.nome,
            sub: r.naoCumpridos.length ? `Abaixo da meta: ${r.naoCumpridos.slice(0, 2).map((i) => i.indicador).join(', ')}${r.naoCumpridos.length > 2 ? ` e mais ${r.naoCumpridos.length - 2}` : ''}` : 'Todos os indicadores na meta',
            valor: r.pctMetas, texto: `${r.cumpridos} de ${r.avaliados}`, tom: r.pctMetas < 0.7 ? 'neg' : undefined,
            href: link('producao', 'unidade', r.u.id),
          }))} />
        </Card>
      </div>

      <Card titulo="Indicadores" sub="Percentual das metas mensais cumpridas em cada indicador e quantas unidades ficaram abaixo da meta no período.">
        <ul className="lista-pesos colunas">
          {inds.map((x) => (
            <li key={x.indicador}><a href={link('producao', 'indicador', x.indicador)}>
              <span className="lista-pesos-topo"><span>{x.indicador}</span><b style={{ color: corPct(x.pctMetas) }}>{pct(x.pctMetas, 0)}</b></span>
              <Progresso valor={x.pctMetas} cor={corPct(x.pctMetas)} />
              <small>{plural(x.unidades.length, 'unidade', 'unidades')} · {x.abaixo ? `${x.abaixo} abaixo da meta` : 'todas na meta'} · {x.cumpridos} de {x.avaliados} metas mensais</small>
            </a></li>
          ))}
        </ul>
      </Card>
      <p className="nota-rodape">Meses com produção em {filtro.ano}: {janela.map(rotuloMes).join(', ')}.</p>
    </>
  );
}
