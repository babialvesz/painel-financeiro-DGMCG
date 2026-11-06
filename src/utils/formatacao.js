const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Valor exato: R$ 1.234.567,89 */
export const brl = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Só para eixos de gráfico: R$ 1,2 mi */
export function curto(v) {
  const a = Math.abs(v), s = v < 0 ? '-' : '';
  if (a >= 1e6) return `${s}R$ ${(a / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (a >= 1e3) return `${s}R$ ${(a / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return `${s}R$ ${a.toFixed(0)}`;
}

export const pct = (v, casas = 1) =>
  v === null || v === undefined || !isFinite(v) ? '—' : `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

/** Diferença em pontos percentuais: +2,3 p.p. */
export const pp = (v) =>
  v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} p.p.`;

export const rotuloMes = (c) => `${MESES[Number(c.slice(5, 7)) - 1]}/${c.slice(2, 4)}`;

export function rotuloPeriodo(meses, periodo) {
  if (!meses.length) return '';
  if (periodo !== 'acum') return rotuloMes(periodo);
  const ano = meses[0].slice(0, 4);
  return meses.length === 1 ? rotuloMes(meses[0]) : `Acumulado ${MESES[+meses[0].slice(5, 7) - 1]}–${MESES[+meses[meses.length - 1].slice(5, 7) - 1]}/${ano}`;
}

export const fraseResultado = (v) =>
  v < 0 ? `Déficit: despesas ${brl(-v)} maiores que as receitas` : `Superávit: despesas ${brl(v)} menores que as receitas`;

/** Resultado com sinal: "-R$ 1.234,56" / "R$ 1.234,56" */
export const resultado = (v) => brl(v);

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/** Nome mais curto para cards: tira o número do contrato ("- CG 023/2022"). */
export function nomeCurto(nome) {
  const n = nome
    .replace(/\s*[-–]?\s*(C\.?\s?G\.?|CONTRATO DE GEST[ÃA]O|CONTRATO)\s*(N[º°]\s*)?\d+\s*\/\s*\d+.*$/i, '')
    .replace(/\s*-\s*(S3\s*-\s*)?\d+\s*\/\s*\d+\s*$/i, '')
    .replace(/\s+-\s*$/, '')
    .trim();
  return n || nome;
}

/** Contrato a partir do nome da aba: "CG 023/2022" */
export function contrato(aba) {
  const m = aba.match(/(C\.?\s?G\.?\s*(N[º°]\s*)?)?(\d{3,4})\s*\/\s*(\d{4})/i);
  return m ? `CG ${m[3].slice(-3)}/${m[4]}` : '';
}
