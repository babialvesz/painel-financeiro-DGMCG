// Aba "DATAS DE ENTREGA" (Cronograma de Entrega das PCFs por Unidade) → situação de cada entrega
//
// Layout esperado (achado pelo cabeçalho, a ordem das colunas não importa):
//   TIPO | OSS | ANO | UNIDADE | Janeiro | fevereiro | ... | dezembro
// Cada célula de mês = data em que a unidade entregou a prestação de contas daquela competência.
// "N/H" = não havia (unidade ainda não existia / não se aplica). Vazio = ainda não entregou.
//
// Prazo: dia 25 do mês seguinte à competência. Se cair em fim de semana ou feriado,
// vale o próximo dia útil (é o que a planilha marca em amarelo).

import { CONFIG } from '../config';

const NOMES_MESES = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const iso = (d) => d.toISOString().slice(0, 10);
const dataUTC = (a, m, d) => new Date(Date.UTC(a, m - 1, d));
export const diasEntre = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

/** Data do Sheets (número de série), "25/02/2026", Date → "2026-02-25" | 'NA' | null */
export function lerData(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return iso(new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000));
  if (v instanceof Date) return iso(v);
  const s = String(v).trim();
  if (/^n\s*\/?\s*[ha]$/i.test(s) || /^-+$/.test(s)) return 'NA';
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) return iso(dataUTC(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]));
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

/** Prazo da competência "2026-06": { base: dia 25 do mês seguinte, util: próximo dia útil se cair em fim de semana/feriado } */
export function prazoDe(comp) {
  const [a, m] = comp.split('-').map(Number);
  const base = dataUTC(m === 12 ? a + 1 : a, m === 12 ? 1 : m + 1, CONFIG.entregas.diaPrazo);
  const util = new Date(base);
  const feriados = new Set(CONFIG.entregas.feriados);
  while ([0, 6].includes(util.getUTCDay()) || feriados.has(iso(util))) util.setUTCDate(util.getUTCDate() + 1);
  return { base: iso(base), util: iso(util) };
}

/**
 * Situação de uma entrega:
 *  prazo     entregou até o dia 25
 *  limite    entregou depois do dia 25, mas no próximo dia útil (o dia 25 caiu em fim de semana/feriado)
 *  atraso    entregou depois do prazo
 *  pendente  não entregou e o prazo já venceu
 *  aberto    não entregou, mas ainda está dentro do prazo
 *  conferir  data de entrega anterior ao fim da competência (provável erro de digitação)
 *  na        não se aplica (N/H)
 *  futuro    competência ainda não terminou
 */
export function situacaoEntrega(comp, entrega, hoje) {
  const p = prazoDe(comp);
  const [a, m] = comp.split('-').map(Number);
  const fimComp = iso(dataUTC(a, m + 1, 0));
  if (entrega === 'NA') return { comp, status: 'na', prazo: p.util, prazoBase: p.base };
  if (!entrega) {
    if (hoje <= fimComp) return { comp, status: 'futuro', prazo: p.util, prazoBase: p.base };
    if (hoje <= p.util) return { comp, status: 'aberto', prazo: p.util, prazoBase: p.base, dias: diasEntre(hoje, p.util) };
    return { comp, status: 'pendente', prazo: p.util, prazoBase: p.base, dias: diasEntre(p.util, hoje) };
  }
  const dias = diasEntre(p.util, entrega); // > 0 = dias de atraso; <= 0 = antes ou no dia do prazo
  let status = dias > 0 ? 'atraso' : entrega > p.base ? 'limite' : 'prazo';
  if (entrega <= fimComp) status = 'conferir';
  return { comp, status, entrega, prazo: p.util, prazoBase: p.base, dias };
}

/** Converte a matriz da aba em unidades com a situação de cada competência. */
export function lerEntregas(linhas, hoje = iso(new Date())) {
  const iCab = linhas.findIndex((l) => l.some((c) => norm(c) === 'UNIDADE') && l.some((c) => norm(c) === 'JANEIRO'));
  if (iCab < 0) return [];
  const cab = linhas[iCab].map(norm);
  const col = (n) => cab.indexOf(n);
  const i = { tipo: col('TIPO'), oss: col('OSS'), ano: col('ANO'), u: col('UNIDADE') };
  const colMes = NOMES_MESES.map((n) => cab.indexOf(n));

  const vistos = {};
  return linhas.slice(iCab + 1).map((l) => {
    const unidade = String(l[i.u] ?? '').replace(/\s+/g, ' ').trim();
    const ano = String(l[i.ano] ?? '').replace(/\D/g, '').slice(0, 4);
    if (!unidade || !/^\d{4}$/.test(ano)) return null;
    const sigla = (unidade.match(/\s-\s*([A-Z0-9ÇÃÕÁÉÍÓÚ]+)\s*$/i) || [])[1] || '';
    let id = norm(sigla || unidade).replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    id = vistos[id] ? `${id}-${ano}` : id; vistos[id] = true;
    const meses = {};
    colMes.forEach((c, k) => {
      if (c < 0) return;
      const comp = `${ano}-${String(k + 1).padStart(2, '0')}`;
      const s = situacaoEntrega(comp, lerData(l[c]), hoje);
      if (s.status !== 'futuro') meses[comp] = s;
    });
    return {
      id, unidade, sigla, ano,
      nome: unidade.replace(/\s*-\s*[A-Z0-9ÇÃÕÁÉÍÓÚ]+\s*$/i, '').trim() || unidade,
      tipo: String(l[i.tipo] ?? '').trim() || 'Outros',
      oss: String(l[i.oss] ?? '').trim(),
      meses,
    };
  }).filter(Boolean);
}

/** Liga cada linha do cronograma a uma unidade do painel (pela sigla ou pelo nome). */
export function vincularEntregas(lista, unidades, manual = {}) {
  const prefixo = (aba) => norm(aba.split(/\s+-\s*/)[0]);
  const porPrefixo = Object.fromEntries(unidades.map((u) => [prefixo(u.aba), u.aba]));
  return lista.map((e) => {
    const s = norm(e.sigla), n = norm(e.unidade);
    let aba = manual[e.sigla] || manual[e.unidade] || porPrefixo[s] || porPrefixo[n];
    if (!aba) {
      const k = Object.keys(porPrefixo).filter((p) => n.startsWith(`${p} `)).sort((a, b) => b.length - a.length)[0];
      aba = k ? porPrefixo[k] : null;
    }
    return { ...e, aba: aba || null };
  });
}

/** Rótulos e cores de cada situação (classe CSS = ent-<status>). */
export const SITUACOES = {
  prazo: { nome: 'No prazo', curto: 'No prazo' },
  limite: { nome: 'No prazo (dia útil seguinte)', curto: 'Dia útil seguinte' },
  atraso: { nome: 'Com atraso', curto: 'Atrasou' },
  pendente: { nome: 'Não entregou (prazo vencido)', curto: 'Não entregou' },
  aberto: { nome: 'Aguardando (dentro do prazo)', curto: 'Aguardando' },
  conferir: { nome: 'Data a conferir', curto: 'Conferir data' },
  na: { nome: 'Não se aplica', curto: 'N/A' },
};

export const noPrazo = (s) => s === 'prazo' || s === 'limite';
