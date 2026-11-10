// Cadastro das unidades — planilha "BD Unidades OSS - Consolidado"
//   aba Unidades:      OSS | UNIDADE | CONTRATO | TIPO | MACRO | GERES | CIDADE | ... | SITUAÇÃO | CNES | ENDEREÇO COMPLETO | LATITUDE | LONGITUDE
//   aba OSS (legenda): Sigla | Razão social | CNPJ
// Usado para o mapa e para a identificação de cada unidade. As colunas são achadas pelo nome.

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const chave = (s) => norm(s).replace(/[^A-Z0-9]/g, '');
export const chaveNome = (s) => norm(s).replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Pernambuco (com folga): latitude -10 a -7, longitude -41.5 a -34.5
const LIMITES = { lat: [-10.2, -6.8], lng: [-41.6, -34.5] };

/**
 * Lê uma coordenada e corrige quando a vírgula decimal se perdeu
 * (ex.: -807265 → -8.07265; -3487804 → -34.87804). Fora de Pernambuco → null.
 */
export function coordenada(v, tipo) {
  if (v === null || v === undefined || v === '') return null;
  let n = typeof v === 'number' ? v : Number(String(v).trim().replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n === 0) return null;
  const [min, max] = LIMITES[tipo];
  for (let i = 0; i < 9 && (n < min || n > max) && Math.abs(n) > Math.abs(max); i++) n /= 10;
  return n >= min && n <= max ? n : null;
}

function tabela(linhas, obrigatoria) {
  const iCab = linhas.findIndex((l) => l.some((c) => chave(c) === obrigatoria));
  if (iCab < 0) return [];
  const cab = linhas[iCab].map(chave);
  return linhas.slice(iCab + 1).map((l) => Object.fromEntries(cab.map((c, i) => [c, l[i]])));
}

const txt = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

export function montarCadastro(unidadesLinhas = [], ossLinhas = []) {
  const unidades = tabela(unidadesLinhas, 'UNIDADE').map((r) => {
    const nome = txt(r.UNIDADE);
    if (!nome) return null;
    return {
      nome, chave: chaveNome(nome),
      oss: txt(r.OSS), tipo: txt(r.TIPO), contrato: txt(r.CONTRATO), macro: txt(r.MACRO), geres: txt(r.GERES),
      cidade: txt(r.CIDADE), situacao: txt(r.SITUACAO), vigencia: txt(r.VIGENCIAATUAL), cnes: txt(r.CNES),
      cnpj: txt(r.CNPJUNIDADE), endereco: txt(r.ENDERECOCOMPLETO),
      lat: coordenada(r.LATITUDE, 'lat'), lng: coordenada(r.LONGITUDE, 'lng'),
    };
  }).filter(Boolean);
  const oss = Object.fromEntries(tabela(ossLinhas, 'SIGLA').map((r) => [txt(r.SIGLA), { sigla: txt(r.SIGLA), razao: txt(r.RAZAOSOCIAL), cnpj: txt(r.CNPJ) }]).filter(([s]) => s));
  return { unidades, oss };
}

/** Acha o cadastro de uma unidade pelo nome (igual, ou um nome começando pelo outro). */
export function acharCadastro(cadastro, nome) {
  if (!cadastro) return null;
  const k = chaveNome(nome);
  return cadastro.unidades.find((c) => c.chave === k)
    || cadastro.unidades.find((c) => c.chave.startsWith(`${k} `) || k.startsWith(`${c.chave} `))
    || null;
}
