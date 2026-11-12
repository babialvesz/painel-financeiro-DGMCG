import { useMemo } from 'react';
import { usePainel } from '../contexto/PainelContexto';
import { link, navegar } from '../hooks/useRota';
import { descontosFiltrados } from '../utils/analise';
import { brl, pct, plural, rotuloMes, rotuloPeriodo } from '../utils/formatacao';
import Card from '../components/comum/Card';
import StatCard from '../components/comum/StatCard';
import BarrasLista from '../components/comum/BarrasLista';
import GraficoMensal from '../components/comum/GraficoMensal';
import Icone from '../components/comum/Icone';
import { Progresso } from '../components/comum/Graficos';
import { useOrdenacao } from '../components/comum/useOrdenacao';
import { classeCss } from '../services/descontos';

const CORES_OBJETO = ['--acento', '--acento-suave', '--amarelo', '--verde', '--vermelho', '--muted'];

export default function Descontos({ query }) {
  const { modelo, filtro, meses } = usePainel();
  const todos = useMemo(() => descontosFiltrados(modelo, filtro), [modelo, filtro]);
  const unidadeSel = query.u || '';
  const lista = unidadeSel ? todos.filter((d) => d.nome === unidadeSel) : todos;

  const total = (ls) => ls.reduce((s, d) => s + d.valor, 0);
  const nomeExibir = (d) => d.nome; // nome como está na aba de descontos

  const porUnidade = useMemo(() => {
    const m = new Map();
    todos.forEach((d) => {
      const x = m.get(d.nome) || { nome: d.nome, exibir: nomeExibir(d), aba: d.aba, valor: 0, n: 0, meses: new Set() };
      x.valor += d.valor; x.n += 1; x.meses.add(d.comp); m.set(d.nome, x);
    });
    return [...m.values()].sort((a, b) => b.valor - a.valor);
  }, [todos]); // eslint-disable-line react-hooks/exhaustive-deps

  const objetos = useMemo(() => {
    const m = new Map();
    lista.forEach((d) => m.set(d.objeto, (m.get(d.objeto) || 0) + d.valor));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [lista]);

  const classes = useMemo(() => {
    const m = new Map();
    lista.forEach((d) => { const x = m.get(d.classificacao) || { v: 0, n: 0 }; x.v += d.valor; x.n += 1; m.set(d.classificacao, x); });
    return [...m.entries()].sort((a, b) => b[1].v - a[1].v);
  }, [lista]);
  const mesesLista = [...new Set(lista.map((d) => d.comp))].sort();
  const { ordenadas, cabecalho } = useOrdenacao(lista.map((d) => ({ ...d, exibir: nomeExibir(d) })), 'comp', 'asc');
  const maior = porUnidade[0];
  const periodo = filtro.periodo === 'acum' ? `Ano de ${filtro.ano}` : rotuloPeriodo(meses, filtro.periodo);

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Descontos, devoluções e compensações</h1>
          <p className="sub">{periodo} · valores descontados dos repasses às unidades · fonte: aba DESCONTOS_DEVOLUÇÃO_COMPENSAÇÃO da planilha</p>
        </div>
      </div>

      {modelo.descontosErro && (
        <div className="aviso-suave aviso-erro"><Icone nome="alerta" tamanho={16} /> Não foi possível ler a aba de descontos: {modelo.descontosErro}</div>
      )}

      {!todos.length ? (
        <div className="vazio-pagina">Nenhum desconto registrado em {periodo.toLowerCase()}.</div>
      ) : (
        <>
          <div className="grade-stats-unidade tres">
            <StatCard rotulo="Unidades com desconto" valor={porUnidade.length} linhas={[['Lançamentos', todos.length], ['Meses com desconto', new Set(todos.map((d) => d.comp)).size]]} />
            <StatCard rotulo="Maior valor descontado" valor={<span className="stat-texto">{maior.exibir}</span>}
              linhas={[['Total', brl(maior.valor)], ['Lançamentos', maior.n]]} href={link('descontos', { u: maior.nome })} />
            <StatCard rotulo="Maior lançamento" valor={brl(Math.max(...todos.map((d) => d.valor)))}
              linhas={[['Unidade', nomeExibir(todos.reduce((a, b) => (b.valor > a.valor ? b : a)))]]} />
          </div>

          <div className="grade-2 iguais">
            <Card titulo="Descontos por unidade" sub="Clique numa unidade para ver só os lançamentos dela.">
              <BarrasLista mostrarPct={false} linhas={porUnidade.map((x) => ({
                chave: x.nome, rotulo: x.exibir,
                sub: `${plural(x.n, 'lançamento', 'lançamentos')} · ${[...x.meses].sort().map(rotuloMes).join(', ')}`,
                valor: x.valor, destaque: x.nome === unidadeSel, tom: x.nome === unidadeSel ? 'atual' : undefined,
                href: link('descontos', { u: x.nome === unidadeSel ? '' : x.nome }),
              }))} />
            </Card>
            <Card titulo="Por classificação" sub={unidadeSel ? 'Da unidade selecionada.' : 'De todos os lançamentos do período.'}>
              <ul className="lista-pesos">
                {classes.map(([c, x]) => (
                  <li key={c}><div>
                    <span className="lista-pesos-topo"><span><span className={`pill pill-classe-${classeCss(c)}`}>{c}</span></span><b>{brl(x.v)}</b></span>
                    <Progresso valor={x.v / total(lista)} cor={`var(--classe-${classeCss(c)})`} />
                    <small>{pct(x.v / total(lista))} do total · {plural(x.n, 'lançamento', 'lançamentos')}</small>
                  </div></li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grade-2 iguais">
            <Card titulo="Por objeto contratual" sub={unidadeSel ? 'Da unidade selecionada.' : 'De todos os lançamentos do período.'}>
              <ul className="lista-pesos">
                {objetos.map(([o, v]) => (
                  <li key={o}><div>
                    <span className="lista-pesos-topo"><span>{o}</span><b>{brl(v)}</b></span>
                    <Progresso valor={v / total(lista)} />
                    <small>{pct(v / total(lista))} do total descontado</small>
                  </div></li>
                ))}
              </ul>
            </Card>
            <Card titulo="Descontos por mês" sub={`Por objeto contratual${unidadeSel ? ` · ${nomeExibir(lista[0] || {})}` : ''}. Passe o mouse para ver o valor exato.`}>
              <GraficoMensal empilhado altura={240} meses={mesesLista}
                series={objetos.map(([o], i) => ({ nome: o, cor: CORES_OBJETO[i % CORES_OBJETO.length], valores: mesesLista.map((m) => total(lista.filter((d) => d.comp === m && d.objeto === o))) }))} />
            </Card>
          </div>

          <Card
            titulo="Todos os lançamentos"
            sub={unidadeSel
              ? <>Mostrando só <b>{nomeExibir(lista[0] || { nome: unidadeSel })}</b> · <a href={link('descontos')}>mostrar todas</a></>
              : 'Clique nos títulos para ordenar. Unidades acompanhadas no painel têm link para a página delas.'}
          >
            <div className="rolagem">
              <table className="tabela">
                <thead>
                  <tr>
                    <th {...cabecalho('exibir', 'Unidade')} />
                    <th {...cabecalho('comp', 'Competência')} />
                    <th {...cabecalho('valor', 'Valor', { className: 'num' })} />
                    <th {...cabecalho('classificacao', 'Classificação')} />
                    <th {...cabecalho('objeto', 'Objeto contratual')} />
                    <th>Nº SEI</th>
                    <th>Justificativa</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenadas.map((d, i) => (
                    <tr key={i}>
                      <td>
                        {d.aba ? <a className="nome-unidade" href={link('unidade', d.aba)}>{d.exibir}</a> : <span className="nome-unidade">{d.exibir}</span>}
                        <span className="meta">{d.codigo ? `Código ${d.codigo}` : ''}{!d.aba && ' · não acompanhada no painel'}</span>
                      </td>
                      <td>{rotuloMes(d.comp)}</td>
                      <td className="num forte">{brl(d.valor)}</td>
                      <td><span className={`pill pill-classe-${classeCss(d.classificacao)}`}>{d.classificacao}</span></td>
                      <td>{d.objeto}</td>
                      <td className="sei">{d.sei || '—'}</td>
                      <td className="muted">{d.justificativa || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {unidadeSel && <p className="total-tabela">Total da unidade: <b>{brl(total(lista))}</b></p>}
          </Card>
        </>
      )}
    </>
  );
}
