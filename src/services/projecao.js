// Projeção de repasses e fluxo de pagamento às OSS
// (aba Consolidado da planilha "Projeção + Fluxo de pagamento OSS", trazida para a aba PROJECAO da base unificada)
//
// Colunas (achadas pelo cabeçalho): Competência | Tipo | OSS | Unidade | Contrato CEO | CNPJ | Ficha |
// Objeto Contratual | Fonte | Projeção | Descontos | Projeção após Desconto | Semana de Pagamento | O.B. |
// Saldo à Pagar Provisão Futura | Saldo à Pagar OSS | SEI | Pendência | Empenho
//
// Regras:
//   - uma linha = uma parcela (objeto contratual + fonte) de uma unidade numa competência
//   - PAGA quando tem número de O.B. (ordem bancária); senão está A PAGAR
//   - semana "RISCO" = parcela sem semana garantida
import { CONFIG } from '../config';
import { numero } from './base';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const chave = (s) => norm(s).replace(/[^A-Z0-9]/g, '');
const txt = (v) => (v === null || v === undefined ? '' : String(v).trim());

const MESES = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
export const SEMANAS = ['1ª Semana', '2ª Semana', '3ª Semana', '4ª Semana', 'RISCO'];

/** "Competência Janeiro" / "Competência Janeiro/2027" → "2026-01" */
export function competenciaProjecao(v, ano = CONFIG.anoProjecao) {
  const s = norm(v);
  const i = MESES.findIndex((m) => s.includes(m));
  if (i < 0) return '';
  const a = s.match(/(20\d\d)/);
  return `${a ? a[1] : ano}-${String(i + 1).padStart(2, '0')}`;
}

