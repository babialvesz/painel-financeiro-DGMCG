import { useMemo, useState } from 'react';
import { usePainel } from '../contexto/PainelContexto';
import { link, navegar } from '../hooks/useRota';
import { compararItens, soma } from '../utils/analise';
import { brl, nomeCurto, pct, rotuloPeriodo } from '../utils/formatacao';
import Card from '../components/comum/Card';
import Icone from '../components/comum/Icone';
import BotaoExportar from '../components/comum/BotaoExportar';
import { Progresso } from '../components/comum/Graficos';

export default function Itens() {
  const { modelo, unidades, meses, filtro } = usePainel();
  const cmp = useMemo(() => compararItens(modelo, unidades, meses), [modelo, unidades, meses]);

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Despesas por item</h1>
          <p className="sub">{rotuloPeriodo(meses, filtro.periodo)} · compare como cada tipo de despesa pesa no orçamento de cada unidade</p>
        </div>
      </div>
      <div className="aviso-suave"><Icone nome="info" tamanho={16} /> Os valores <b>não são somados</b> entre unidades. O “peso” é quanto a despesa representa do total de despesas de cada unidade, o que permite comparar unidades grandes e pequenas.</div>
      <Arvore modelo={modelo} cmp={cmp} />
      <Matriz modelo={modelo} unidades={unidades} meses={meses} />
    </>
  );
}

