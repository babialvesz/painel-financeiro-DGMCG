// Ranking em barras horizontais com valor exato ao lado (cada linha é clicável)
import { brl, pct } from '../../utils/formatacao';

export default function BarrasLista({ linhas, max, mostrarPct = true, vazio = 'Sem dados no período.' }) {
  if (!linhas.length) return <p className="vazio">{vazio}</p>;
  const ref = max ?? Math.max(...linhas.map((l) => Math.abs(l.valor)), 1);
  return (
    <ol className="barras">
      {linhas.map((l) => {
        const Tag = l.href ? 'a' : 'div';
        return (
          <li key={l.chave} className={l.destaque ? 'barras-atual' : ''}>
            <Tag className="barras-linha" href={l.href} title={l.titulo}>
              <span className="barras-rotulo">
                <span className="barras-nome">{l.rotulo}</span>
                {l.sub && <span className="barras-sub">{l.sub}</span>}
              </span>
              <span className="barras-trilho" aria-hidden="true">
                <span className={`barras-barra ${l.tom || ''}`} style={{ width: `${Math.max(1.5, (Math.abs(l.valor) / ref) * 100)}%` }} />
              </span>
              <span className="barras-valor">
                <span className={`num ${l.tom === 'neg' ? 'neg' : ''}`}>{l.texto ?? brl(l.valor)}</span>
                {mostrarPct && l.pct !== undefined && <span className="barras-pct">{pct(l.pct)}</span>}
              </span>
            </Tag>
          </li>
        );
      })}
    </ol>
  );
}
