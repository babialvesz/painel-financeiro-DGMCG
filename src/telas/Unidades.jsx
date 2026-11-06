import { useMemo, useState } from 'react';
import { usePainel } from '../contexto/PainelContexto';
import { CONFIG } from '../config';
import { link, navegar } from '../hooks/useRota';
import { agrupar, deducoesPorUnidade, situacoes, valor } from '../utils/analise';
import { brl, contrato, fraseResultado, nomeCurto, plural, rotuloMes, rotuloPeriodo } from '../utils/formatacao';
import Card from '../components/comum/Card';
import Pill from '../components/comum/Pill';
import Icone from '../components/comum/Icone';
import BotaoExportar from '../components/comum/BotaoExportar';
import { BarrasResultado } from '../components/comum/Graficos';

const ORDENS = {
  grave: { nome: 'Mais grave primeiro', f: (a, b) => b.mesesDef - a.mesesDef || a.res - b.res },
  deficit: { nome: 'Maior déficit primeiro', f: (a, b) => a.res - b.res },
  superavit: { nome: 'Maior superávit primeiro', f: (a, b) => b.res - a.res },
  nome: { nome: 'Nome (A–Z)', f: (a, b) => nomeCurto(a.u.nome).localeCompare(nomeCurto(b.u.nome), 'pt-BR') },
};