function Arvore({ modelo, cmp }) {
  const [busca, setBusca] = useState('');
  const [abertos, setAbertos] = useState(() => new Set());
  const { linhas, qtdBase } = cmp;

  const visiveis = useMemo(() => {
    const out = [];
    const b = busca.trim().toLowerCase();
    const casa = (c) => `${c} ${modelo.itens[c].n}`.toLowerCase().includes(b) || modelo.itens[c].filhos.some((f) => linhas[f] && casa(f));
    const visitar = (c, prof) => {
      if (!linhas[c] || (b && !casa(c))) return;
      out.push({ ...linhas[c], prof });
      if (abertos.has(c) || b) modelo.itens[c].filhos.forEach((f) => visitar(f, prof + 1));
    };
    modelo.raizes.forEach((c) => visitar(c, 0));
    return out;
  }, [modelo, linhas, abertos, busca]);

  const alternar = (c) => setAbertos((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; });

  return (
    <Card titulo="Todos os tipos de despesa" sub="Abra os grupos pela seta. Clique numa despesa para ver o ranking das unidades."
      ajuda="Peso médio: para cada unidade calculamos quanto essa despesa representa do total de despesas dela e tiramos a média entre as unidades que têm essa despesa."
      acoes={<BotaoExportar nome="despesas-por-item" cabecalho={['Código', 'Despesa', 'Unidades com essa despesa', 'Peso médio (%)', 'Unidade com maior peso', 'Maior peso (%)']}
        linhas={() => Object.values(linhas).sort((a, b) => modelo.ordemCodigo(a.c, b.c)).map((l) => [l.c, l.item.n, l.qtdUnidades, l.pesoMedio * 100, l.maior.u.nome, l.maior.pct * 100])} />}>
      <div className="barra-ferramentas">
        <input className="busca" type="search" placeholder="Buscar despesa (ex.: medicamentos, energia)" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <span className="links-acao"><button className="link" onClick={() => setAbertos(new Set(Object.keys(linhas)))}>Abrir tudo</button> · <button className="link" onClick={() => setAbertos(new Set())}>Fechar tudo</button></span>
      </div>
      <div className="rolagem">
        <table className="tabela itens">
          <thead><tr><th>Despesa</th><th className="num">Unidades com essa despesa</th><th>Peso médio no orçamento</th><th>Onde pesa mais</th><th aria-hidden="true" /></tr></thead>
          <tbody>
            {visiveis.map((l) => {
              const temFilhos = modelo.itens[l.c].filhos.some((f) => linhas[f]);
              const aberto = abertos.has(l.c) || (busca && temFilhos);
              return (
                <tr key={l.c} className={`clicavel nivel-${Math.min(l.prof, 4)}`} onClick={() => navegar(link('item', l.c))}>
                  <td style={{ paddingLeft: 10 + l.prof * 18 }}>
                    {temFilhos
                      ? <button className={`caret ${aberto ? 'aberto' : ''}`} aria-expanded={aberto} aria-label={aberto ? 'Fechar' : 'Abrir'} onClick={(e) => { e.stopPropagation(); alternar(l.c); }}>›</button>
                      : <span className="caret-espaco" />}
                    <a className="item-nome" href={link('item', l.c)} onClick={(e) => e.stopPropagation()}>{l.item.n}</a> <span className="codigo">{l.c}</span>
                  </td>
                  <td className="num">{l.qtdUnidades} <span className="muted">de {qtdBase}</span></td>
                  <td className="col-peso"><span className="peso"><Progresso valor={l.pesoMedio} /><span>{pct(l.pesoMedio)}</span></span></td>
                  <td><span className="onde">{nomeCurto(l.maior.u.nome)}</span> <span className="muted">{pct(l.maior.pct)}</span></td>
                  <td className="col-seta" aria-hidden="true">›</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Matriz({ modelo, unidades, meses }) {
  const [modo, setModo] = useState('pct');
  const dados = useMemo(() => {
    const linhas = unidades
      .map((u) => ({ u, desp: soma(u, 'DESP', meses), cel: Object.fromEntries(modelo.raizes.map((c) => [c, soma(u, c, meses)])) }))
      .filter((l) => l.desp > 0)
      .sort((a, b) => nomeCurto(a.u.nome).localeCompare(nomeCurto(b.u.nome), 'pt-BR'));
    const colunas = modelo.raizes.filter((c) => linhas.some((l) => l.cel[c]));
    const maxPct = Object.fromEntries(colunas.map((c) => [c, Math.max(...linhas.map((l) => l.cel[c] / l.desp), 0.0001)]));
    return { linhas, colunas, maxPct };
  }, [modelo, unidades, meses]);

  return (
    <Card titulo="Cada unidade, cada grupo de despesa" sub="Cor mais forte = o grupo pesa mais no orçamento daquela unidade do que nas outras. Clique numa célula para abrir o detalhe."
      acoes={<>
        <div className="segmentado" role="group" aria-label="Mostrar">
          <button className={modo === 'pct' ? 'ativo' : ''} onClick={() => setModo('pct')}>Peso (%)</button>
          <button className={modo === 'valor' ? 'ativo' : ''} onClick={() => setModo('valor')}>Valor (R$)</button>
        </div>
        <BotaoExportar nome="unidades-x-grupos" cabecalho={['Unidade', 'Despesas (total)', ...dados.colunas.map((c) => `${c}. ${modelo.itens[c].n}`)]}
          linhas={() => dados.linhas.map((l) => [l.u.nome, l.desp, ...dados.colunas.map((c) => l.cel[c])])} />
      </>}>
      <div className="rolagem">
        <table className="tabela matriz-itens">
          <thead>
            <tr><th>Unidade</th><th className="num">Despesas (total)</th>
              {dados.colunas.map((c) => <th key={c} className="col-grupo"><a href={link('item', c)}>{modelo.itens[c].n}</a></th>)}</tr>
          </thead>
          <tbody>
            {dados.linhas.map((l) => (
              <tr key={l.u.aba}>
                <td><a href={link('unidade', l.u.aba)} className="nome-unidade">{nomeCurto(l.u.nome)}</a></td>
                <td className="num forte">{brl(l.desp)}</td>
                {dados.colunas.map((c) => {
                  const v = l.cel[c], p = v / l.desp, a = Math.min(1, p / dados.maxPct[c]);
                  return (
                    <td key={c} className="num celula-calor" style={v ? { background: `color-mix(in srgb, var(--acento) ${Math.round(8 + a * 55)}%, transparent)` } : undefined}
                      title={`${nomeCurto(l.u.nome)} · ${modelo.itens[c].n}\nDespesa: ${brl(v)} (${pct(p)} do total da unidade)`}
                      onClick={() => navegar(link('unidade', l.u.aba, { item: c }))}>
                      {v ? (modo === 'valor' ? brl(v) : pct(p)) : '–'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
