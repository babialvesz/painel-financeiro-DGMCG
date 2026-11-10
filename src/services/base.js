// Aba BASE_CONSOLIDADA (gerada pelo consolidarBase) → dados do painel financeiro
//
// Colunas (achadas pelo cabeçalho): Aba | Unidade | OSS | Grupo | Porte | Bloco | Ordem | Rubrica | Competencia | Valor | Atualizado_em
// Regras (as mesmas do antigo PainelDados.gs):
//   - só bloco DRE e valores diferentes de zero
//   - ignora competências depois do mês atual
//   - itens identificados pelo código no início da rubrica (ex.: "6.1.1.1 Médicos")
//   - totais: REC, REP, OREC, DESP, RES (rubricas de total, pelo nome)

const TOTAIS = {
  'TOTAL DE RECEITAS OPERACIONAIS': 'REC',
  'TOTAL DE REPASSES': 'REP',
  'TOTAL DE OUTRAS RECEITAS': 'OREC',
  'TOTAL DE DESPESAS OPERACIONAIS ANTES DAS PROVISOES': 'DESP',
  'RESULTADO (DEFICIT/SUPERAVIT) ANTES DAS PROVISOES': 'RES',
};
const COD = /^(\d+(?:\.\d+)*)\.?\s+(.*)$/;

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').toUpperCase().trim();
const chave = (s) => norm(s).replace(/[^A-Z0-9]/g, '');
const txt = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** 01/01/2026, 2026-01, número de série do Sheets → "2026-01" */
export function competencia(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}`;
  m = s.match(/^(\d{4})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  return null;
}

/** 11074432.18 ou "11.074.432,18" → número */
export function numero(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim();
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Data/hora do Sheets (número de série) ou texto → "27/10/2026 04:22" */
function dataHora(v) {
  if (typeof v !== 'number') return txt(v);
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v * 86400000));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Converte a matriz da BASE_CONSOLIDADA no formato bruto usado por montarModelo. */
export function lerBase(linhas, limite = new Date().toISOString().slice(0, 7)) {
  const iCab = linhas.findIndex((l) => l.some((c) => chave(c) === 'RUBRICA') && l.some((c) => chave(c) === 'BLOCO'));
  if (iCab < 0) throw new Error('A aba BASE_CONSOLIDADA não tem as colunas esperadas (Aba, Bloco, Rubrica, Competencia, Valor).');
  const cab = linhas[iCab].map(chave);
  const i = Object.fromEntries(['ABA', 'UNIDADE', 'OSS', 'GRUPO', 'PORTE', 'BLOCO', 'RUBRICA', 'COMPETENCIA', 'VALOR', 'ATUALIZADOEM'].map((c) => [c, cab.indexOf(c)]));

  const unidades = new Map();
  const itens = new Map();
  const valores = new Map();
  let atualizado = '';
  let futuras = 0;

  for (let k = iCab + 1; k < linhas.length; k++) {
    const l = linhas[k];
    const aba = txt(l[i.ABA]);
    const comp = competencia(l[i.COMPETENCIA]);
    if (!aba || !comp) continue;
    if (i.ATUALIZADOEM >= 0 && l[i.ATUALIZADOEM] !== undefined && l[i.ATUALIZADOEM] !== '') atualizado = dataHora(l[i.ATUALIZADOEM]);
    if (!unidades.has(aba)) {
      unidades.set(aba, { aba, nome: txt(l[i.UNIDADE]) || aba, oss: txt(l[i.OSS]), grupo: txt(l[i.GRUPO]), porte: txt(l[i.PORTE]) });
    }
    if (norm(l[i.BLOCO]) !== 'DRE') continue;
    const v = numero(l[i.VALOR]);
    if (!v) continue;
    if (comp > limite) { futuras++; continue; }
    const rub = txt(l[i.RUBRICA]);
    let ch = TOTAIS[norm(rub)];
    if (!ch) {
      const m = rub.match(COD);
      if (!m) continue;
      ch = m[1];
      if (!itens.has(ch)) itens.set(ch, m[2].trim());
    }
    const key = `${aba}\u0001${comp}\u0001${ch}`;
    valores.set(key, (valores.get(key) || 0) + v);
  }

  return {
    atualizado,
    futuras,
    unidades: [...unidades.values()],
    itens: [...itens].map(([c, n]) => ({ c, n })),
    valores: [...valores].map(([k, v]) => { const [aba, comp, ch] = k.split('\u0001'); return [aba, comp, ch, Math.round(v * 100) / 100]; }),
  };
}
