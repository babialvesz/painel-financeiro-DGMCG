// Regras da tela de entregas das prestações de contas (só contagens e dias, nada de valores)
import { noPrazo } from '../services/entregas';

/** Linhas do cronograma do ano escolhido, respeitando os filtros de tipo/porte (pela unidade do painel). */
export function entregasFiltradas(modelo, { ano, grupo, porte }) {
  return modelo.entregas.filter((e) => {
    if (e.ano !== ano) return false;
    if (grupo || porte) {
      const u = e.aba && modelo.porAba[e.aba];
      if (!u || (grupo && u.grupo !== grupo) || (porte && u.porte !== porte)) return false;
    }
    return true;
  });
}

/** Competências que aparecem no cronograma (ordenadas). */
export const competencias = (lista) => [...new Set(lista.flatMap((e) => Object.keys(e.meses)))].sort();

/** Entregas que já podem ser avaliadas (entregou ou o prazo venceu). */
const AVALIADAS = ['prazo', 'limite', 'atraso', 'pendente'];

/** Indicadores de uma unidade (ou de um conjunto de situações). */
export function indicadores(situacoes) {
  const av = situacoes.filter((s) => AVALIADAS.includes(s.status));
  const atrasos = av.filter((s) => s.status === 'atraso');
  const maior = [...atrasos, ...av.filter((s) => s.status === 'pendente')].sort((a, b) => b.dias - a.dias)[0] || null;
  return {
    avaliadas: av.length,
    noPrazo: av.filter((s) => noPrazo(s.status)).length,
    limite: av.filter((s) => s.status === 'limite').length,
    atrasos: atrasos.length,
    pendentes: av.filter((s) => s.status === 'pendente').length,
    abertos: situacoes.filter((s) => s.status === 'aberto').length,
    conferir: situacoes.filter((s) => s.status === 'conferir').length,
    pontualidade: av.length ? av.filter((s) => noPrazo(s.status)).length / av.length : null,
    mediaAtraso: atrasos.length ? atrasos.reduce((a, s) => a + s.dias, 0) / atrasos.length : 0,
    maior,
  };
}

/** Indicadores por unidade, no conjunto de competências escolhido. */
export function porUnidade(lista, comps) {
  return lista.map((e) => ({ e, ...indicadores(comps.map((c) => e.meses[c]).filter(Boolean)) }));
}

/** Por competência: quantas unidades em cada situação. */
export function contagemPorCompetencia(lista, comps) {
  return comps.map((c) => {
    const n = { comp: c, prazo: 0, limite: 0, atraso: 0, pendente: 0, aberto: 0, conferir: 0, na: 0 };
    lista.forEach((e) => { const s = e.meses[c]; if (s) n[s.status] += 1; });
    return n;
  });
}

/** Texto curto de dias: "3 dias de atraso", "2 dias antes", "no dia". */
export function textoDias(s) {
  if (s.status === 'pendente') return `${s.dias} ${s.dias === 1 ? 'dia' : 'dias'} sem entregar`;
  if (s.status === 'aberto') return `faltam ${s.dias} ${s.dias === 1 ? 'dia' : 'dias'}`;
  if (s.dias === undefined || s.status === 'na') return '';
  if (s.dias > 0) return `${s.dias} ${s.dias === 1 ? 'dia' : 'dias'} de atraso`;
  if (s.dias === 0) return 'no último dia do prazo';
  return `${-s.dias} ${s.dias === -1 ? 'dia' : 'dias'} antes do prazo`;
}

export const dataBR = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
export const diaMes = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
