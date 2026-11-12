// Despesas por item: ranking pela fatia do gasto, comparação com as parecidas,
// detalhe da unidade (subitens × meses), tabela das partes e comparação lado a lado.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { usePainel } from '../contexto/PainelContexto';
import { CONFIG } from '../config';
import { rotuloPeriodo } from '../utils/formatacao';
import {
  caminho, criarReferencias, faixaMeses, fatia, mesCurto, mesLongo, nomeItem, nomeItemCurto, opcoesDespesa,
  ORDEM_PORTE, pct0, prepararUnidades, raizDe, reais, reaisLongo,
} from '../utils/despesas';
import BotaoExportar from '../components/comum/BotaoExportar';
import '../styles/despesas.css';

const SELO = {
  acima: <span className="selo acima">▲ Bem acima das parecidas</span>,
  abaixo: <span className="selo abaixo">▼ Bem abaixo das parecidas</span>,
  inc: <span className="selo inc">◔ Dados incompletos</span>,
};
const ICO = { acima: '▲ ', abaixo: '▼ ' };
const COR = ['var(--s1)', 'var(--s2)', 'var(--s3)'];
const COR_SUAVE = ['var(--s1-suave)', 'var(--s2-suave)', 'var(--s3-suave)'];
const TIPOS_PILULA = [['', 'Todas'], ['Hospitais', 'Hospitais'], ['UPAs', 'UPAs'], ['UPAEs', 'UPAEs'], [CONFIG.semClassificacao, 'Outros']];
const rotuloPorte = (p) => (p === CONFIG.semClassificacao ? 'Sem porte' : p);
const ordemPorte = (a, b) => ORDEM_PORTE.indexOf(rotuloPorte(a)) - ORDEM_PORTE.indexOf(rotuloPorte(b));
const meses = (x, n) => `${x.nMeses} de ${n} meses`;

const IconeBusca = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
);