const obValida = (v) => {
  const s = txt(v);
  return s && !/^(0|0[.,]0+|-+|–|#N\/A|#REF!|N\/A)$/i.test(s) ? s : '';
};

/** Lê as linhas cruas da aba e devolve as parcelas. */
export function lerProjecao(linhas = []) {
  const iCab = linhas.findIndex((l) => (l || []).some((c) => chave(c) === 'COMPETENCIA') && (l || []).some((c) => chave(c) === 'PROJECAO'));
  if (iCab < 0) return [];
  const cab = linhas[iCab].map(chave);
  const col = (...nomes) => cab.findIndex((c) => nomes.includes(c));
  const C = {
    comp: col('COMPETENCIA'), tipo: col('TIPO'), oss: col('OSS'), unidade: col('UNIDADE'), contrato: col('CONTRATOCEO'),
    cnpj: col('CNPJ'), ficha: col('FICHA'), objeto: col('OBJETOCONTRATUAL'), fonte: col('FONTE'), projecao: col('PROJECAO'),
    descontos: col('DESCONTOS'), liquido: col('PROJECAOAPOSDESCONTO'), semana: col('SEMANADEPAGAMENTO'), ob: col('OB'),
    saldoFuturo: col('SALDOAPAGARPROVISAOFUTURA'), saldoOss: col('SALDOAPAGAROSS'), sei: col('SEI'), pendencia: col('PENDENCIA'),
  };
  const v = (l, k) => (C[k] >= 0 ? l[C[k]] : '');
  const out = [];
  linhas.slice(iCab + 1).forEach((l) => {
    if (!l) return;
    const comp = competenciaProjecao(v(l, 'comp'));
    const unidade = txt(v(l, 'unidade'));
    if (!comp || !unidade || /^#/.test(unidade)) return;
    const projecao = numero(v(l, 'projecao')), descontos = numero(v(l, 'descontos'));
    const liquido = C.liquido >= 0 ? numero(v(l, 'liquido')) : projecao - descontos;
    if (!projecao && !liquido) return;
    const ob = obValida(v(l, 'ob'));
    const m = unidade.match(/^\s*([A-Za-z0-9]{3,5})\s*-\s*(.+)$/);
    out.push({
      comp,
      tipo: txt(v(l, 'tipo')).toUpperCase(),
      oss: txt(v(l, 'oss')) === '0' ? '' : txt(v(l, 'oss')),
      unidade,
      codigo: m ? m[1] : '',
      nome: m ? m[2].trim() : unidade,
      contrato: txt(v(l, 'contrato')) === '0' ? '' : txt(v(l, 'contrato')),
      ficha: txt(v(l, 'ficha')),
      objeto: txt(v(l, 'objeto')),
      fonte: txt(v(l, 'fonte')).replace(/\.0+$/, ''),
      projecao, descontos, liquido,
      semana: txt(v(l, 'semana')),
      risco: /RISCO/i.test(txt(v(l, 'semana'))),
      ob,
      pago: ob ? liquido : 0,
      aPagar: ob ? 0 : liquido,
      sei: obValida(v(l, 'sei')),
      pendencia: obValida(v(l, 'pendencia')),
    });
  });
  return out;
}

// ---------- ligação com as unidades do painel ----------
const VAZIAS = new Set(['HOSPITAL', 'HOSP', 'UPAE', 'UPA', 'REGIONAL', 'DE', 'DA', 'DO', 'DOS', 'DAS', 'DR', 'DRA', 'CG', 'C', 'G', 'N', 'O', 'CUSTEIO', 'CONTRATO', 'E', 'MATERNIDADE']);
const palavras = (s) => norm(s)
  .replace(/\b(CG|C\.\s*G\.?|N[°º]|CONTRATO)\b.*$/, '') // corta "CG 027/2022" e o que vem depois
  .replace(/^[A-Z0-9]{2,6}\s*-\s*/, '') // corta a sigla/código inicial ("HDM - ", "1005 - ")
  .replace(/RUI\b/g, 'RUY')
  .replace(/[^A-Z ]/g, ' ').split(' ').filter((p) => p.length > 1 && !VAZIAS.has(p));
const TIPO_GRUPO = { HOSPITAL: 'Hospitais', UPA: 'UPAs', UPAE: 'UPAEs' };

/** Liga cada parcela a uma aba do painel: primeiro pelo código (vínculos manuais), depois pelo nome, dentro do mesmo tipo. */
export function vincularProjecao(parcelas, unidades, manual = {}) {
  const cand = unidades.map((u) => ({ u, p: new Set([...palavras(u.nome), ...palavras(u.aba)]) }));
  const cache = {};
  const achar = (l) => {
    const k = l.unidade;
    if (k in cache) return cache[k];
    if (manual[l.codigo]) return (cache[k] = manual[l.codigo]);
    const alvo = palavras(l.nome);
    if (!alvo.length) return (cache[k] = null);
    const grupo = TIPO_GRUPO[l.tipo];
    const notas = cand
      .filter((c) => !grupo || c.u.grupo === grupo || c.u.grupo === CONFIG.semClassificacao)
      .map((c) => ({ c, n: alvo.filter((p) => c.p.has(p)).length / alvo.length }))
      .sort((a, b) => b.n - a.n);
    const ok = notas[0] && notas[0].n >= 0.6 && (!notas[1] || notas[1].n < notas[0].n);
    return (cache[k] = ok ? notas[0].c.u.aba : null);
  };
  return parcelas.map((l) => ({ ...l, aba: achar(l) }));
}

/** Somatórios de um conjunto de parcelas. */
export function resumir(parcelas) {
  const r = { projecao: 0, descontos: 0, liquido: 0, pago: 0, aPagar: 0, risco: 0, pendencias: 0, n: parcelas.length };
  parcelas.forEach((l) => {
    r.projecao += l.projecao; r.descontos += l.descontos; r.liquido += l.liquido; r.pago += l.pago; r.aPagar += l.aPagar;
    if (l.risco) r.risco += l.aPagar;
    if (l.pendencia) r.pendencias += 1;
  });
  return r;
}

/** Situação de uma parcela, para selo e filtro. */
export function situacaoParcela(l) {
  if (l.ob) return { id: 'paga', nome: 'Paga' };
  if (l.risco) return { id: 'risco', nome: 'Em risco' };
  if (l.pendencia) return { id: 'pendente', nome: 'Com pendência' };
  return { id: 'apagar', nome: 'A pagar' };
}
