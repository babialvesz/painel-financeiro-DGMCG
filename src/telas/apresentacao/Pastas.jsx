// Menu inicial do modo apresentação: pastas por tipo → unidades.
// Daqui só se abre UMA unidade por vez; a tela da unidade não mostra nada das outras.
import { useState } from 'react';
import { link, navegar } from '../../hooks/useRota';
import { PASTAS } from '../../utils/apresentacao';
import { plural } from '../../utils/formatacao';
import Icone from '../../components/comum/Icone';

export default function Pastas({ lista, pasta, carregando }) {
  const [busca, setBusca] = useState('');
  const pastas = PASTAS.map((p) => ({ ...p, unidades: lista.filter((u) => u.tipo === p.id) })).filter((p) => p.unidades.length);
  const atual = pastas.find((p) => p.id === pasta);
  const termo = busca.trim().toLowerCase();
  const achadas = termo.length >= 2 ? lista.filter((u) => `${u.nome} ${u.oss} ${u.cidade}`.toLowerCase().includes(termo)) : null;
  const mostrar = achadas || atual?.unidades;

  return (
    <div className="apres-pastas">
      <div className="titulo-pagina">
        <div>
          <h1>{atual ? atual.nome : 'Apresentações'}</h1>
          <p className="sub">
            {atual ? <><a href={link('apresentacao')}>Todas as pastas</a> · </> : null}
            Escolha a unidade da reunião. A apresentação mostra só os dados dela, sem comparação com outras unidades.
          </p>
        </div>
      </div>

      <div className="busca-grande">
        <Icone nome="busca" tamanho={18} />
        <input type="search" placeholder="Buscar unidade" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar unidade" />
      </div>

      {carregando && <p className="muted"><span className="girando" aria-hidden="true" /> Carregando unidades…</p>}

      {mostrar ? (
        <div className="grade-arquivos">
          {mostrar.map((u) => (
            <a key={u.id} className="arquivo" href={link('apresentacao', u.id)}>
              <span className="arquivo-icone"><Icone nome="apresentacao" tamanho={22} /></span>
              <span className="arquivo-texto">
                <b>{u.nome}</b>
                <small>{[u.oss, u.cidade].filter(Boolean).join(' · ')}</small>
                <span className="arquivo-tags">
                  {u.fin && <span className="pill pill-nd">Financeiro</span>}
                  {u.prod.length > 0 && <span className="pill pill-nd">Produção</span>}
                </span>
              </span>
            </a>
          ))}
          {!mostrar.length && <p className="vazio">Nenhuma unidade encontrada.</p>}
        </div>
      ) : (
        <div className="grade-pastas">
          {pastas.map((p) => (
            <button key={p.id} className="pasta" onClick={() => navegar(link('apresentacao', { pasta: p.id }))}>
              <svg viewBox="0 0 64 48" className="pasta-icone" aria-hidden="true">
                <path d="M4 8a4 4 0 0 1 4-4h16l6 6h26a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
              </svg>
              <b>{p.nome}</b>
              <small>{plural(p.unidades.length, 'unidade', 'unidades')}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
