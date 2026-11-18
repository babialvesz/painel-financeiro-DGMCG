// Cálculos da projeção de repasses para as telas (por unidade, por competência, por semana)
import { resumir, SEMANAS } from '../services/projecao';

export { resumir, SEMANAS };

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const mesLongo = (c) => `${MESES[Number(c.slice(5, 7)) - 1]}/${c.slice(0, 4)}`;

/** Agrupa parcelas por uma chave. */
export function agrupar(parcelas, chave) {
  const m = new Map();
  parcelas.forEach((l) => {
    const k = typeof chave === 'function' ? chave(l) : l[chave];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(l);
  });
  return m;
}

/** Competências presentes nas parcelas, em ordem. */
export const competencias = (parcelas) => [...new Set(parcelas.map((l) => l.comp))].sort();

/** Semana normalizada ("1ª Semana", …, "RISCO"). */
export function semanaDe(l) {
  const s = (l.semana || '').toUpperCase();
  if (s.includes('RISCO')) return 'RISCO';
  const n = s.match(/(\d)/);
  return n ? `${n[1]}ª Semana` : 'Sem semana';
}

/** % pago de um conjunto (sobre a projeção após descontos). */
export const pctPago = (r) => (r.liquido > 0 ? r.pago / r.liquido : null);

/** Comparação mês a mês de UMA unidade: repasse informado na prestação de contas × projeção da SES. */
export function comparacaoUnidade(u, parcelas, mesesAno) {
  const porComp = agrupar(parcelas, 'comp');
  const comps = [...new Set([...mesesAno.filter((m) => u.v[m]), ...porComp.keys()])].sort();
  return comps.map((c) => {
    const lista = porComp.get(c) || [];
    const r = resumir(lista);
    const temPcf = Boolean(u.v[c]);
    const rep = temPcf ? u.v[c].REP || 0 : null;
    return { comp: c, parcelas: lista, ...r, temPcf, rep, rec: temPcf ? u.v[c].REC || 0 : null, dif: temPcf && lista.length ? rep - r.liquido : null };
  });
}
