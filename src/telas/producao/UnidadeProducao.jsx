import { useMemo } from 'react';
import { useProducao } from '../../contexto/ProducaoContexto';
import { link, navegar } from '../../hooks/useRota';
import { SITUACOES_META } from '../../services/producao';
import { corPct, inteiro, resumoIndicador, resumoUnidade } from '../../utils/producao';
import { pct, plural, rotuloMes, rotuloPeriodo } from '../../utils/formatacao';
import Card from '../../components/comum/Card';
import StatCard from '../../components/comum/StatCard';
import GraficoMensal from '../../components/comum/GraficoMensal';
import Trilha from '../../components/layout/Trilha';
import { Progresso } from '../../components/comum/Graficos';
import Mapa from '../../components/comum/Mapa';
import { TIPOS_MAPA } from './InicioProducao';

export default function UnidadeProducao({ id, query }) {
  const { modelo, comps, janela, filtro } = useProducao();
  const u = modelo.porId[id];
  const ossInfo = u && modelo.oss.find((o) => o.sigla === u.oss);
  const r = useMemo(() => (u ? resumoUnidade(u, comps) : null), [u, comps]);
  if (!u) return <div className="vazio-pagina">Unidade não encontrada. <a href={link('producao', 'unidades')}>Voltar para unidades</a></div>;

  const inds = [...r.inds].sort((a, b) => a.indicador.localeCompare(b.indicador, 'pt-BR'));
  const sel = inds.find((i) => i.indicador === query.ind) || r.inds[0];
  const serieSel = sel ? resumoIndicador(u, sel.indicador, janela) : null;
  const melhor = [...r.inds].filter((i) => i.pct !== null).sort((a, b) => b.pct - a.pct)[0];
  const pior = [...r.inds].filter((i) => i.pct !== null).sort((a, b) => a.pct - b.pct)[0];
  const ir = (ind) => navegar(link('producao', 'unidade', id, { ind }));

  return (
    <>
      <Trilha passos={[{ nome: 'Unidades', href: link('producao', 'unidades') }, { nome: u.nome }]} />
      <div className="titulo-pagina">
        <div>
          <h1>{u.nome}</h1>
          <p className="sub">{[u.tipo, u.cidade, u.cg && `CG ${u.cg}`, u.oss, u.macro && `Macro ${u.macro}`, u.geres && `${u.geres} GERES`].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      {u.cad && (
        <div className="grade-identificacao">
          <Card titulo="Identificação">
            <dl className="ficha">
              <div><dt>OSS</dt><dd>{u.oss}{ossInfo?.razao && <small>{ossInfo.razao}</small>}</dd></div>
              <div><dt>Contrato</dt><dd>{u.cad.contrato || u.cg || '—'}{u.cad.situacao && <small>{u.cad.situacao}{u.cad.vigencia && ` · vigência até ${u.cad.vigencia}`}</small>}</dd></div>
              <div><dt>Cidade</dt><dd>{u.cad.cidade || '—'}{u.cad.geres && <small>GERES {u.cad.geres}{u.cad.macro && ` · Macro ${u.cad.macro}`}</small>}</dd></div>
              <div><dt>CNES</dt><dd>{u.cad.cnes || '—'}</dd></div>
              <div className="largo"><dt>Endereço</dt><dd>{u.cad.endereco || '—'}</dd></div>
            </dl>
          </Card>
          {u.cad.lat && u.cad.lng && (
            <Card className="card-mapa">
              <Mapa altura={230} agrupar={false} pontos={[{ id: u.id, lat: u.cad.lat, lng: u.cad.lng, nome: u.nome, letra: (TIPOS_MAPA[u.tipo] || {}).letra, cor: (TIPOS_MAPA[u.tipo] || {}).cor || '#122A54' }]} />
            </Card>
          )}
        </div>
      )}

      {!r.avaliados ? (
        <div className="vazio-pagina">Sem produção informada em {rotuloPeriodo(comps, filtro.periodo)}.</div>
      ) : (
        <>
          <div className="grade-stats-unidade">
            <StatCard rotulo="Metas cumpridas" valor={pct(r.pctMetas, 0)} cor={corPct(r.pctMetas === 1 ? 1 : r.pctMetas >= 0.7 ? 0.9 : 0)}
              linhas={[['Período', rotuloPeriodo(comps, filtro.periodo)], ['Cumpridas', `${r.cumpridos} de ${r.avaliados}`]]} />
            <StatCard rotulo="Indicadores abaixo da meta" valor={`${r.naoCumpridos.length} de ${r.inds.length}`} cor={r.naoCumpridos.length ? 'var(--vermelho)' : 'var(--verde)'}
              linhas={[['No acumulado do período', '']]} />
            <StatCard rotulo="Melhor resultado" valor={melhor ? pct(melhor.pct, 0) : '—'} cor="var(--verde)" linhas={melhor ? [[melhor.indicador, '']] : []} onClick={melhor ? () => ir(melhor.indicador) : undefined} />
            <StatCard rotulo="Mais longe da meta" valor={pior ? pct(pior.pct, 0) : '—'} cor={corPct(pior?.pct)} linhas={pior ? [[pior.indicador, '']] : []} onClick={pior ? () => ir(pior.indicador) : undefined} />
          </div>

          <div className="grade-2">
            <Card titulo="Indicadores" sub="Produção e meta somadas nos meses do período (só desta unidade). Clique num indicador para ver mês a mês.">
              <div className="rolagem">
                <table className="tabela">
                  <thead><tr><th>Indicador</th><th className="num">Meta</th><th className="num">Produção</th><th className="num">% da meta</th><th className="centro">Meses na meta</th></tr></thead>
                  <tbody>
                    {inds.map((i) => (
                      <tr key={i.indicador} className={`clicavel ${sel?.indicador === i.indicador ? 'linha-sel' : ''}`} onClick={() => ir(i.indicador)}>
                        <td><span className="nome-unidade">{i.indicador}</span>{i.semProd > 0 && <span className="meta">{plural(i.semProd, 'mês', 'meses')} sem produção informada</span>}</td>
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
              <Card titulo={sel.indicador} sub="Meta e produção de cada mês. Passe o mouse para ver os valores exatos.">
                <GraficoMensal altura={300} meses={janela} formato={inteiro} eixo={(v) => v.toLocaleString('pt-BR')}
                  series={[
                    { nome: 'Meta', cor: '--acento-suave', valores: serieSel.serie.map((x) => x?.meta ?? null) },
                    { nome: 'Produção', cor: '--acento', valores: serieSel.serie.map((x) => x?.prod ?? null) },
                  ]} />
                <p className="nota-card">Acumulado: <b>{inteiro(serieSel.prod)}</b> de meta <b>{inteiro(serieSel.meta)}</b> ({serieSel.pct === null ? '—' : pct(serieSel.pct, 0)}) · meta cumprida em {serieSel.cumpridos} de {serieSel.avaliados} meses</p>
              </Card>
            )}
          </div>

          <Card titulo="Mês a mês" sub="Percentual da meta atingido em cada mês. Verde = cumpriu · amarelo = 80% a 99% · vermelho = abaixo de 80%.">
            <div className="rolagem">
              <table className="tabela tabela-entregas">
                <thead><tr><th>Indicador</th>{janela.map((c) => <th key={c} className="centro">{rotuloMes(c)}</th>)}</tr></thead>
                <tbody>
                  {inds.map((i) => (
                    <tr key={i.indicador} className="clicavel" onClick={() => ir(i.indicador)}>
                      <td>{i.indicador}</td>
                      {janela.map((c) => <td key={c} className="centro"><CelulaMeta r={u.dados[i.indicador]?.[c]} /></td>)}
                    </tr>
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

export function CelulaMeta({ r }) {
  if (!r || r.status === 'vazio') return <span className="ent-celula ent-vazio" />;
  if (r.status === 'semProd' || r.status === 'semMeta') {
    return <span className={`ent-celula ${r.status === 'semProd' ? 'ent-aberto' : 'ent-na'}`} title={`${rotuloMes(r.comp)} · ${SITUACOES_META[r.status].nome}${r.meta ? ` · meta ${inteiro(r.meta)}` : ''}${r.prod !== null ? ` · produção ${inteiro(r.prod)}` : ''}`}>—</span>;
  }
  const p = r.prod / r.meta;
  const cls = p >= 1 ? 'ent-prazo' : p >= 0.8 ? 'ent-limite' : 'ent-atraso';
  return <span className={`ent-celula ${cls}`} title={`${rotuloMes(r.comp)} · produção ${inteiro(r.prod)} de meta ${inteiro(r.meta)} · ${SITUACOES_META[r.status].nome}`}>{pct(p, 0)}</span>;
}
