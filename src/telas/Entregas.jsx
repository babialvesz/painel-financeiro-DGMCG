import { useMemo, useState } from 'react';
import { usePainel } from '../contexto/PainelContexto';
import { CONFIG } from '../config';
import { link, navegar } from '../hooks/useRota';
import { SITUACOES } from '../services/entregas';
import { competencias, contagemPorCompetencia, dataBR, diaMes, entregasFiltradas, indicadores, porUnidade, textoDias } from '../utils/entregas';
import { pct, plural, rotuloMes } from '../utils/formatacao';
import Card from '../components/comum/Card';
import StatCard from '../components/comum/StatCard';
import BarrasLista from '../components/comum/BarrasLista';
import GraficoMensal from '../components/comum/GraficoMensal';
import BotaoExportar from '../components/comum/BotaoExportar';
import Icone from '../components/comum/Icone';
import { Progresso } from '../components/comum/Graficos';

const ORDEM_LEGENDA = ['prazo', 'limite', 'atraso', 'pendente', 'aberto', 'conferir', 'na'];
const CORES = { prazo: '--verde', limite: '--amarelo', atraso: '--vermelho', pendente: '--vermelho-claro-forte', aberto: '--acento-suave', conferir: '--classe-devolucao' };
const dias = (n) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${n === 1 ? 'dia' : 'dias'}`;

export default function Entregas({ query }) {
  const { modelo, filtro } = usePainel();
  const lista = useMemo(() => entregasFiltradas(modelo, filtro), [modelo, filtro]);
  const comps = useMemo(() => competencias(lista), [lista]);
  const mesSel = filtro.periodo !== 'acum' && comps.includes(filtro.periodo) ? filtro.periodo : '';
  const compsResumo = mesSel ? [mesSel] : comps;
  const tudo = useMemo(() => lista.flatMap((e) => compsResumo.map((c) => e.meses[c]).filter(Boolean)), [lista, compsResumo]);
  const ind = indicadores(tudo);
  const unidadesInd = useMemo(() => porUnidade(lista, compsResumo), [lista, compsResumo]);
  const contagem = useMemo(() => contagemPorCompetencia(lista, comps), [lista, comps]);

  const [busca, setBusca] = useState('');
  const f = ['atraso', 'pendente', 'sempre'].includes(query.f) ? query.f : '';
  const tipo = query.tipo || '';
  const tipos = [...new Set(lista.map((e) => e.tipo))].sort();

  const filtradas = unidadesInd.filter((x) => {
    if (tipo && x.e.tipo !== tipo) return false;
    if (busca && !x.e.unidade.toLowerCase().includes(busca.trim().toLowerCase())) return false;
    if (f === 'atraso') return x.atrasos > 0;
    if (f === 'pendente') return x.pendentes > 0;
    if (f === 'sempre') return x.avaliadas > 0 && x.noPrazo === x.avaliadas;
    return true;
  });

  const ranking = unidadesInd.filter((x) => x.atrasos + x.pendentes > 0)
    .sort((a, b) => (b.atrasos + b.pendentes) - (a.atrasos + a.pendentes) || b.mediaAtraso - a.mediaAtraso);
  const sempre = unidadesInd.filter((x) => x.avaliadas > 0 && x.noPrazo === x.avaliadas).length;
  const pendentes = unidadesInd.filter((x) => x.pendentes > 0);
  const compAberta = [...comps].reverse().find((c) => lista.some((e) => e.meses[c]?.status === 'aberto'));
  const periodo = mesSel ? `Competência ${rotuloMes(mesSel)}` : `Competências de ${comps.length ? `${rotuloMes(comps[0])} a ${rotuloMes(comps[comps.length - 1])}` : filtro.ano}`;
  const chip = (id, nome, n) => (
    <button key={id} className={`chip ${f === id ? 'ativo' : ''}`} onClick={() => navegar(link('entregas', { f: id, tipo }))}>{nome} <b>{n}</b></button>
  );

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Entrega das prestações de contas</h1>
          <p className="sub">{periodo} · prazo: dia {CONFIG.entregas.diaPrazo} do mês seguinte (se cair em fim de semana ou feriado, vale o próximo dia útil) · fonte: aba {CONFIG.abas.entregas}</p>
        </div>
      </div>

      {modelo.entregasErro && <div className="aviso-suave aviso-erro"><Icone nome="alerta" tamanho={16} /> Não foi possível ler a aba de entregas: {modelo.entregasErro}</div>}

      {!lista.length ? (
        <div className="vazio-pagina">Nenhuma entrega registrada para {filtro.ano}.</div>
      ) : (
        <>
          <div className="grade-stats-unidade">
            <StatCard rotulo="Entregues no prazo" ajuda="Entregas feitas até o prazo, contando só as competências que já venceram."
              valor={ind.pontualidade === null ? '—' : pct(ind.pontualidade, 0)} cor="var(--verde)"
              linhas={[['No prazo', `${ind.noPrazo} de ${ind.avaliadas}`], ['No dia útil seguinte', ind.limite]]} />
            <StatCard rotulo="Entregues com atraso" valor={ind.atrasos} cor={ind.atrasos ? 'var(--vermelho)' : undefined}
              linhas={[['Atraso médio', ind.atrasos ? dias(ind.mediaAtraso) : '—'], ['Unidades que atrasaram', unidadesInd.filter((x) => x.atrasos).length]]}
              href={link('entregas', { f: 'atraso' })} />
            <StatCard rotulo="Não entregaram" ajuda="O prazo já venceu e a data de entrega ainda não foi registrada."
              valor={ind.pendentes} cor={ind.pendentes ? 'var(--vermelho)' : undefined}
              linhas={pendentes.length ? pendentes.slice(0, 2).map((x) => [x.e.sigla || x.e.nome, plural(x.pendentes, 'mês', 'meses')]) : [['Todas em dia', '']]}
              href={pendentes.length ? link('entregas', { f: 'pendente' }) : undefined} />
            <StatCard rotulo="Aguardando" ajuda="Competências cujo prazo ainda não venceu e que a unidade ainda não entregou."
              valor={ind.abertos}
              linhas={compAberta ? [['Competência', rotuloMes(compAberta)], ['Prazo', dataBR(lista.find((e) => e.meses[compAberta])?.meses[compAberta].prazo)]] : [['Nenhuma em aberto', '']]} />
          </div>

          <div className="grade-2 iguais">
            <Card titulo="Situação das entregas por mês" sub="Quantas unidades entregaram no prazo, atrasaram ou ainda não entregaram cada competência. Passe o mouse para ver os números.">
              <GraficoMensal empilhado altura={430} meses={comps} formato={(v) => plural(v, 'unidade', 'unidades')} eixo={(v) => v}
                series={['prazo', 'limite', 'atraso', 'pendente', 'aberto'].filter((s) => contagem.some((c) => c[s]))
                  .map((s) => ({ nome: SITUACOES[s].curto, cor: CORES[s], valores: contagem.map((c) => c[s]) }))} />
            </Card>
            <Card titulo="Quem mais atrasou" sub={`Competências entregues com atraso ou ainda não entregues. ${plural(sempre, 'unidade entregou', 'unidades entregaram')} tudo no prazo.`}>
              <BarrasLista mostrarPct={false} vazio="Nenhuma unidade atrasou no período."
                linhas={ranking.slice(0, 10).map((x) => ({
                  chave: x.e.id, rotulo: x.e.nome + (x.e.sigla ? ` – ${x.e.sigla}` : ''),
                  sub: [x.atrasos && `atraso médio de ${dias(x.mediaAtraso)}`, x.pendentes && `${plural(x.pendentes, 'mês', 'meses')} sem entregar`, x.maior && `maior: ${dias(x.maior.dias)} (${rotuloMes(x.maior.comp)})`].filter(Boolean).join(' · '),
                  valor: x.atrasos + x.pendentes, texto: `${x.atrasos + x.pendentes} de ${x.avaliadas}`, tom: 'neg',
                  href: link('entrega', x.e.id),
                }))} />
            </Card>
          </div>

          <Card titulo="Calendário de entregas" sub="Cada quadrinho mostra o dia em que a unidade entregou a competência. Passe o mouse para ver o prazo e os dias; clique na unidade para ver o detalhe."
            acoes={<BotaoExportar nome="entregas-pcf" cabecalho={['Unidade', 'Tipo', 'OSS', ...comps.flatMap((c) => [`${rotuloMes(c)} entrega`, `${rotuloMes(c)} situação`]), 'No prazo', 'Avaliadas']}
              linhas={() => filtradas.map((x) => [x.e.unidade, x.e.tipo, x.e.oss, ...comps.flatMap((c) => { const s = x.e.meses[c]; return s ? [s.entrega ? dataBR(s.entrega) : '', SITUACOES[s.status].nome] : ['', '']; }), x.noPrazo, x.avaliadas])} />}>
            <div className="barra-ferramentas">
              <div className="chips" role="group" aria-label="Filtrar">
                {chip('', 'Todas', unidadesInd.length)}
                {chip('atraso', 'Atrasaram', unidadesInd.filter((x) => x.atrasos).length)}
                {chip('pendente', 'Não entregaram', pendentes.length)}
                {chip('sempre', 'Sempre no prazo', sempre)}
              </div>
              <div className="ferramentas-direita">
                <select className="select" value={tipo} onChange={(e) => navegar(link('entregas', { f, tipo: e.target.value }))} aria-label="Tipo de unidade">
                  <option value="">Todos os tipos</option>
                  {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input className="busca" type="search" placeholder="Buscar unidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
            </div>
            <Legenda />
            <div className="rolagem">
              <table className="tabela tabela-entregas">
                <thead>
                  <tr>
                    <th>Unidade</th>
                    {comps.map((c) => <th key={c} className={`centro ${c === mesSel ? 'col-sel' : ''}`}>{rotuloMes(c)}</th>)}
                    <th className="num">No prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((x) => (
                    <tr key={x.e.id} className="clicavel" onClick={() => navegar(link('entrega', x.e.id))}>
                      <td>
                        <a className="nome-unidade" href={link('entrega', x.e.id)} onClick={(ev) => ev.stopPropagation()}>{x.e.nome}{x.e.sigla && <> – {x.e.sigla}</>}</a>
                        <span className="meta">{[x.e.tipo, x.e.oss].filter(Boolean).join(' · ')}</span>
                      </td>
                      {comps.map((c) => <td key={c} className={`centro ${c === mesSel ? 'col-sel' : ''}`}><Celula s={x.e.meses[c]} /></td>)}
                      <td className="num">
                        {x.avaliadas ? <div className="ent-pontual"><b>{x.noPrazo}/{x.avaliadas}</b><Progresso valor={x.noPrazo / x.avaliadas} cor={x.noPrazo === x.avaliadas ? 'var(--verde)' : x.pontualidade >= 0.7 ? 'var(--amarelo)' : 'var(--vermelho)'} /></div> : <span className="muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtradas.length && <p className="vazio">Nenhuma unidade encontrada.</p>}
          </Card>
        </>
      )}
    </>
  );
}

export function Celula({ s }) {
  if (!s) return <span className="ent-celula ent-vazio" />;
  const titulo = `${rotuloMes(s.comp)} · ${SITUACOES[s.status].nome}${s.entrega ? ` · entregue em ${dataBR(s.entrega)}` : ''} · prazo ${dataBR(s.prazo)}${textoDias(s) ? ` · ${textoDias(s)}` : ''}`;
  const texto = s.status === 'na' ? 'N/A' : s.entrega ? diaMes(s.entrega) : s.status === 'pendente' ? 'Falta' : '…';
  return <span className={`ent-celula ent-${s.status}`} title={titulo}>{texto}</span>;
}

export function Legenda({ status = ORDEM_LEGENDA }) {
  return (
    <div className="ent-legenda">
      {status.map((s) => <span key={s}><span className={`ent-celula ent-${s} mini`} />{SITUACOES[s].nome}</span>)}
    </div>
  );
}