export default function DespesasPorItem({ codigo }) {
  const { modelo, unidades, meses: P, filtro, alterarFiltro } = usePainel();
  const todas = useMemo(() => prepararUnidades(modelo, P), [modelo, P]);
  const calc = useMemo(() => criarReferencias(todas), [todas]);
  const opcoes = useMemo(() => opcoesDespesa(modelo, calc.comGasto), [modelo, calc]);
  const porA = useMemo(() => Object.fromEntries(todas.map((x) => [x.a, x])), [todas]);
  const valido = (c) => opcoes.some(([k]) => k === c);
  const inicial = valido(codigo) ? codigo : (opcoes[0]?.[0] || '');

  const [aba, setAba] = useState('rank');
  const [item, setItem] = useState(inicial);
  const [itemCmp, setItemCmp] = useState(inicial);
  const [escolhidas, setEscolhidas] = useState([]);
  const [cmp, setCmp] = useState([]);
  useEffect(() => { if (codigo && valido(codigo)) { setItem(codigo); setAba('rank'); } }, [codigo]); // eslint-disable-line
  useEffect(() => { if (item && !valido(item)) setItem(opcoes[0]?.[0] || ''); if (itemCmp && !valido(itemCmp)) setItemCmp(opcoes[0]?.[0] || ''); }, [opcoes]); // eslint-disable-line

  const ctx = { modelo, todas, calc, opcoes, porA, P, filtro, alterarFiltro, unidades };
  const abaRank = useRef(null), abaCmp = useRef(null);
  const trocaAba = (a) => { setAba(a); (a === 'rank' ? abaRank : abaCmp).current?.focus(); };
  const teclaAba = (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); trocaAba(aba === 'rank' ? 'cmp' : 'rank'); } };

  if (!opcoes.length) {
    return (
      <div className="dpi"><div className="titulo-pagina"><div><h1>Despesas por item</h1></div></div>
        <div className="card"><p>Nenhuma despesa lançada no período escolhido.</p></div></div>
    );
  }

  return (
    <div className="dpi">
      <div className="titulo-pagina">
        <div>
          <h1>Despesas por item</h1>
          <p className="sub">{rotuloPeriodo(P, filtro.periodo)} · Cada unidade tem o seu próprio orçamento. Comparamos a <b>fatia</b> do gasto: de cada R$ 100 gastos, quanto vai para cada despesa. Cada unidade é comparada com as <b>parecidas</b> (mesmo tipo e porte).</p>
        </div>
      </div>
      <div className="abas-dpi" role="tablist" aria-label="Formas de ver">
        <button ref={abaRank} role="tab" id="t-rank" aria-selected={aba === 'rank'} aria-controls="p-rank" tabIndex={aba === 'rank' ? 0 : -1} onClick={() => setAba('rank')} onKeyDown={teclaAba}>Ranking por despesa</button>
        <button ref={abaCmp} role="tab" id="t-cmp" aria-selected={aba === 'cmp'} aria-controls="p-cmp" tabIndex={aba === 'cmp' ? 0 : -1} onClick={() => setAba('cmp')} onKeyDown={teclaAba}>Comparar unidades {cmp.length ? `(${cmp.length})` : ''}</button>
      </div>
      <section id="p-rank" role="tabpanel" aria-labelledby="t-rank" hidden={aba !== 'rank'}>
        {aba === 'rank' && <Ranking ctx={ctx} item={item} setItem={setItem} escolhidas={escolhidas} setEscolhidas={setEscolhidas}
          aoComparar={(a) => { setCmp((l) => (l.includes(a) ? l : [...l, a].slice(-3))); setItemCmp(item); trocaAba('cmp'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
      </section>
      <section id="p-cmp" role="tabpanel" aria-labelledby="t-cmp" hidden={aba !== 'cmp'}>
        {aba === 'cmp' && <Comparacao ctx={ctx} item={itemCmp} setItem={setItemCmp} cmp={cmp} setCmp={setCmp} />}
      </section>
    </div>
  );
}

/* ---------- menus de despesa (item / subitem) ---------- */
function SeletorDespesa({ id, rotulo, opcoes, modelo, valor, onChange }) {
  const raiz = raizDe(valor);
  const subs = opcoes.filter(([c]) => c !== raiz && raizDe(c) === raiz);
  return (
    <div className="dois-menus">
      <div><label className="rotulo" htmlFor={`d-${id}`}>{rotulo}: item</label>
        <div className="sel-desp"><select id={`d-${id}`} value={raiz} onChange={(e) => onChange(e.target.value)}>
          {opcoes.filter(([, n]) => n === 0).map(([c]) => <option key={c} value={c}>{nomeItemCurto(modelo.itens[c])}</option>)}
        </select></div></div>
      <div><label className="rotulo" htmlFor={`s-${id}`}>Subitem (opcional)</label>
        <div className="sel-desp"><select id={`s-${id}`} value={valor} disabled={!subs.length} onChange={(e) => onChange(e.target.value)}>
          <option value={raiz}>{subs.length ? `Todo o item (${nomeItemCurto(modelo.itens[raiz])})` : 'Este item não tem subitens'}</option>
          {subs.map(([c, n]) => <option key={c} value={c}>{' '.repeat(n - 1)}{n > 1 ? '• ' : ''}{nomeItemCurto(modelo.itens[c])}</option>)}
        </select></div></div>
    </div>
  );
}

/* ---------- menu de unidades com busca por escrita ---------- */
function ComboUnidades({ id, titulo, vazio, lista, selecionadas, alternar }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [foco, setFoco] = useState(-1);
  const inp = useRef(null), caixa = useRef(null);
  const t = busca.trim().toLowerCase();
  const res = lista.filter((x) => !t || `${x.nome} ${x.tipo} ${x.porte}`.toLowerCase().includes(t));
  const grupos = ['Hospitais', 'UPAs', 'UPAEs', 'Outros'].map((g) => [g, res.filter((x) => x.tipo === g).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))]).filter(([, l]) => l.length);
  const plana = grupos.flatMap(([, l]) => l);
  useEffect(() => { if (foco >= 0) caixa.current?.querySelector(`[data-k="${foco}"]`)?.scrollIntoView({ block: 'nearest' }); }, [foco]);
  const fechar = () => { setAberto(false); setFoco(-1); };
  const tecla = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAberto(true); setFoco((f) => Math.min(plana.length - 1, f + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFoco((f) => Math.max(0, f - 1)); }
    else if (e.key === 'Enter' && plana[foco]) { e.preventDefault(); alternar(plana[foco].a); }
    else if (e.key === 'Escape') fechar();
  };
  let k = 0;
  return (
    <div className={`combo ${aberto ? 'aberto' : ''}`} ref={caixa}>
      <div className="combo-cab"><b>{titulo}</b>
        <button type="button" className="bt-contorno" onMouseDown={(e) => { e.preventDefault(); inp.current?.blur(); fechar(); }}>Concluir ({selecionadas.length})</button></div>
      <div className="combo-campo" onClick={() => inp.current?.focus()}>
        <span aria-hidden="true" className="combo-lupa"><IconeBusca /></span>
        <input ref={inp} id={`ci-${id}`} role="combobox" aria-expanded={aberto} aria-controls={`cl-${id}`} aria-autocomplete="list" autoComplete="off"
          aria-activedescendant={aberto && plana[foco] ? `op-${id}-${foco}` : undefined}
          placeholder={selecionadas.length ? 'Digite para buscar mais' : vazio} aria-label={`${titulo}: digite para buscar`} value={busca}
          onChange={(e) => { setBusca(e.target.value); setFoco(0); setAberto(true); }} onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => { if (document.activeElement !== inp.current) fechar(); }, 150)} onKeyDown={tecla} />
        <button type="button" className="seta" aria-label="Abrir lista de unidades" onMouseDown={(e) => { e.preventDefault(); if (aberto) fechar(); else { inp.current?.focus(); setAberto(true); } }} />
      </div>
      {aberto && (
        <div className="combo-lista" id={`cl-${id}`} role="listbox" aria-multiselectable="true" aria-label={titulo}>
          {!plana.length && <div className="combo-vazio">Nenhuma unidade encontrada. Confira a escrita ou apague parte do nome.</div>}
          {grupos.map(([g, l]) => (
            <Fragment key={g}>
              <div className="combo-grupo" role="presentation">{g}</div>
              {l.map((x) => {
                const kk = k++, sel = selecionadas.includes(x.a);
                return (
                  <button type="button" tabIndex={-1} key={x.a} id={`op-${id}-${kk}`} data-k={kk} className={`combo-op ${kk === foco ? 'foco' : ''}`} role="option" aria-selected={sel}
                    onMouseDown={(e) => { e.preventDefault(); alternar(x.a); }}>
                    <span className="ck" aria-hidden="true">{sel ? '✓' : ''}</span><span>{x.nome}</span><small>{x.porte}</small>
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function Etiquetas({ lista, tirar, cores }) {
  return lista.map((x, k) => (
    <span key={x.a} className="escolhida" style={cores ? { background: COR_SUAVE[k], color: 'var(--texto)' } : undefined}>{x.nome}
      <button type="button" aria-label={`Tirar ${x.nome}`} onClick={() => tirar(x.a)}><span aria-hidden="true">✕</span></button></span>
  ));
}

function Seg({ rotulo, id, valor, opcoes, onChange }) {
  return (
    <div className="mostrar-como"><span id={id}>{rotulo}</span>
      <div className="seg2" role="radiogroup" aria-labelledby={id}>
        {opcoes.map(([v, n]) => <button key={v} type="button" role="radio" aria-checked={valor === v} onClick={() => onChange(v)}>{n}</button>)}
      </div></div>
  );
}

/* ---------- RANKING ---------- */
function Ranking({ ctx, item: c, setItem, escolhidas, setEscolhidas, aoComparar }) {
  const { modelo, todas, calc, opcoes, porA, P, filtro, alterarFiltro, unidades } = ctx;
  const [aberta, setAberta] = useState(null);
  const [modo, setModo] = useState('lista');
  const [ordem, setOrdem] = useState('fatia');
  const [todasVis, setTodasVis] = useState(false);
  const [tipoAberto, setTipoAberto] = useState(false);
  const li11 = useRef(null), btTodas = useRef(null), focarDepois = useRef(null);
  useEffect(() => { if (focarDepois.current === 'li') li11.current?.focus(); if (focarDepois.current === 'bt') btTodas.current?.focus(); focarDepois.current = null; });

  const naFiltroGlobal = useMemo(() => new Set(unidades.map((u) => u.aba)), [unidades]);
  const naSelecao = (x) => naFiltroGlobal.has(x.a) && (!escolhidas.length || escolhidas.includes(x.a));
  const base = calc.comGasto.filter(naSelecao);
  const lista = base.filter((x) => x.tot(c)).map((x) => ({ x, p: fatia(x, c), v: x.tot(c), r: calc.referencia(x, c), e: calc.estado(x, c) }));
  const dif = (l) => (l.r ? l.p - l.r.media : -9);
  lista.sort((a, b) => (a.x.incompleta - b.x.incompleta) || (ordem === 'dif' ? dif(b) - dif(a) : b.p - a.p));
  const naoLanc = base.filter((x) => !x.tot(c));
  const semGasto = todas.filter((x) => !(x.desp > 0) && naSelecao(x));
  const max = Math.max(0.01, ...lista.map((l) => Math.max(l.p, l.r ? l.r.media : 0)));
  const nA = lista.filter((l) => l.e === 'acima').length, nB = lista.filter((l) => l.e === 'abaixo').length, nI = lista.filter((l) => l.e === 'inc').length;
  const mostrar = todasVis || escolhidas.length ? lista : lista.slice(0, 10);
  const temPartes = (modelo.itens[c]?.filhos || []).some((f) => base.some((x) => x.tot(f)));
  const nomeC = nomeItemCurto(modelo.itens[c]);
  const pos = (v) => (v / max) * 100;
  const portes = [...new Set(modelo.unidades.filter((u) => !filtro.grupo || u.grupo === filtro.grupo).map((u) => u.porte).filter(Boolean))].sort(ordemPorte);
  const contaPorte = (p) => modelo.unidades.filter((u) => (!filtro.grupo || u.grupo === filtro.grupo) && u.porte === p).length;
  const mudaItem = (v) => { setItem(v); setAberta(null); setTodasVis(false); };

  // trilha
  const baseRot = escolhidas.length ? `${escolhidas.length} ${escolhidas.length === 1 ? 'unidade escolhida' : 'unidades escolhidas'}`
    : (filtro.grupo || filtro.porte) ? [filtro.grupo ? (filtro.grupo === CONFIG.semClassificacao ? 'Outras unidades' : filtro.grupo) : 'Todas as unidades', filtro.porte && rotuloPorte(filtro.porte)].filter(Boolean).join(' · ')
      : 'Todas as unidades';
  const niveis = [{ rot: baseRot }, ...caminho(modelo, c).map((k) => ({ rot: nomeItemCurto(modelo.itens[k]), item: k }))];
  if (aberta && porA[aberta]) niveis.push({ rot: porA[aberta].nome });
  const ult = niveis.length - 1;
  const pen = niveis.slice(0, ult).reverse().find((n) => n.item);

  return (
    <>
      <div className="card filtros-card">
        <div><label className="rotulo" htmlFor="ci-rank">Unidades específicas (opcional)</label>
          <ComboUnidades id="rank" titulo="Unidades específicas" vazio="Todas as unidades" lista={calc.comGasto} selecionadas={escolhidas}
            alternar={(a) => setEscolhidas((l) => (l.includes(a) ? l.filter((y) => y !== a) : [...l, a]))} />
          {escolhidas.length > 0 && (
            <div className="escolhidas"><Etiquetas lista={escolhidas.map((a) => porA[a]).filter(Boolean)} tirar={(a) => setEscolhidas((l) => l.filter((y) => y !== a))} />
              <button type="button" className="link-dpi" onClick={() => setEscolhidas([])}>Limpar seleção</button></div>
          )}
        </div>
        <SeletorDespesa id="item" rotulo="Despesa" opcoes={opcoes} modelo={modelo} valor={c} onChange={mudaItem} />
        <button type="button" className="bt-contorno bt-mais-filtros" aria-expanded={tipoAberto} aria-controls="filtros-extra" onClick={() => setTipoAberto((v) => !v)}>
          <span>Tipo e porte{filtro.grupo || filtro.porte ? ' (filtro ativo)' : ''}</span><b aria-hidden="true">{tipoAberto ? '▴' : '▾'}</b></button>
        <div className={`filtros-extra ${tipoAberto ? 'aberto' : ''}`} id="filtros-extra">
          <div><span className="rotulo" id="lb-tipo">Tipo de unidade</span>
            <div className="pilulas" role="group" aria-labelledby="lb-tipo">
              {TIPOS_PILULA.map(([v, n]) => <button key={n} type="button" className="pilula" aria-pressed={filtro.grupo === v} onClick={() => { alterarFiltro({ grupo: v }); setAberta(null); }}>{n}</button>)}
            </div></div>
          <div><span className="rotulo" id="lb-porte">Porte</span>
            <div className="pilulas" role="group" aria-labelledby="lb-porte">
              <button type="button" className="pilula" aria-pressed={!filtro.porte} onClick={() => alterarFiltro({ porte: '' })}>Todos</button>
              {portes.map((p) => <button key={p} type="button" className="pilula" aria-pressed={filtro.porte === p} onClick={() => { alterarFiltro({ porte: p }); setAberta(null); }}>{rotuloPorte(p)} <small>({contaPorte(p)})</small></button>)}
            </div></div>
        </div>
      </div>

      <div className="card">
        <nav className="trilha" aria-label="Onde você está">
          <ol className="trilha-completa">{niveis.map((n, i) => (
            <li key={i}>{i === ult ? <span aria-current="location">{n.rot}</span> : n.item ? <button type="button" onClick={() => mudaItem(n.item)}>{n.rot}</button> : <span>{n.rot}</span>}</li>
          ))}</ol>
          {pen && <ol className="trilha-voltar"><li><button type="button" onClick={() => mudaItem(pen.item)}>‹ Voltar para {pen.rot}</button></li></ol>}
        </nav>
        <div className="cab-resultado"><h2>{nomeC} em cada unidade</h2>
          <div className="controles">
            {temPartes && <Seg rotulo="Mostrar como:" id="lb-mc" valor={modo} onChange={setModo} opcoes={[['lista', 'Ranking'], ['matriz', 'Tabela das partes']]} />}
            {(modo !== 'matriz' || !temPartes) && <Seg rotulo="Ordenar por:" id="lb-or" valor={ordem} onChange={setOrdem} opcoes={[['fatia', 'Maior fatia'], ['dif', 'Diferença para as parecidas']]} />}
            <BotaoExportar nome={`despesas-${c}`} cabecalho={['Unidade', 'Tipo', 'Porte', 'Meses enviados', `Fatia de ${nomeC} (%)`, 'Valor (R$)', 'Média das parecidas (%)', 'Parecidas usadas', 'Situação']}
              linhas={() => lista.map((l) => [l.x.u.nome, l.x.tipo, l.x.porte, l.x.nMeses, l.p * 100, l.v, l.r ? l.r.media * 100 : '', l.r ? l.r.rotulo : '', { acima: 'Bem acima', abaixo: 'Bem abaixo', inc: 'Dados incompletos' }[l.e] || 'Dentro do normal'])} />
          </div></div>

        {modo === 'matriz' && temPartes ? <TabelaPartes ctx={ctx} base={base} c={c} /> : lista.length ? (
          <>
            <div className="resumo-dpi">
              <span className="num acima"><b>{nA}</b>▲ bem acima</span><span className="num abaixo"><b>{nB}</b>▼ bem abaixo</span>
              <p>das parecidas, entre {lista.length} {lista.length === 1 ? 'unidade' : 'unidades'} com {nomeC.toLowerCase()}. Cada unidade é comparada com a média das unidades do mesmo tipo e porte.{nI ? ` ${nI} com dados incompletos ${nI === 1 ? 'fica' : 'ficam'} no fim da lista, sem alerta.` : ''}</p>
            </div>
            <div className="legenda-dpi" aria-hidden="true"><span><i />Dentro do normal</span><span><i className="acima" />▲ Bem acima</span><span><i className="abaixo" />▼ Bem abaixo</span><span><i className="lm" />Média das parecidas</span></div>
            <ol className="ranking">
              {mostrar.map((l, ix) => {
                const ab = aberta === l.x.a;
                const mp = l.r ? Math.min(92, Math.max(8, pos(l.r.media))) : 0;
                return (
                  <li key={l.x.a} className={`linha-rank ${ab ? 'aberta' : ''}`} tabIndex={-1} ref={ix === 10 ? li11 : undefined}>
                    <div className="nome"><b>{l.x.nome}</b><small>{l.x.tipo} · {l.x.porte} · {meses(l.x, P.length)}</small>{SELO[l.e]}</div>
                    <div className="grafico">
                      {l.p >= 0 ? (
                        <div className="trilho-dpi" aria-hidden="true"><span className={`barra-dpi ${l.e}`} style={{ width: `${pos(l.p)}%` }} />{l.r && <span className="marca" style={{ left: `${pos(l.r.media)}%` }} />}</div>
                      ) : <div className="estorno">Fatia negativa: estorno ou ajuste</div>}
                      {l.r && <small className="ref-txt" style={{ left: `${mp}%` }}>parecidas: {pct0(l.r.media)}</small>}
                    </div>
                    <div className="valor"><b>{pct0(l.p)}</b><small>{reais(l.v)}{l.v < 0 ? ' · estorno ou ajuste' : ''}</small></div>
                    {temPartes && <button type="button" className="bt-detalhar" aria-expanded={ab} aria-label={`${ab ? 'Fechar' : 'Detalhar'} o gasto de ${l.x.nome} em cada subitem`} onClick={() => setAberta(ab ? null : l.x.a)}>{ab ? 'Fechar ▴' : 'Detalhar ▾'}</button>}
                    {ab && <div className="detalhe-linha"><DetalheUnidade ctx={ctx} x={l.x} c={c} aoComparar={aoComparar} /></div>}
                  </li>
                );
              })}
            </ol>
            {!escolhidas.length && lista.length > 10 && (
              <div className="mostrar-todas"><button ref={btTodas} type="button" className="bt-contorno" aria-expanded={todasVis}
                onClick={() => { focarDepois.current = todasVis ? 'bt' : 'li'; setTodasVis(!todasVis); }}>{todasVis ? 'Mostrar só as 10 primeiras' : `Mostrar todas as ${lista.length} unidades`}</button></div>
            )}
          </>
        ) : <p>Nenhuma unidade desta seleção lançou essa despesa.</p>}
        {(naoLanc.length > 0 || semGasto.length > 0) && modo !== 'matriz' && (
          <div className="recolhidos">
            {naoLanc.length > 0 && <details><summary>{naoLanc.length} {naoLanc.length === 1 ? 'unidade não lançou' : 'unidades não lançaram'} {nomeC.toLowerCase()} ▾</summary><ul>{naoLanc.map((x) => <li key={x.a}>{x.nome}</li>)}</ul></details>}
            {semGasto.length > 0 && <details><summary>{semGasto.length} {semGasto.length === 1 ? 'unidade sem gasto informado' : 'unidades sem gasto informado'} no período ▾</summary><ul>{semGasto.map((x) => <li key={x.a}>{x.nome}</li>)}</ul></details>}
          </div>
        )}
      </div>
    </>
  );
}

/* células de mês */
function CelMes({ x, serie, k }) {
  if (!x.enviou(x.mesesP[k])) return <td className="sem">sem envio</td>;
  const v = serie[k];
  if (!v) return <td>—</td>;
  return <td>{reais(v)}{v < 0 && <small>estorno ou ajuste</small>}</td>;
}
function ListaMeses({ x, serie, P }) {
  return (
    <ul className="lista-meses">{P.map((m, k) => {
      const v = serie[k];
      return <li key={m}><span>{mesLongo(m)}</span><b>{!x.enviou(m) ? 'sem envio' : v ? reais(v) : '—'}{x.enviou(m) && v < 0 && <small>estorno ou ajuste</small>}</b></li>;
    })}</ul>
  );
}

/* ---------- detalhe de UMA unidade: subitens × meses ---------- */
function DetalheUnidade({ ctx, x, c, aoComparar }) {
  const { modelo, calc, P } = ctx;
  const xp = { ...x, mesesP: P };
  const subs = (modelo.itens[c]?.filhos || []).filter((f) => calc.comGasto.some((y) => y.tot(f))).slice().sort(modelo.ordemCodigo);
  const rc = calc.referencia(x, c);
  const nome = (f) => { const n = nomeItemCurto(modelo.itens[f]), nc = nomeItem(modelo.itens[f]); return <><b>{n}</b>{nc !== n && <small>{nc}</small>}</>; };
  return (
    <>
      <p className="frase" style={{ margin: '0 0 10px' }}><b>{x.nome}</b> · gasto em cada subitem de <b>{nomeItemCurto(modelo.itens[c]).toLowerCase()}</b> · {meses(x, P.length)}</p>
      {x.incompleta && <p className="nota" style={{ margin: '0 0 10px' }}>{SELO.inc} Esta unidade enviou poucos meses, então não recebe alertas.</p>}
      <div className="det-tabela">
        <p className="legenda-tab"><span>“—” = não lançou</span><span>▲ bem acima das parecidas</span><span>▼ bem abaixo</span><span>Hachurado = mês sem envio</span>{rc && <span>Parecidas: {rc.rotulo}</span>}</p>
        <div className="matriz-wrap"><table className="matriz">
          <caption className="sr">Gasto de {x.nome} em cada subitem de {nomeItemCurto(modelo.itens[c])}</caption>
          <thead><tr><th className="un" scope="col">Subitem</th><th scope="col">Total no período</th><th scope="col">Fatia do gasto<small>e parecidas</small></th>
            {P.map((m) => <th key={m} scope="col">{mesCurto(m)}{!x.enviou(m) && <small>sem envio</small>}</th>)}</tr></thead>
          <tbody>
            <tr className="total"><td className="un"><b>Total de {nomeItemCurto(modelo.itens[c])}</b></td><td className="v">{reais(x.tot(c))}</td>
              <td className="v">{pct0(fatia(x, c))}<small>{rc ? `parecidas ${pct0(rc.media)}` : ''}</small></td>
              {P.map((m, k) => <CelMes key={m} x={xp} serie={x.serie(c)} k={k} />)}</tr>
            {subs.map((f) => {
              const v = x.tot(f);
              if (!v) return <tr key={f}><td className="un">{nome(f)}</td><td className="nao" colSpan={2}>— não lançou</td>{P.map((m) => (x.enviou(m) ? <td key={m}>—</td> : <td key={m} className="sem">sem envio</td>))}</tr>;
              const r = calc.referencia(x, f), e = calc.estado(x, f);
              return (
                <tr key={f}><td className="un">{nome(f)}</td><td className="v">{reais(v)}{v < 0 && <small>estorno ou ajuste</small>}</td>
                  <td className={`v ${e === 'acima' || e === 'abaixo' ? e : ''}`}>{ICO[e] || ''}{pct0(fatia(x, f))}<small>{r ? `parecidas ${pct0(r.media)}` : 'sem parecidas'}</small></td>
                  {P.map((m, k) => <CelMes key={m} x={xp} serie={x.serie(f)} k={k} />)}</tr>
              );
            })}
          </tbody></table></div>
      </div>
      <ul className="det-cartoes">
        <li className="det-cartao total"><b className="det-nome">Total de {nomeItemCurto(modelo.itens[c])}</b>
          <dl><div><dt>Total</dt><dd>{reais(x.tot(c))}</dd></div><div><dt>Fatia do gasto</dt><dd>{pct0(fatia(x, c))}</dd></div><div><dt>Parecidas</dt><dd>{rc ? pct0(rc.media) : '—'}</dd></div></dl>
          <details className="mes-a-mes"><summary>Ver mês a mês ▾</summary><ListaMeses x={x} serie={x.serie(c)} P={P} /></details></li>
        {subs.map((f) => {
          const v = x.tot(f);
          if (!v) return <li key={f} className="det-cartao"><b className="det-nome">{nomeItem(modelo.itens[f])}</b><dl><div><dt>Total</dt><dd>— não lançou</dd></div></dl></li>;
          const r = calc.referencia(x, f), e = calc.estado(x, f);
          return (
            <li key={f} className={`det-cartao ${e === 'acima' || e === 'abaixo' ? e : ''}`}><b className="det-nome">{nomeItem(modelo.itens[f])}</b>
              <dl><div><dt>Total</dt><dd>{reais(v)}{v < 0 ? ' (estorno ou ajuste)' : ''}</dd></div><div><dt>Fatia do gasto</dt><dd className={e}>{ICO[e] || ''}{pct0(fatia(x, f))}</dd></div><div><dt>Parecidas</dt><dd>{r ? pct0(r.media) : 'sem parecidas'}</dd></div></dl>
              {e !== 'inc' && SELO[e]}
              <details className="mes-a-mes"><summary>Ver mês a mês ▾</summary><ListaMeses x={x} serie={x.serie(f)} P={P} /></details></li>
          );
        })}
      </ul>
      <div style={{ marginTop: 12 }}><button type="button" className="bt-contorno" onClick={() => aoComparar(x.a)}>Comparar esta unidade com outras →</button></div>
    </>
  );
}

/* ---------- tabela das partes: unidades × subitens ---------- */
function TabelaPartes({ ctx, base, c }) {
  const { modelo, calc } = ctx;
  const cols = (modelo.itens[c]?.filhos || []).filter((f) => base.some((x) => x.tot(f))).slice().sort(modelo.ordemCodigo);
  const linhas = base.filter((x) => x.tot(c)).sort((a, b) => (a.incompleta - b.incompleta) || (fatia(b, c) - fatia(a, c)));
  const Cel = ({ x, f }) => {
    const v = x.tot(f); if (!v) return <td className="nao">—</td>;
    const e = calc.estado(x, f), r = calc.referencia(x, f);
    return <td className={`v ${e === 'acima' || e === 'abaixo' ? e : ''}`}>{ICO[e] || ''}{pct0(fatia(x, f))}<small>{r ? `parecidas ${pct0(r.media)}` : 'sem parecidas'}</small></td>;
  };
  const nomeC = nomeItemCurto(modelo.itens[c]);
  return (
    <>
      <p className="legenda-tab"><span>Cada célula: quanto a parte pesa no gasto da unidade, e a média das parecidas dela.</span><span>▲ contorno vermelho = bem acima</span><span>▼ contorno âmbar = bem abaixo</span><span>“—” = não lançou</span></p>
      <p className="arraste">Arraste a tabela para o lado →</p>
      <div className="matriz-wrap"><table className="matriz">
        <caption className="sr">{nomeC}: fatia de cada parte, por unidade</caption>
        <thead><tr><th className="un" scope="col">Unidade</th><th scope="col">{nomeC}<small>total</small></th>{cols.map((f) => <th key={f} scope="col">{nomeItemCurto(modelo.itens[f])}</th>)}</tr></thead>
        <tbody>{linhas.map((x) => (
          <tr key={x.a}><th className="un" scope="row"><b>{x.nome}</b><small>{x.tipo} · {x.porte} · {meses(x, ctx.P.length)}</small>{x.incompleta && SELO.inc}</th>
            <Cel x={x} f={c} />{cols.map((f) => <Cel key={f} x={x} f={f} />)}</tr>
        ))}</tbody></table></div>
      <p className="nota">Ordenado pela fatia total de {nomeC.toLowerCase()}. Unidades com dados incompletos ficam no fim, sem alerta.</p>
    </>
  );
}

/* ---------- COMPARAÇÃO lado a lado ---------- */
function Comparacao({ ctx, item: c, setItem, cmp, setCmp }) {
  const { modelo, calc, opcoes, porA, P } = ctx;
  const us = cmp.map((a) => porA[a]).filter(Boolean);
  const comuns = P.filter((m) => us.every((x) => x.enviou(m)));
  const fat = us.map((x) => fatia(x, c)), maxFat = Math.max(...fat, 0);
  const somaComuns = (x, k) => comuns.reduce((s, m) => s + (x.u.v[m]?.[k] || 0), 0);
  const txtComuns = us.length > 1 ? `Soma de ${faixaMeses(comuns)}, meses que ${us.length === 2 ? 'as duas' : 'as três'} enviaram` : `Soma de ${faixaMeses(comuns)}, meses enviados`;
  const maiores = (x) => modelo.raizes.filter((g) => x.tot(g) > 0).map((g) => ({ g, p: fatia(x, g) })).sort((a, b) => b.p - a.p).slice(0, 4);
  const nomeC = nomeItemCurto(modelo.itens[c]);
  const tirar = (a) => { setCmp((l) => l.filter((y) => y !== a)); document.getElementById('ci-cmp')?.focus(); };
  return (
    <div className="card">
      <div className="cmp-topo"><h2>Comparar unidades lado a lado</h2><p className="frase">Cada cartão mostra os números da própria unidade. Nada é somado entre unidades.</p></div>
      <div className="filtros-cmp">
        <div><label className="rotulo" htmlFor="ci-cmp">Unidades comparadas (até 3)</label>
          <ComboUnidades id="cmp" titulo="Unidades comparadas" vazio="Escolher unidades" lista={calc.comGasto} selecionadas={cmp}
            alternar={(a) => setCmp((l) => (l.includes(a) ? l.filter((y) => y !== a) : l.length < 3 ? [...l, a] : l))} />
          {us.length > 0 && <div className="escolhidas"><Etiquetas lista={us} tirar={tirar} cores /></div>}
        </div>
        <div><SeletorDespesa id="itemCmp" rotulo="Despesa comparada" opcoes={opcoes} modelo={modelo} valor={c} onChange={setItem} /></div>
      </div>
      {us.length > 1 && <div className="resumo-cmp" aria-label={`Resumo da fatia de ${nomeC.toLowerCase()}`}>{us.map((x, k) => <span key={x.a} style={{ background: COR_SUAVE[k] }}>Unidade {k + 1} · {x.nome}: <b>{pct0(fat[k])}</b></span>)}</div>}
      <div className="cmp">
        {us.map((x, k) => {
          const p = fat[k], r = calc.referencia(x, c), e = calc.estado(x, c), serie = x.serie(c), mx = Math.max(...serie, 1);
          return (
            <article key={x.a} className="cc" aria-label={`Unidade ${k + 1}: ${x.nome}`}>
              <div className="cc-topo" style={{ background: COR[k] }}><span className="u">Unidade {k + 1}</span><h3>{x.nome}</h3><span className="info">{x.tipo} · {x.porte} · {meses(x, P.length)}</span>
                <button type="button" className="x" aria-label={`Tirar ${x.nome} da comparação`} onClick={() => tirar(x.a)}>✕</button></div>
              <div className="cc-linha"><span className="rotulo">{nomeC}: fatia do gasto</span>
                <div className="cc-num" style={{ color: COR[k] }}>{pct0(p)}</div>
                {us.length > 1 && p === maxFat && p > 0 && <span className="selo maior">Maior fatia</span>}
                <p className="frase">De cada R$ 100, <b>R$ {Math.round(p * 100)}</b>{r ? ` · parecidas: R$ ${Math.round(r.media * 100)}` : ''}</p>{SELO[e]}</div>
              <div className="cc-linha"><span className="rotulo">{nomeC}: valor</span><div className="cc-num">{comuns.length ? reais(somaComuns(x, c)) : '—'}<small>{comuns.length ? txtComuns : 'Sem meses em comum'}</small></div></div>
              <div className="cc-linha"><span className="rotulo">Gasto total da unidade</span><div className="cc-num">{comuns.length ? reais(somaComuns(x, 'DESP')) : '—'}<small>{comuns.length ? txtComuns : 'Sem meses em comum'}</small></div></div>
              <div className="cc-linha"><span className="rotulo">{nomeC} mês a mês</span>
                <div className="meses" role="img" aria-label={`${nomeC} mês a mês: ${P.map((m, i) => `${mesLongo(m)} ${x.enviou(m) ? reaisLongo(serie[i]) : 'sem envio'}`).join('; ')}`}>
                  {P.map((m, i) => (x.enviou(m)
                    ? <div key={m}><i style={{ height: `${Math.max(4, (Math.max(0, serie[i]) / mx) * 100)}%`, background: COR[k] }} /><span>{mesCurto(m)}</span></div>
                    : <div key={m} className="sem"><em>—</em><i /><span>{mesCurto(m)}</span></div>))}
                </div>
                <p className="nota" style={{ marginTop: 6 }}>“—” e hachurado = sem envio</p>
                <details className="mes-a-mes"><summary>Ver valores mês a mês ▾</summary><ListaMeses x={x} serie={serie} P={P} /></details></div>
              <div className="cc-linha"><span className="rotulo">Maiores fatias do gasto</span>
                <ul className="mini">{maiores(x).map((g) => <li key={g.g}><span>{nomeItemCurto(modelo.itens[g.g])}</span><b>{pct0(g.p)}</b><span className="t" aria-hidden="true"><i style={{ width: `${Math.max(0, g.p) * 100}%`, background: COR[k] }} /></span></li>)}</ul></div>
            </article>
          );
        })}
        {[0, 1, 2].slice(us.length).map((k) => <div key={k} className="vazio-cc"><b>Unidade {k + 1}</b><p>Escolha no campo <b>“Unidades comparadas”</b> acima.</p></div>)}
      </div>
      {us.length < 3 && <button type="button" className="bt-add" onClick={() => { const i = document.getElementById('ci-cmp'); i?.scrollIntoView({ block: 'center' }); i?.focus(); }}>+ Adicionar unidade para comparar</button>}
    </div>
  );
}
