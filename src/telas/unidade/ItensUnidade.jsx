import { useMemo, useState } from 'react';
import { usePainel } from '../../contexto/PainelContexto';
import { brl, pct, rotuloMes } from '../../utils/formatacao';
import { rotuloItem } from '../../services/modelo';
import Card from '../../components/comum/Card';
import Icone from '../../components/comum/Icone';
import Sparkline from '../../components/comum/Sparkline';
import BotaoExportar from '../../components/comum/BotaoExportar';
import Comparacao from '../../components/comum/Comparacao';
import { Progresso } from '../../components/comum/Graficos';
import { useOrdenacao } from '../../components/comum/useOrdenacao';

export default function ItensUnidade({ u, analise, onAbrirItem }) {
  const { modelo } = usePainel();
  const { destaques: d, linhas } = analise;
  const grupos = modelo.raizes.map((c) => linhas[c]).filter((l) => l && l.total > 0).sort((a, b) => b.total - a.total);

  return (
    <>
      <div className="destaques">
        <Destaque titulo="Maior despesa" l={d.maior} onAbrir={onAbrirItem} valor={d.maior && brl(d.maior.total)}
          texto={d.maior && `${pct(d.maior.pct)} das despesas da unidade`} />
        <Destaque titulo="Menor despesa" l={d.menor} onAbrir={onAbrirItem} valor={d.menor && brl(d.menor.total)}
          texto="Menor despesa entre os itens que tiveram algum valor" />
        <Destaque titulo="Despesa que mais subiu" tom="alerta" l={d.maiorAlta} onAbrir={onAbrirItem}
          valor={d.maiorAlta && `+ ${brl(d.maiorAlta.dif)}`}
          texto={d.maiorAlta && `Em ${rotuloMes(d.maiorAlta.mesUltimo)} a despesa foi de ${brl(d.maiorAlta.ultimo)}. Nos meses anteriores, a média era ${brl(d.maiorAlta.mediaAnt)}.`}
          vazio="É preciso ter 3 meses ou mais de dados" />
        <Destaque titulo="Acima do normal" tom="neg" l={d.acimaPadrao} onAbrir={onAbrirItem}
          valor={d.acimaPadrao && pct(d.acimaPadrao.pct)}
          texto={d.acimaPadrao && `É quanto esse item pesa nas despesas desta unidade. Nas unidades parecidas, pesa em média ${pct(d.acimaPadrao.pctPares)}.`}
          vazio={analise.temPares ? 'Nenhum item acima das unidades parecidas' : 'Não há unidades parecidas para comparar'} />
      </div>

      <div className="grade-2">
        <Card titulo="Despesas por grupo" sub="Grupos de despesa desta unidade. Clique para detalhar.">
          <ul className="lista-pesos">
            {grupos.map((l) => (
              <li key={l.c}>
                <button onClick={() => onAbrirItem(l.c)}>
                  <span className="lista-pesos-topo"><span>{l.item.n}</span><b>{brl(l.total)}</b></span>
                  <Progresso valor={l.pct} />
                  <small>{pct(l.pct)} das despesas da unidade</small>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <div className="coluna">
          <Card titulo="As maiores despesas" ajuda="Itens mais detalhados da prestação de contas (sem repetir o grupo e o subgrupo).">
            <Ranking linhas={analise.maioresDespesas} onAbrir={onAbrirItem} valor={(l) => brl(l.total)} extra={(l) => pct(l.pct)} />
          </Card>
          <Card titulo="As despesas que mais oscilaram" ajuda="Diferença entre o mês de maior e o mês de menor despesa naquele item. Ajuda a achar despesas instáveis.">
            <Ranking linhas={analise.maioresVariacoes} onAbrir={onAbrirItem} valor={(l) => brl(l.varRS)} extra={(l) => `de ${brl(l.min)} a ${brl(l.max)}`} />
          </Card>
        </div>
      </div>

      <TabelaItens u={u} modelo={modelo} analise={analise} onAbrirItem={onAbrirItem} />
    </>
  );
}

function Destaque({ titulo, l, valor, texto, tom, vazio = '—', onAbrir }) {
  if (!l) return <div className="destaque vazio-destaque"><span className="destaque-titulo">{titulo}</span><span className="muted">{vazio}</span></div>;
  return (
    <button className={`destaque ${tom ? `destaque-${tom}` : ''}`} onClick={() => onAbrir(l.c)}>
      <span className="destaque-titulo">{titulo}</span>
      <span className="destaque-item">{l.item.n}</span>
      <span className="destaque-valor">{valor}</span>
      <span className="destaque-texto">{texto}</span>
      <span className="destaque-acao">Ver detalhes <Icone nome="seta" tamanho={14} /></span>
    </button>
  );
}

function Ranking({ linhas, onAbrir, valor, extra }) {
  return (
    <ol className="ranking">
      {linhas.map((l, i) => (
        <li key={l.c}>
          <button onClick={() => onAbrir(l.c)}>
            <span className="ranking-pos">{i + 1}</span>
            <span className="ranking-nome">{l.item.n}<small>{l.c}</small></span>
            <span className="ranking-valor">{valor(l)}<small>{extra(l)}</small></span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function TabelaItens({ u, modelo, analise, onAbrirItem }) {
  const [modo, setModo] = useState('arvore');
  const [busca, setBusca] = useState('');
  const [detalhado, setDetalhado] = useState(false);
  const [abertos, setAbertos] = useState(() => new Set());
  const { linhas, finais, temPares } = analise;

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return finais.filter((l) => !b || rotuloItem(l.item).toLowerCase().includes(b));
  }, [finais, busca]);
  const { ordenadas, cabecalho } = useOrdenacao(lista, 'total');

  const visiveis = useMemo(() => {
    const out = [];
    const b = busca.trim().toLowerCase();
    const casa = (c) => rotuloItem(modelo.itens[c]).toLowerCase().includes(b) || modelo.itens[c].filhos.some((f) => linhas[f] && casa(f));
    const visitar = (c, prof) => {
      if (!linhas[c] || (b && !casa(c))) return;
      out.push({ ...linhas[c], prof });
      if (abertos.has(c) || b) modelo.itens[c].filhos.forEach((f) => visitar(f, prof + 1));
    };
    modelo.raizes.forEach((c) => visitar(c, 0));
    return out;
  }, [modelo, linhas, abertos, busca]);

  const alternar = (c) => setAbertos((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const linhasTabela = modo === 'arvore' ? visiveis : ordenadas.map((l) => ({ ...l, prof: 0 }));
  const th = (k, n, cls = 'num') => (modo === 'lista' ? <th {...cabecalho(k, n, { className: cls })} /> : <th className={cls}>{n}</th>);

  return (
    <Card
      titulo="Todas as despesas da unidade"
      sub="Abra os grupos pela seta ou veja do maior para o menor. Clique numa linha para ver o detalhe."
      acoes={<BotaoExportar nome={`despesas-${u.aba}`} cabecalho={['Código', 'Item', 'Despesa', '% do total', 'Média por mês', 'Menor mês', 'Maior mês', 'Diferença', '% nas parecidas']}
        linhas={() => Object.values(linhas).sort((a, b) => modelo.ordemCodigo(a.c, b.c))
          .map((l) => [l.c, l.item.n, l.total, l.pct * 100, l.media, l.min, l.max, l.varRS, l.pctPares === null ? '' : l.pctPares * 100])} />}
    >
      <div className="barra-ferramentas">
        <div className="segmentado" role="group" aria-label="Modo">
          <button className={modo === 'arvore' ? 'ativo' : ''} onClick={() => setModo('arvore')}>Por grupo</button>
          <button className={modo === 'lista' ? 'ativo' : ''} onClick={() => setModo('lista')}>Do maior para o menor</button>
        </div>
        <input className="busca" type="search" placeholder="Buscar despesa (ex.: médicos, energia)" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <label className="alternador">
          <input type="checkbox" checked={detalhado} onChange={(e) => setDetalhado(e.target.checked)} />
          <span>Mostrar mais detalhes</span>
        </label>
        {modo === 'arvore' && <span className="links-acao"><button className="link" onClick={() => setAbertos(new Set(Object.keys(linhas)))}>Abrir tudo</button> · <button className="link" onClick={() => setAbertos(new Set())}>Fechar tudo</button></span>}
      </div>
      <div className="rolagem">
        <table className="tabela itens">
          <thead>
            <tr>
              {th('c', 'Despesa', '')}
              {th('total', 'Valor')}
              {th('pct', 'Peso no total', '')}
              {th('media', 'Média por mês')}
              {detalhado && <><th className="num">Menor mês</th><th className="num">Maior mês</th>{th('varRS', 'Diferença')}</>}
              {temPares && th('difPares', 'Comparado às parecidas', '')}
              <th>Evolução</th>
            </tr>
          </thead>
          <tbody>
            {linhasTabela.map((l) => {
              const temFilhos = modo === 'arvore' && modelo.itens[l.c].filhos.some((f) => linhas[f]);
              const aberto = abertos.has(l.c) || (busca && temFilhos);
              return (
                <tr key={l.c} className={`clicavel nivel-${Math.min(l.prof, 4)}`} onClick={() => onAbrirItem(l.c)}>
                  <td style={{ paddingLeft: 10 + l.prof * 18 }}>
                    {temFilhos
                      ? <button className={`caret ${aberto ? 'aberto' : ''}`} aria-expanded={aberto} aria-label={aberto ? 'Fechar' : 'Abrir'} onClick={(e) => { e.stopPropagation(); alternar(l.c); }}>›</button>
                      : <span className="caret-espaco" />}
                    <span className="item-nome">{l.item.n}</span> <span className="codigo">{l.c}</span>
                    {modo === 'lista' && l.item.pai && <span className="meta recuo">em {modelo.itens[l.item.pai].n}</span>}
                  </td>
                  <td className="num forte">{brl(l.total)}</td>
                  <td className="col-peso"><span className="peso"><Progresso valor={l.pct} /><span>{pct(l.pct)}</span></span></td>
                  <td className="num">{brl(l.media)}</td>
                  {detalhado && <><td className="num muted">{brl(l.min)}</td><td className="num muted">{brl(l.max)}</td><td className="num">{brl(l.varRS)}</td></>}
                  {temPares && <td><Comparacao l={l} /></td>}
                  <td><Sparkline valores={l.serie} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!linhasTabela.length && <p className="vazio">Nenhuma despesa encontrada.</p>}
    </Card>
  );
}
