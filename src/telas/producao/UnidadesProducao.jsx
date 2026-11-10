import { useMemo, useState } from 'react';
import { useProducao } from '../../contexto/ProducaoContexto';
import { link, navegar } from '../../hooks/useRota';
import { corPct, inteiro, resumoUnidade, tomPct } from '../../utils/producao';
import { pct, rotuloPeriodo } from '../../utils/formatacao';
import { Anel, Progresso } from '../../components/comum/Graficos';
import Icone from '../../components/comum/Icone';

const ORDENS = {
  pior: { nome: 'Menos metas cumpridas primeiro', f: (a, b) => a.pctMetas - b.pctMetas },
  melhor: { nome: 'Mais metas cumpridas primeiro', f: (a, b) => b.pctMetas - a.pctMetas },
  nome: { nome: 'Nome (A–Z)', f: (a, b) => a.u.nome.localeCompare(b.u.nome, 'pt-BR') },
};

export default function UnidadesProducao({ query }) {
  const { unidades, comps, filtro } = useProducao();
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('pior');
  const resumos = useMemo(() => unidades.map((u) => resumoUnidade(u, comps)).filter((r) => r.avaliados), [unidades, comps]);
  const f = ['todas', 'abaixo', 'parcial'].includes(query.f) ? query.f : '';
  const grupos = {
    todas: resumos.filter((r) => r.cumpridos === r.avaliados),
    parcial: resumos.filter((r) => r.cumpridos < r.avaliados && r.pctMetas >= 0.7),
    abaixo: resumos.filter((r) => r.pctMetas < 0.7),
  };
  const lista = (f ? grupos[f] : resumos)
    .filter((r) => !busca || r.u.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    .sort(ORDENS[ordem].f);

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Unidades</h1>
          <p className="sub">{rotuloPeriodo(comps, filtro.periodo)} · percentual das metas mensais cumpridas por cada unidade · clique para ver os indicadores</p>
        </div>
      </div>
      <div className="barra-ferramentas">
        <div className="chips" role="group" aria-label="Filtrar">
          {[['', 'Todas', resumos.length], ['todas', 'Cumpriram todas', grupos.todas.length], ['parcial', 'Entre 70% e 99%', grupos.parcial.length], ['abaixo', 'Abaixo de 70%', grupos.abaixo.length]].map(([id, nome, n]) => (
            <button key={id} className={`chip ${f === id ? 'ativo' : ''}`} onClick={() => navegar(link('producao', 'unidades', { f: id }))}>{nome} <b>{n}</b></button>
          ))}
        </div>
        <div className="ferramentas-direita">
          <input className="busca" type="search" placeholder="Buscar unidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select className="select" value={ordem} onChange={(e) => setOrdem(e.target.value)} aria-label="Ordenar">
            {Object.entries(ORDENS).map(([k, o]) => <option key={k} value={k}>{o.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="grade-unidades">
        {lista.map((r) => (
          <a key={r.u.id} className={`cartao-unidade cartao-prod ${tomPct(r.pctMetas === 1 ? 1 : r.pctMetas >= 0.7 ? 0.9 : 0)}`} href={link('producao', 'unidade', r.u.id)}>
            <div className="cartao-topo">
              <div>
                <h3>{r.u.nome}</h3>
                <span className="meta">{[r.u.tipo, r.u.oss, r.u.geres && `${r.u.geres} GERES`].filter(Boolean).join(' · ')}</span>
              </div>
              <Anel valor={r.pctMetas} tamanho={58} espessura={6} cor={corPct(r.pctMetas === 1 ? 1 : r.pctMetas >= 0.7 ? 0.9 : 0)}>
                <b className="anel-pct">{pct(r.pctMetas, 0)}</b>
              </Anel>
            </div>
            <ul className="prod-inds">
              {r.inds.slice(0, 5).map((i) => (
                <li key={i.indicador} title={`${i.indicador}: produção ${inteiro(i.prod)} de meta ${inteiro(i.meta)}`}>
                  <span>{i.indicador}</span>
                  <Progresso valor={Math.min(1, i.pct ?? 0)} cor={corPct(i.pct)} />
                  <b style={{ color: corPct(i.pct) }}>{i.pct === null ? '—' : pct(i.pct, 0)}</b>
                </li>
              ))}
              {r.inds.length > 5 && <li className="muted"><span>+ {r.inds.length - 5} indicadores</span></li>}
            </ul>
            <div className="cartao-rodape">
              <span>{r.cumpridos} de {r.avaliados} metas mensais cumpridas</span>
              <span className="cartao-ver">Ver detalhes <Icone nome="seta" tamanho={14} /></span>
            </div>
          </a>
        ))}
      </div>
      {!lista.length && <p className="vazio">Nenhuma unidade encontrada.</p>}
    </>
  );
}
