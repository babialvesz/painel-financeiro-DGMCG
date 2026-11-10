// Aba Dados_Tratados (planilha de produção da GMCG) → modelo usado pelas telas de Produção
//
// Colunas (achadas pelo cabeçalho): Ano | Tipo | MACRO | GERES | OSS | Unidade | C.G. | Indicador | Mês | Meta | Produção | % | Status_Meta
// Uma linha = meta e produção de UM indicador, de UMA unidade, em UM mês.
// A situação é recalculada aqui (produção ≥ meta = cumprida), sem depender da coluna Status_Meta.

import { acharCadastro } from './cadastro';

const MESES = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const chave = (s) => norm(s).replace(/[^A-Z0-9]/g, '');
const slug = (s) => norm(s).replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

/** 3500, "3.500", "3500,5", "" → número ou null */
export function numero(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s || s === '-') return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** cumprida | nao (não cumprida) | semProd (tem meta, produção não informada) | semMeta (produção sem meta) | vazio */
export function situacaoMeta(meta, prod) {
  const temMeta = meta !== null && meta > 0;
  if (temMeta && prod !== null) return prod >= meta ? 'cumprida' : 'nao';
  if (temMeta) return 'semProd';
  if (prod !== null) return 'semMeta';
  return 'vazio';
}

export const SITUACOES_META = {
  cumprida: { nome: 'Meta cumprida', curto: 'Cumprida' },
  nao: { nome: 'Meta não cumprida', curto: 'Não cumprida' },
  semProd: { nome: 'Produção não informada', curto: 'Sem produção' },
  semMeta: { nome: 'Sem meta definida', curto: 'Sem meta' },
  vazio: { nome: 'Sem dado', curto: 'Sem dado' },
};

const TIPOS = { HOSPITAL: 'Hospital', UPA: 'UPA', UPAE: 'UPAE', CARRETA: 'Carreta' };
export const nomeTipo = (t) => TIPOS[norm(t)] || t || 'Outros';

export function montarProducao(linhas, cadastro = null, cadastroErro = '') {
  const iCab = linhas.findIndex((l) => l.some((c) => chave(c) === 'INDICADOR') && l.some((c) => chave(c) === 'PRODUCAO'));
  if (iCab < 0) return { registros: [], unidades: [], porId: {}, indicadores: [], anos: [] };
  const cab = linhas[iCab].map(chave);
  const c = (n) => cab.indexOf(n);
  const i = { ano: c('ANO'), tipo: c('TIPO'), macro: c('MACRO'), geres: c('GERES'), oss: c('OSS'), u: c('UNIDADE'), cg: c('CG'),
    ind: c('INDICADOR'), mes: c('MES'), meta: c('META'), prod: c('PRODUCAO'), st: c('STATUSMETA') };

  const porId = {};
  const registros = [];
  const freqInd = {};
  let divergentes = 0;

  linhas.slice(iCab + 1).forEach((l) => {
    const nome = String(l[i.u] ?? '').replace(/\s+/g, ' ').trim();
    const ano = String(l[i.ano] ?? '').replace(/\D/g, '').slice(0, 4);
    const m = MESES.indexOf(norm(l[i.mes]));
    const indicador = String(l[i.ind] ?? '').replace(/\s+/g, ' ').trim();
    if (!nome || !indicador || !/^\d{4}$/.test(ano) || m < 0) return;
    const comp = `${ano}-${String(m + 1).padStart(2, '0')}`;
    const id = slug(nome);
    const u = (porId[id] ||= {
      id, nome, tipo: nomeTipo(l[i.tipo]), oss: String(l[i.oss] ?? '').trim(), macro: String(l[i.macro] ?? '').trim(),
      geres: String(l[i.geres] ?? '').trim(), cg: String(l[i.cg] ?? '').trim(), dados: {},
    });
    const meta = numero(l[i.meta]);
    const prod = numero(l[i.prod]);
    const status = situacaoMeta(meta, prod);
    const r = { id, comp, ano, indicador, meta, prod, status };
    ((u.dados[indicador] ||= {}))[comp] = r;
    registros.push(r);
    freqInd[indicador] = (freqInd[indicador] || 0) + 1;
    if (i.st >= 0 && (status === 'cumprida' || status === 'nao')) {
      const st = norm(l[i.st]);
      if ((status === 'cumprida') !== (st === 'CUMPRIDA')) divergentes += 1;
    }
  });

  const unidades = Object.values(porId).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  unidades.forEach((u) => { u.cad = acharCadastro(cadastro, u.nome); u.cidade = u.cad?.cidade || ''; });
  // OSS: siglas das unidades com produção + razão social da legenda
  const oss = [...new Set(unidades.map((u) => u.oss).filter(Boolean))].sort()
    .map((sigla) => ({ sigla, razao: cadastro?.oss?.[sigla]?.razao || '', unidades: unidades.filter((u) => u.oss === sigla) }));
  // anos e meses que têm alguma produção informada
  const comMeta = registros.filter((r) => r.prod !== null);
  const anos = [...new Set(comMeta.map((r) => r.ano))].sort().reverse();
  const meses = [...new Set(comMeta.map((r) => r.comp))].sort();
  return {
    registros, unidades, porId, anos, meses, divergentes, oss, cadastroErro,
    temMapa: unidades.some((u) => u.cad?.lat !== undefined && u.cad?.lat !== null),
    indicadores: Object.keys(freqInd).sort((a, b) => freqInd[b] - freqInd[a] || a.localeCompare(b, 'pt-BR')),
    tipos: [...new Set(unidades.map((u) => u.tipo))].sort(),
  };
}