export default function Unidades({ query }) {
  const { modelo, unidades, meses, janela, filtro } = usePainel();
  const deducoes = useMemo(() => deducoesPorUnidade(modelo, filtro), [modelo, filtro]);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('grave');
  const [modo, setModo] = useState('cartoes');
  const sits = useMemo(() => situacoes(unidades, meses, janela), [unidades, meses, janela]);
  const g = useMemo(() => agrupar(sits), [sits]);
  const f = ['deficit', 'superavit', 'alerta'].includes(query.f) ? query.f : '';

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return (f ? g[f] : sits).filter((s) => !b || s.u.nome.toLowerCase().includes(b)).sort(ORDENS[ordem].f);
  }, [f, g, sits, busca, ordem]);

  const chips = [
    ['', 'Todas', sits.length],
    ['deficit', 'Déficit', g.deficit.length],
    ['superavit', 'Superávit', g.superavit.length],
    ['alerta', `Em alerta (${CONFIG.alertaMeses}+ meses no vermelho)`, g.alerta.length],
  ];

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Unidades</h1>
          <p className="sub">{rotuloPeriodo(meses, filtro.periodo)} · cada cartão mostra o orçamento de uma unidade · clique para ver as despesas por item</p>
        </div>
      </div>

      <div className="barra-ferramentas">
        <div className="chips" role="group" aria-label="Filtrar situação">
          {chips.map(([id, nome, n]) => (
            <button key={id} className={`chip ${f === id ? 'ativo' : ''} ${id ? `chip-${id}` : ''}`} onClick={() => navegar(link('unidades', { f: id }))}>
              {nome} <b>{n}</b>
            </button>
          ))}
        </div>
        <div className="ferramentas-direita">
          <input className="busca" type="search" placeholder="Buscar unidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select className="select" value={ordem} onChange={(e) => setOrdem(e.target.value)} aria-label="Ordenar">
            {Object.entries(ORDENS).map(([k, o]) => <option key={k} value={k}>{o.nome}</option>)}
          </select>
          <div className="segmentado" role="group" aria-label="Exibição">
            <button className={modo === 'cartoes' ? 'ativo' : ''} onClick={() => setModo('cartoes')}>Cartões</button>
            <button className={modo === 'tabela' ? 'ativo' : ''} onClick={() => setModo('tabela')}>Tabela</button>
          </div>
        </div>
      </div>

      {modo === 'cartoes' ? (
        <div className="grade-unidades">
          {lista.map((s) => <CartaoUnidade key={s.u.aba} s={s} janela={janela} deducao={deducoes[s.u.aba] || 0} />)}
        </div>
      ) : (
        <Card acoes={<BotaoExportar nome="situacao-unidades" cabecalho={['Unidade', 'Tipo', 'Porte', 'Receitas', 'Despesas', 'Resultado', 'Deduções', 'Com deduções', 'Situação', 'Meses no vermelho']}
          linhas={() => lista.map((s) => [s.u.nome, s.u.grupo, s.u.porte, s.rec, s.desp, s.res, deducoes[s.u.aba] || 0, s.res - (deducoes[s.u.aba] || 0), s.res < 0 ? 'Déficit' : 'Superávit', s.mesesDef])} />}
          titulo="Situação de cada unidade" sub="Passe o mouse nos pontos para ver o resultado de cada mês.">
          <div className="rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Unidade</th><th className="num">Receitas</th><th className="num">Despesas</th><th className="num">Resultado</th><th className="num">Com deduções</th><th>Situação</th>
                  {janela.map((m) => <th key={m} className="centro">{rotuloMes(m)}</th>)}
                </tr>
              </thead>
              <tbody>
                {lista.map((s) => (
                  <tr key={s.u.aba} className="clicavel" onClick={() => navegar(link('unidade', s.u.aba))}>
                    <td><a className="nome-unidade" href={link('unidade', s.u.aba)} onClick={(e) => e.stopPropagation()}>{nomeCurto(s.u.nome)}</a>
                      <span className="meta">{[contrato(s.u.aba), s.u.grupo !== CONFIG.semClassificacao && s.u.grupo, s.u.porte !== CONFIG.semClassificacao && s.u.porte].filter(Boolean).join(' · ')}</span></td>
                    <td className="num">{brl(s.rec)}</td>
                    <td className="num">{brl(s.desp)}</td>
                    <td className={`num forte ${s.res < 0 ? 'neg' : 'pos'}`}>{brl(s.res)}</td>
                    <td className="num" title={deducoes[s.u.aba] ? `Deduções: ${brl(deducoes[s.u.aba])}` : 'Sem deduções no período'}>
                      {deducoes[s.u.aba] ? <span className={s.res - deducoes[s.u.aba] < 0 ? "neg" : "pos"}>{brl(s.res - deducoes[s.u.aba])}</span> : <span className="muted">-</span>}
                    </td>
                    <td><Pill res={s.res} curto /></td>
                    {janela.map((m) => {
                      const tem = s.u.v[m], v = valor(s.u, m, 'RES');
                      return <td key={m} className="centro" title={tem ? `${rotuloMes(m)}: ${fraseResultado(v)}` : `${rotuloMes(m)}: ainda não enviou`}>
                        <span className={`ponto ${!tem ? 'ponto-nd' : v < 0 ? 'ponto-neg' : 'ponto-pos'}`} /></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {!lista.length && <p className="vazio">Nenhuma unidade encontrada.</p>}
    </>
  );
}

function CartaoUnidade({ s, janela, deducao }) {
  const { u } = s;
  const alerta = s.mesesDef >= CONFIG.alertaMeses;
  return (
    <a className={`cartao-unidade ${s.res < 0 ? 'neg' : 'pos'}`} href={link('unidade', u.aba)}>
      <div className="cartao-topo">
        <div>
          <h3>{nomeCurto(u.nome)}</h3>
          <span className="meta">{[contrato(u.aba), u.grupo !== CONFIG.semClassificacao && u.grupo, u.porte !== CONFIG.semClassificacao && u.porte].filter(Boolean).join(' · ')}</span>
        </div>
        <Pill res={s.res} curto />
      </div>
      <dl className="cartao-valores">
        <div><dt>Receitas</dt><dd>{brl(s.rec)}</dd></div>
        <div><dt>Despesas</dt><dd>{brl(s.desp)}</dd></div>
      </dl>
      <div className="cartao-resultados">
        <div className={`cartao-resultado ${s.res < 0 ? 'neg' : 'pos'}`}><small>Resultado</small>{brl(s.res)}</div>
        <div className={`cartao-deducao ${deducao ? (s.res - deducao < 0 ? 'neg' : 'pos') : 'sem'}`} title={deducao ? `Resultado ${brl(s.res)} − deduções ${brl(deducao)}` : 'Sem descontos, abatimentos ou compensações no período'}>
          <small>Com deduções</small>{deducao ? brl(s.res - deducao) : '-'}
          {deducao > 0 && <span>− {brl(deducao)} em deduções</span>}
        </div>
      </div>
      <BarrasResultado valores={janela.map((m) => (u.v[m] ? valor(u, m, 'RES') : null))} />
      <div className="cartao-rodape">
        <span className={alerta ? 'texto-alerta' : ''}>{alerta && <Icone nome="alerta" tamanho={14} />} {plural(s.mesesDef, 'mês', 'meses')} no vermelho de {s.mesesJanela}</span>
        <span className="cartao-ver">Ver detalhes <Icone nome="seta" tamanho={14} /></span>
      </div>
    </a>
  );
}
