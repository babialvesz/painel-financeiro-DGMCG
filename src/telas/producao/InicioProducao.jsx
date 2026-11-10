import { useMemo, useState } from 'react';
import { useProducao } from '../../contexto/ProducaoContexto';
import { link, navegar } from '../../hooks/useRota';
import { corPct, resumoUnidade } from '../../utils/producao';
import { pct, plural, rotuloPeriodo } from '../../utils/formatacao';
import Card from '../../components/comum/Card';
import Mapa, { esc } from '../../components/comum/Mapa';
import Icone from '../../components/comum/Icone';
import { Anel } from '../../components/comum/Graficos';

export const TIPOS_MAPA = {
  Hospital: { letra: 'H', cor: '#122A54', nome: 'Hospitais' },
  UPA: { letra: 'U', cor: '#059669', nome: 'UPAs' },
  UPAE: { letra: 'E', cor: '#D97706', nome: 'UPAEs' },
  Carreta: { letra: 'C', cor: '#7C3AED', nome: 'Carretas' },
};
// faixas do % de metas cumpridas (mesmas dos cartões)
export const faixa = (p) => (p === null || p === undefined ? 'nd' : p === 1 ? 'pos' : p >= 0.7 ? 'atencao' : 'neg');
const COR_FAIXA = { pos: '--verde', atencao: '--amarelo', neg: '--vermelho', nd: '--muted' };
const NOME_FAIXA = { pos: 'Cumpriu todas as metas', atencao: '70% a 99% das metas', neg: 'Abaixo de 70% das metas', nd: 'Sem produção no período' };

