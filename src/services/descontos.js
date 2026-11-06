// Aba DESCONTOS_DEVOLUÇÃO_COMPENSAÇÃO da planilha → lista de lançamentos
//
// Layout esperado (linha 1 = título, linha 2 = cabeçalho):
//   UNIDADE | COMPETÊNCIA | VALOR | OBJETO CONTRATUAL | SEI | CLASSIFICAÇÃO | JUSTIFICATIVA
// (as colunas são achadas pelo nome do cabeçalho, a ordem não importa)
// A linha "TOTAL" e linhas vazias são ignoradas.

const MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

/** "fev./26", "02/2026", "01/02/2026", data do Sheets (número de série) ou Date → "2026-02" */
export function lerCompetencia(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  const s = String(v).trim().toLowerCase();
  let m = s.match(/^([a-zç]{3})[a-zç]*\.?\s*[/\-]?\s*(\d{2,4})$/);
  if (m && MESES[m[1]]) {
    const ano = m[2].length === 2 ? `20${m[2]}` : m[2];
    return `${ano}-${String(MESES[m[1]]).padStart(2, '0')}`;
  }
  m = s.match(/^(?:\d{1,2}\/)?(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{4})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  return null;
}

/** 30756.95 ou "R$ 30.756,95" → número */
export function lerValor(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Converte as linhas da aba (matriz de valores, a partir do cabeçalho) em lançamentos. */
export function lerLancamentos(linhas) {
  const iCab = linhas.findIndex((l) => l.some((c) => norm(c) === 'UNIDADE'));
  if (iCab < 0) return [];
  const cab = linhas[iCab].map(norm);
  const col = (nome) => cab.findIndex((c) => c.startsWith(nome));
  const i = { u: col('UNIDADE'), c: col('COMPETENCIA'), v: col('VALOR'), o: col('OBJETO'), s: col('SEI'), k: col('CLASSIFICACAO'), j: col('JUSTIFICATIVA') };

  return linhas.slice(iCab + 1)
    .map((l) => {
      const unidade = String(l[i.u] ?? '').replace(/\s+/g, ' ').trim();
      if (!unidade || norm(unidade).startsWith('TOTAL')) return null;
      const comp = lerCompetencia(l[i.c]);
      const valor = lerValor(l[i.v]);
      if (!comp || !valor) return null;
      const m = unidade.match(/^([A-Z0-9]+)\s*-\s*(.+)$/i);
      return {
        unidade,
        codigo: m ? m[1] : '',
        nome: m ? m[2].trim() : unidade,
        comp,
        valor,
        objeto: String(l[i.o] ?? '').trim() || 'Não informado',
        sei: String(l[i.s] ?? '').trim(),
        classificacao: (i.k >= 0 && String(l[i.k] ?? '').trim()) || 'Não classificado',
        justificativa: String(l[i.j] ?? '').trim(),
      };
    })
    .filter(Boolean);
}

/** Liga cada lançamento a uma unidade do painel (pelo nome), quando houver. */
export function vincularUnidades(lancamentos, unidades, manual = {}) {
  const chaves = unidades.map((u) => ({ u, n: norm(u.nome) }));
  return lancamentos.map((l) => {
    if (manual[l.codigo]) return { ...l, aba: manual[l.codigo] };
    const alvo = norm(l.nome);
    const achou = chaves.find((k) => k.n.startsWith(alvo) || k.n.includes(` ${alvo}`) || alvo.startsWith(k.n.split(' - ')[0]));
    return { ...l, aba: achou ? achou.u.aba : null };
  });
}

/** Classe CSS (cor) para cada classificação: desconto, abatimento, compensação, outros. */
export function classeCss(c) {
  const n = norm(c);
  if (n.startsWith('DESCONTO')) return 'desconto';
  if (n.startsWith('ABATIMENTO')) return 'abatimento';
  if (n.startsWith('COMPENSA')) return 'compensacao';
  if (n.startsWith('DEVOLU')) return 'devolucao';
  return 'outros';
}
