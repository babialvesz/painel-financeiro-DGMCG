// Regras da página "Despesas por item" (funções puras, sem tela)
//
// - Comparação pela FATIA: quanto de cada R$ 100 gastos pela unidade foi para a despesa.
// - Referência única: as PARECIDAS (mesmo tipo e porte, sem a própria unidade, sem unidades
//   com dados incompletos e só entre as que têm a despesa). Menos de 3 → mesmo tipo.
//   Tipo "Outros" → todas as unidades.
// - Bem acima: fatia ≥ 1,5 × média e ≥ 3 p.p. acima. Bem abaixo: fatia ≤ média ÷ 1,5 e ≥ 3 p.p. abaixo.
// - Dados incompletos: menos da metade dos meses do período → sem alerta e fora das médias.
// - Nunca soma valores de unidades diferentes.
import { CONFIG } from '../config';
import { nomeCurto as nomeUnidade } from './formatacao';

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const mesCurto = (m) => MES[Number(m.slice(5, 7)) - 1];
export const mesLongo = (m) => MES_LONGO[Number(m.slice(5, 7)) - 1];

const MENOS = '−';
export const pct0 = (p) => (p < 0 ? MENOS : '') + Math.round(Math.abs(p) * 100) + '%';
export function reais(v) {
  const s = v < 0 ? MENOS : '', a = Math.abs(v);
  if (a >= 1e6) return `${s}R$ ${(a / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (a >= 1e3) return `${s}R$ ${Math.round(a / 1e3).toLocaleString('pt-BR')} mil`;
  return `${s}R$ ${Math.round(a).toLocaleString('pt-BR')}`;
}
export function reaisLongo(v) {
  const s = v < 0 ? MENOS : '', a = Math.abs(v);
  return a >= 1e6 ? `${s}R$ ${(a / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} milhões` : reais(v);
}

/** Nome do item sem o que está entre parênteses (para menus e barras). */
export const nomeItemCurto = (it) => (it ? it.n.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim() : '');
export const nomeItem = (it) => (it ? it.n.trim() : '');

export const TIPOS = ['Hospitais', 'UPAs', 'UPAEs', 'Outros'];
const TIPO_PLURAL = { Hospitais: 'Hospitais', UPAs: 'UPAs', UPAEs: 'UPAEs', Outros: 'unidades' };
export const ORDEM_PORTE = ['Porte I', 'Porte II', 'Porte III', 'Médio Porte', 'Grande Porte', 'Sem porte'];
const ehOutros = (g) => !g || g === CONFIG.semClassificacao || g === 'Não classificado' || g === 'Outros';

/** Prepara as unidades para o período: totais, meses enviados, tipo e porte para exibição. */
export function prepararUnidades(modelo, meses) {
  return modelo.unidades.map((u) => {
    const cache = {};
    const tot = (c) => (c in cache ? cache[c] : (cache[c] = meses.reduce((s, m) => s + (u.v[m]?.[c] || 0), 0)));
    const enviou = (m) => (u.v[m]?.DESP || 0) > 0;
    const nMeses = meses.filter(enviou).length;
    const tipo = ehOutros(u.grupo) ? 'Outros' : u.grupo;
    const porte = !u.porte || u.porte === CONFIG.semClassificacao || u.porte === 'Não classificado' ? 'Sem porte' : u.porte;
    const desp = tot('DESP');
    return {
      u, a: u.aba, nome: nomeUnidade(u.nome), grupo: u.grupo, tipo, porte, desp, nMeses, enviou,
      incompleta: nMeses < meses.length / 2, tot,
      serie: (c) => meses.map((m) => u.v[m]?.[c] || 0),
    };
  });
}

export const fatia = (x, c) => (x.desp ? x.tot(c) / x.desp : 0);

/** Calculadora de referência e estado, com cache, para um conjunto de unidades preparadas. */
export function criarReferencias(todas) {
  const comGasto = todas.filter((x) => x.desp > 0);
  const cache = new Map();
  function referencia(x, c) {
    const k = x.a + '|' + c;
    if (cache.has(k)) return cache.get(k);
    const cand = comGasto.filter((y) => y !== x && !y.incompleta && y.tot(c) > 0);
    let grupo, rotulo, geral = false;
    if (x.tipo === 'Outros') { grupo = cand; geral = true; rotulo = `média de todas as ${grupo.length} unidades (sem parecidas)`; }
    else {
      grupo = cand.filter((y) => y.tipo === x.tipo && y.porte === x.porte);
      if (grupo.length >= 3) rotulo = `média das ${grupo.length} ${TIPO_PLURAL[x.tipo] || 'unidades'} ${x.porte}`;
      else { grupo = cand.filter((y) => y.tipo === x.tipo); rotulo = `média das ${grupo.length} ${TIPO_PLURAL[x.tipo] || 'unidades'} (todos os portes)`; }
    }
    const r = grupo.length ? { media: grupo.reduce((s, y) => s + fatia(y, c), 0) / grupo.length, n: grupo.length, rotulo, geral } : null;
    cache.set(k, r);
    return r;
  }
  function estado(x, c) {
    if (!x.tot(c)) return 'nao';
    if (x.incompleta) return 'inc';
    const r = referencia(x, c);
    if (!r) return '';
    const p = fatia(x, c), m = r.media;
    if (p >= m * 1.5 && p - m >= 0.03) return 'acima';
    if (p <= m / 1.5 && m - p >= 0.03) return 'abaixo';
    return '';
  }
  return { referencia, estado, comGasto };
}

/** Itens que têm valor em alguma unidade, na ordem da árvore, com o nível. */
export function opcoesDespesa(modelo, comGasto) {
  const out = [];
  const visitar = (c, n) => {
    if (!comGasto.some((x) => x.tot(c))) return;
    out.push([c, n]);
    (modelo.itens[c]?.filhos || []).slice().sort(modelo.ordemCodigo).forEach((f) => visitar(f, n + 1));
  };
  modelo.raizes.slice().sort(modelo.ordemCodigo).forEach((c) => visitar(c, 0));
  return out;
}

export const raizDe = (c) => c.split('.')[0];
export const caminho = (modelo, c) => {
  const out = [];
  for (let k = c; k; k = modelo.itens[k]?.pai) out.unshift(k);
  return out;
};

/** "jan a ago" quando os meses são seguidos; senão "N meses". */
export function faixaMeses(ms) {
  if (!ms.length) return '';
  const idx = ms.map((m) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)));
  const seguidos = idx.every((v, k) => k === 0 || v === idx[k - 1] + 1);
  if (!seguidos) return `${ms.length} meses`;
  return ms.length === 1 ? mesCurto(ms[0]) : `${mesCurto(ms[0])} a ${mesCurto(ms[ms.length - 1])}`;
}