export default function InicioProducao({ query }) {
  const { modelo, unidades, comps, filtro } = useProducao();
  const [busca, setBusca] = useState('');
  const ver = query.ver === 'oss' ? 'oss' : 'mapa';
  const cor = query.cor === 'tipo' ? 'tipo' : 'metas';
  const tipoMapa = query.t || '';
  const resumos = useMemo(() => Object.fromEntries(unidades.map((u) => [u.id, resumoUnidade(u, comps)])), [unidades, comps]);
  const ir = (q) => navegar(link('producao', { ver, cor, t: tipoMapa, ...q }));

  const contagem = Object.keys(TIPOS_MAPA).map((t) => [t, unidades.filter((u) => u.tipo === t).length]);
  const avaliados = Object.values(resumos).reduce((s, r) => s + r.avaliados, 0);
  const cumpridos = Object.values(resumos).reduce((s, r) => s + r.cumpridos, 0);
  const ossVisiveis = modelo.oss.map((o) => ({ ...o, unidades: o.unidades.filter((u) => unidades.includes(u)) })).filter((o) => o.unidades.length);

  const pontos = useMemo(() => unidades
    .filter((u) => u.cad?.lat && u.cad?.lng && u.tipo !== 'Carreta' && (!tipoMapa || u.tipo === tipoMapa))
    .map((u) => {
      const r = resumos[u.id];
      const f = faixa(r.pctMetas);
      const t = TIPOS_MAPA[u.tipo] || { letra: '•', cor: '#475569' };
      return {
        id: u.id, lat: u.cad.lat, lng: u.cad.lng, nome: u.nome, letra: t.letra,
        cor: cor === 'tipo' ? t.cor : COR_FAIXA[f],
        popup: `<div class="pop">
          <div class="pop-topo"><span class="pop-tipo" style="background:${t.cor}">${esc(u.tipo)}</span><span>${esc(u.cidade)}</span></div>
          <strong>${esc(u.nome)}</strong>
          <span class="pop-oss">OSS: <b>${esc(u.oss)}</b></span>
          <span class="pop-meta" style="color:${corPct(f === 'pos' ? 1 : f === 'atencao' ? 0.9 : f === 'neg' ? 0 : null)}">${r.avaliados ? `${pct(r.pctMetas, 0)} das metas cumpridas (${r.cumpridos} de ${r.avaliados})` : 'Sem produção no período'}</span>
          <a class="pop-botao" href="${link('producao', 'unidade', u.id)}">Ver produção →</a>
        </div>`,
      };
    }), [unidades, resumos, cor, tipoMapa]);

  const semCoord = unidades.filter((u) => u.tipo !== 'Carreta' && !(u.cad?.lat && u.cad?.lng));
  const achadas = busca.trim().length >= 2
    ? unidades.filter((u) => `${u.nome} ${u.cidade} ${u.oss}`.toLowerCase().includes(busca.trim().toLowerCase()))
    : null;

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Unidades de saúde OSS</h1>
          <p className="sub">{rotuloPeriodo(comps, filtro.periodo)} · produção e metas das unidades geridas por Organizações Sociais de Saúde</p>
        </div>
      </div>

      <div className="faixa-resumo">
        <div><span>OSS</span><b>{ossVisiveis.length}</b></div>
        {contagem.map(([t, n]) => <div key={t}><span>{TIPOS_MAPA[t].nome}</span><b>{n}</b></div>)}
        <div className="faixa-destaque"><span>Metas cumpridas</span><b style={{ color: corPct(avaliados ? cumpridos / avaliados : null) }}>{avaliados ? pct(cumpridos / avaliados, 0) : '—'}</b></div>
      </div>

      <div className="busca-grande">
        <Icone nome="busca" tamanho={18} />
        <input type="search" placeholder="Buscar unidade, cidade ou OSS (digite pelo menos 2 letras)" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar unidade" />
      </div>

      {achadas ? (
        <Card titulo={`Resultados para “${busca.trim()}”`} sub={plural(achadas.length, 'unidade encontrada', 'unidades encontradas')}>
          <ListaUnidades unidades={achadas} resumos={resumos} />
        </Card>
      ) : (
        <>
          <div className="barra-ferramentas">
            <div>
              <h2 className="titulo-secao">{ver === 'mapa' ? 'Mapa das unidades' : 'Organizações Sociais de Saúde (OSS)'}</h2>
              <p className="sub">{ver === 'mapa' ? 'Clique num ponto para ver o resumo da unidade. Use a roda do mouse depois de clicar no mapa.' : 'Escolha uma OSS para ver as unidades que ela administra.'}</p>
            </div>
            <div className="segmentado" role="group" aria-label="Forma de ver">
              <button className={ver === 'mapa' ? 'ativo' : ''} onClick={() => ir({ ver: 'mapa' })}><Icone nome="mapa" tamanho={14} /> Ver no mapa</button>
              <button className={ver === 'oss' ? 'ativo' : ''} onClick={() => ir({ ver: 'oss' })}><Icone nome="grade" tamanho={14} /> Ver por OSS</button>
            </div>
          </div>

          {ver === 'mapa' ? (
            <Card className="card-mapa">
              <div className="mapa-controles">
                <div className="chips" role="group" aria-label="Tipo de unidade">
                  {[['', 'Todas'], ['Hospital', 'Hospitais'], ['UPA', 'UPAs'], ['UPAE', 'UPAEs']].map(([id, nome]) => (
                    <button key={id} className={`chip ${tipoMapa === id ? 'ativo' : ''}`} onClick={() => ir({ t: id })}>{nome}</button>
                  ))}
                </div>
                <label className="seletor">
                  <span>Cor dos pontos</span>
                  <select value={cor} onChange={(e) => ir({ cor: e.target.value })}>
                    <option value="metas">Metas cumpridas</option>
                    <option value="tipo">Tipo de unidade</option>
                  </select>
                </label>
              </div>
              {modelo.temMapa ? <Mapa pontos={pontos} /> : (
                <div className="vazio-pagina">Não foi possível ler as coordenadas das unidades (aba Unidades do BD Unidades OSS).{modelo.cadastroErro && <> {modelo.cadastroErro}</>}</div>
              )}
              <div className="mapa-legenda">
                {cor === 'metas'
                  ? Object.entries(NOME_FAIXA).map(([f, n]) => <span key={f}><i style={{ background: `var(${COR_FAIXA[f]})` }} />{n}</span>)
                  : Object.entries(TIPOS_MAPA).filter(([t]) => t !== 'Carreta').map(([t, x]) => <span key={t}><i style={{ background: x.cor }} />{t}</span>)}
                <span className="muted">Letra no ponto: H hospital · U UPA · E UPAE{semCoord.length ? ` · ${plural(semCoord.length, 'unidade sem coordenada', 'unidades sem coordenada')}` : ''} · carretas (unidades móveis) não aparecem no mapa</span>
              </div>
            </Card>
          ) : (
            <div className="grade-oss">
              {ossVisiveis.map((o) => {
                const rs = o.unidades.map((u) => resumos[u.id]).filter((r) => r.avaliados);
                const av = rs.reduce((s, r) => s + r.avaliados, 0), cp = rs.reduce((s, r) => s + r.cumpridos, 0);
                const p = av ? cp / av : null;
                return (
                  <a key={o.sigla} className="cartao-oss" href={link('producao', 'unidades', { oss: o.sigla })}>
                    <div className="cartao-topo">
                      <div>
                        <h3>{o.sigla}</h3>
                        <span className="meta">{o.razao || 'Organização Social de Saúde'}</span>
                      </div>
                      <Anel valor={p} tamanho={54} espessura={6} cor={corPct(p === 1 ? 1 : p >= 0.7 ? 0.9 : 0)}><b className="anel-pct">{p === null ? '—' : pct(p, 0)}</b></Anel>
                    </div>
                    <div className="cartao-oss-tipos">
                      {Object.keys(TIPOS_MAPA).map((t) => { const n = o.unidades.filter((u) => u.tipo === t).length; return n ? <span key={t} className="pill pill-nd">{n} {n === 1 ? t : TIPOS_MAPA[t].nome}</span> : null; })}
                    </div>
                    <div className="cartao-rodape"><span>{plural(o.unidades.length, 'unidade', 'unidades')}</span><span className="cartao-ver">Ver unidades <Icone nome="seta" tamanho={14} /></span></div>
                  </a>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}

export function ListaUnidades({ unidades, resumos }) {
  if (!unidades.length) return <p className="vazio">Nenhuma unidade encontrada.</p>;
  return (
    <ul className="lista-unidades">
      {unidades.map((u) => {
        const r = resumos[u.id];
        return (
          <li key={u.id}>
            <a href={link('producao', 'unidade', u.id)}>
              <span className="lista-letra" style={{ background: (TIPOS_MAPA[u.tipo] || {}).cor }}>{(TIPOS_MAPA[u.tipo] || {}).letra}</span>
              <span className="lista-nome"><b>{u.nome}</b><small>{[u.tipo, u.cidade, u.oss].filter(Boolean).join(' · ')}</small></span>
              <span className="lista-pct" style={{ color: corPct(r?.avaliados ? (faixa(r.pctMetas) === 'pos' ? 1 : faixa(r.pctMetas) === 'atencao' ? 0.9 : 0) : null) }}>{r?.avaliados ? `${pct(r.pctMetas, 0)} das metas` : 'sem produção'}</span>
              <Icone nome="seta" tamanho={16} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
