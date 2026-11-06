import { useMemo, useState } from 'react';
import { usePainel } from '../contexto/PainelContexto';
import { CONFIG } from '../config';
import { link, navegar } from '../hooks/useRota';
import { compararItens, rankingItem } from '../utils/analise';
import { brl, contrato, nomeCurto, pct, plural, rotuloPeriodo } from '../utils/formatacao';
import Trilha from '../components/layout/Trilha';
import Card from '../components/comum/Card';
import StatCard from '../components/comum/StatCard';
import BarrasLista from '../components/comum/BarrasLista';
import Sparkline from '../components/comum/Sparkline';
import BotaoExportar from '../components/comum/BotaoExportar';
import { Progresso } from '../components/comum/Graficos';
import { useOrdenacao } from '../components/comum/useOrdenacao';

export default function Item({ codigo }) {
  const { modelo, unidades, meses, janela, filtro } = usePainel();
  const item = modelo.itens[codigo];
  const [por, setPor] = useState('pct');
  const [todas, setTodas] = useState(false);
  const ranking = useMemo(() => (item ? rankingItem(modelo, unidades, codigo, meses, janela).filter((r) => r.total > 0) : []), [modelo, item, unidades, codigo, meses, janela]);
  const cmp = useMemo(() => compararItens(modelo, unidades, meses), [modelo, unidades, meses]);
  const { ordenadas, cabecalho } = useOrdenacao(ranking.map((r) => ({ ...r, nome: nomeCurto(r.u.nome) })), 'pct');

  if (!item) return <div className="vazio-pagina">Despesa não encontrada. <a href={link('itens')}>Voltar</a></div>;

  const l = cmp.linhas[codigo];
  const ancestrais = [];
  for (let p = item.pai; p; p = modelo.itens[p].pai) ancestrais.unshift(modelo.itens[p]);
  const subitens = item.filhos.map((f) => cmp.linhas[f]).filter(Boolean).sort((a, b) => b.pesoMedio - a.pesoMedio);
  const barras = [...ranking].sort((a, b) => (por === 'pct' ? b.pct - a.pct : b.total - a.total)).map((r) => ({
    chave: r.u.aba, rotulo: nomeCurto(r.u.nome), sub: por === 'pct' ? `Despesa: ${brl(r.total)}` : `${pct(r.pct)} do orçamento`,
    valor: por === 'pct' ? r.pct : r.total, texto: por === 'pct' ? pct(r.pct) : brl(r.total), href: link('unidade', r.u.aba, { item: codigo }),
  }));

  return (
    <>
      <Trilha passos={[{ nome: 'Despesas por item', href: link('itens') }, ...ancestrais.map((a) => ({ nome: a.n, href: link('item', a.c) })), { nome: item.n }]} />
      <div className="titulo-pagina">
        <div>
          <h1>{item.n} <span className="codigo grande">{item.c}</span></h1>
          <p className="sub">{rotuloPeriodo(meses, filtro.periodo)} · cada unidade com o seu próprio valor</p>
        </div>
      </div>

      {!l ? <div className="vazio-pagina">Nenhuma unidade teve essa despesa no período.</div> : (
        <>
          <div className="grade-stats-unidade">
            <StatCard rotulo="Unidades com essa despesa" valor={`${l.qtdUnidades}`} unidade={` de ${l.qtdBase}`} linhas={[['Sem essa despesa', l.qtdBase - l.qtdUnidades]]} />
            <StatCard rotulo="Peso médio no orçamento" ajuda="Em média, quanto essa despesa representa do total de despesas de cada unidade." valor={pct(l.pesoMedio)} linhas={[['Entre as que têm essa despesa', '']]} />
            <StatCard rotulo="Onde pesa mais" valor={<span className="stat-texto">{nomeCurto(l.maior.u.nome)}</span>} linhas={[['Peso', pct(l.maior.pct)], ['Despesa', brl(l.maior.total)]]} href={link('unidade', l.maior.u.aba, { item: codigo })} />
            <StatCard rotulo="Onde pesa menos" valor={<span className="stat-texto">{nomeCurto(l.menor.u.nome)}</span>} linhas={[['Peso', pct(l.menor.pct)], ['Despesa', brl(l.menor.total)]]} href={link('unidade', l.menor.u.aba, { item: codigo })} />
          </div>

          <div className={subitens.length ? 'grade-principal' : ''}>
            <Card titulo="Ranking das unidades" sub={por === 'pct' ? 'Pelo peso no orçamento: compara unidades grandes e pequenas de forma justa.' : 'Pelo valor da despesa em cada unidade.'}
              acoes={<div className="segmentado" role="group" aria-label="Ordenar por">
                <button className={por === 'pct' ? 'ativo' : ''} onClick={() => setPor('pct')}>Peso (%)</button>
                <button className={por === 'valor' ? 'ativo' : ''} onClick={() => setPor('valor')}>Valor (R$)</button>
              </div>}>
              <BarrasLista linhas={todas ? barras : barras.slice(0, 10)} mostrarPct={false} />
              {barras.length > 10 && (
                <button className="botao-secundario largo" onClick={() => setTodas((t) => !t)}>
                  {todas ? 'Mostrar só as 10 primeiras' : `Mostrar todas as ${barras.length} unidades`}
                </button>
              )}
            </Card>
            {subitens.length > 0 && (
              <Card titulo="Do que é composto" sub="Peso médio de cada parte no orçamento das unidades.">
                <ul className="lista-pesos">
                  {subitens.map((s) => (
                    <li key={s.c}>
                      <a href={link('item', s.c)}>
                        <span className="lista-pesos-topo"><span>{s.item.n}</span><b>{pct(s.pesoMedio)}</b></span>
                        <Progresso valor={s.pesoMedio / Math.max(...subitens.map((x) => x.pesoMedio))} />
                        <small>Aparece em {plural(s.qtdUnidades, 'unidade', 'unidades')}</small>
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <Card titulo="Tabela detalhada" sub="Valores exatos. Clique nos títulos para ordenar e numa linha para abrir a unidade."
            acoes={<BotaoExportar nome={`despesa-${codigo}`} cabecalho={['Unidade', 'Tipo', 'Porte', 'Despesa', 'Peso no orçamento (%)', 'Média por mês', 'Menor mês', 'Maior mês']}
              linhas={() => ordenadas.map((r) => [r.u.nome, r.u.grupo, r.u.porte, r.total, r.pct * 100, r.media, r.min, r.max])} />}>
            <div className="rolagem">
              <table className="tabela">
                <thead>
                  <tr>
                    <th {...cabecalho('nome', 'Unidade')} />
                    <th {...cabecalho('total', 'Despesa', { className: 'num' })} />
                    <th {...cabecalho('pct', 'Peso no orçamento')} />
                    <th {...cabecalho('media', 'Média por mês', { className: 'num' })} />
                    <th className="num">Menor mês → maior mês</th>
                    <th>Evolução</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenadas.map((r) => (
                    <tr key={r.u.aba} className="clicavel" onClick={() => navegar(link('unidade', r.u.aba, { item: codigo }))}>
                      <td><a className="nome-unidade" href={link('unidade', r.u.aba, { item: codigo })} onClick={(e) => e.stopPropagation()}>{nomeCurto(r.u.nome)}</a>
                        <span className="meta">{[contrato(r.u.aba), r.u.grupo !== CONFIG.semClassificacao && r.u.grupo, r.u.porte !== CONFIG.semClassificacao && r.u.porte].filter(Boolean).join(' · ')}</span></td>
                      <td className="num forte">{brl(r.total)}</td>
                      <td className="col-peso"><span className="peso"><Progresso valor={r.pct / Math.max(...ranking.map((x) => x.pct))} /><span>{pct(r.pct)}</span></span></td>
                      <td className="num">{brl(r.media)}</td>
                      <td className="num muted">{brl(r.min)} → {brl(r.max)}</td>
                      <td><Sparkline valores={r.serie} /></td>
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
