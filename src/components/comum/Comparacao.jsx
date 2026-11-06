// Etiqueta "comparado às unidades parecidas" em linguagem simples
import { pct } from '../../utils/formatacao';

export function classificar(l) {
  if (l.pctPares === null || l.pctPares === undefined) return null;
  const tol = Math.max(0.01, 0.3 * l.pctPares);
  if (l.difPares > tol) return 'acima';
  if (l.difPares < -tol) return 'abaixo';
  return 'parecido';
}

export default function Comparacao({ l }) {
  const c = classificar(l);
  if (!c) return <span className="muted">—</span>;
  const titulo = `Aqui pesa ${pct(l.pct)} das despesas. Nas unidades parecidas, em média ${pct(l.pctPares)}.`;
  const nome = { acima: 'Acima do normal', abaixo: 'Abaixo do normal', parecido: 'Parecido' }[c];
  return <span className={`pill pill-cmp-${c}`} title={titulo}>{nome}</span>;
}
