// Leitos e reforço de RH da sazonalidade (planilha "Desmobilização de leitos e RH sazonalidade",
// trazida por IMPORTRANGE para a aba SAZONALIDADE da base unificada).
//
// Layout da planilha (cabeçalho em duas linhas):
//   Unidade de saúde | Reforço de RH | N.° de leitos | Situação (Conversão | Incremento) |
//   Tipo de leito (Sala amarela | Sala vermelha | Enf. neonatal | Enf. pediátrica | UTI neonatal | UTI pediátrica) |
//   Início dos leitos | Desmobilização dos leitos | Desmobilização do reforço de RH
// As colunas marcadas com "X" dizem a situação e os tipos. "N.° de leitos" pode ser número
// ou texto ("04 leitos de enfermaria pediátrica/10 leitos de UTI pediátrica").
// A leitura para nos blocos de totais ("Total de unidades…").

import { CONFIG } from '../config';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const chave = (s) => norm(s).replace(/[^A-Z0-9]/g, '');

export const TIPOS_LEITO = [
  { id: 'amarela', nome: 'Sala amarela', busca: ['SALA AMARELA'] },
  { id: 'vermelha', nome: 'Sala vermelha', busca: ['SALA VERMELHA'] },
  { id: 'enfNeo', nome: 'Enfermaria neonatal', busca: ['ENFERMARIA NEONATAL'] },
  { id: 'enfPed', nome: 'Enfermaria pediátrica', busca: ['ENFERMARIA PEDIATRICA'] },
  { id: 'utiNeo', nome: 'UTI neonatal', busca: ['UTI NEONATAL'] },
  { id: 'utiPed', nome: 'UTI pediátrica', busca: ['UTI PEDIATRICA'] },
];
export const nomeTipoLeito = (id) => TIPOS_LEITO.find((t) => t.id === id)?.nome || id;

// Siglas usadas na planilha de sazonalidade → trecho do nome da unidade (vale para financeiro e produção)
const SIGLAS = {
  HJMO: 'JOAO MURILO',
  HREC: 'EMILIA CAMARA',
  HRFB: 'FERNANDO BEZERRA',
  HBA: 'BRITES DE ALBUQUERQUE',
  HECAMPOS: 'EDUARDO CAMPOS',
  HECOUTINHO: 'ERMIRIO COUTINHO',
  HRRBC: 'RUY DE BARROS CORREIA',
  HRPSM: 'SILVIO MAGALHAES',
  HDM: 'DOM MALAN',
  HMAGRESTE: 'MULHER DO AGRESTE',
};

const marcado = (v) => norm(v) === 'X';

/** Data da planilha: número de série do Sheets, "06/07/26", "06/07/2026" ou "-" → "AAAA-MM-DD" ou "". */
export function dataSaz(v) {
  if (typeof v === 'number' && v > 20000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const m = String(v ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return '';
  const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** "04 leitos de enfermaria pediátrica/10 leitos de UTI pediátrica" → [{n:4, tipo:'enfPed'}, {n:10, tipo:'utiPed'}] */
function partesLeitos(texto, tiposMarcados) {
  if (typeof texto === 'number') {
    return tiposMarcados.length === 1 ? [{ n: texto, tipo: tiposMarcados[0] }] : [{ n: texto, tipo: '' }];
  }
  const s = String(texto ?? '').trim();
  if (!s || s === '-') return [];
  if (/^\d+$/.test(s)) return partesLeitos(Number(s), tiposMarcados);
  return s.split(/[/;+]| e (?=\d)/).map((p) => {
    const n = Number((p.match(/\d+/) || [])[0]);
    const t = TIPOS_LEITO.find((x) => x.busca.some((b) => norm(p).includes(b)));
    return Number.isFinite(n) && n > 0 ? { n, tipo: t?.id || '' } : null;
  }).filter(Boolean);
}

/** Lê a matriz da aba SAZONALIDADE. Devolve uma linha por unidade (na ordem da planilha). */
export function lerSazonalidade(linhas = []) {
  const iCab = linhas.findIndex((l) => chave(l[0]).startsWith('UNIDADEDESAUDE'));
  if (iCab < 0) return [];
  const cab = linhas[iCab].map(norm);
  const sub = (linhas[iCab + 1] || []).map(norm);
  const col = (f) => cab.findIndex(f);
  const subCol = (txt) => sub.findIndex((c) => c.includes(txt));
  const i = {
    rh: col((c) => c.startsWith('REFORCO')),
    leitos: col((c) => c.includes('LEITOS') && c.startsWith('N')),
    conversao: subCol('CONVERSAO'),
    incremento: subCol('INCREMENTO'),
    inicio: col((c) => c.includes('INICIO')),
    desmLeitos: col((c) => c.includes('DESMOBILIZACAO DE LEITOS')),
    desmRh: col((c) => c.includes('DESMOBILIZACAO DO REFORCO')),
  };
  const tiposCol = TIPOS_LEITO.map((t) => ({ id: t.id, i: subCol(t.busca[0]) })).filter((t) => t.i >= 0);

  const out = [];
  let anterior = '';
  for (const l of linhas.slice(iCab + 2)) {
    const nome = String(l[0] ?? '').replace(/\s+/g, ' ').trim();
    if (/^TOTAL/.test(norm(nome))) break;
    const temDado = l.slice(1).some((c) => String(c ?? '').trim() !== '');
    if (!nome && !temDado) continue;
    const tipos = tiposCol.filter((t) => marcado(l[t.i])).map((t) => t.id);
    const partes = partesLeitos(l[i.leitos], tipos);
    out.push({
      unidade: nome,
      semNome: !nome,
      depoisDe: nome ? '' : anterior,
      rh: marcado(l[i.rh]),
      situacao: marcado(l[i.conversao]) ? 'Conversão' : marcado(l[i.incremento]) ? 'Incremento' : '',
      tipos,
      partes,
      leitos: partes.reduce((a, p) => a + p.n, 0),
      inicio: dataSaz(l[i.inicio]),
      desmLeitos: dataSaz(l[i.desmLeitos]),
      desmRh: dataSaz(l[i.desmRh]),
      upa: /^UPA\b/.test(norm(nome)) && !/^UPAE/.test(norm(nome)),
    });
    if (nome) anterior = nome;
  }
  return out;
}

// palavras que não ajudam a achar a unidade
const VAZIAS = new Set(['UPA', '24H', 'DE', 'DA', 'DO', 'DOS', 'DAS', 'HOSPITAL', 'REGIONAL']);
const palavras = (s) => norm(s).replace(/[^A-Z0-9 ]/g, ' ').split(' ').filter((p) => p && !VAZIAS.has(p));

/** Acha a unidade (financeiro ou produção) que corresponde ao nome da planilha de sazonalidade. */
function acharUnidade(nomeFonte, unidades, { nomeDe, idDe, tipoDe }) {
  if (!nomeFonte) return null;
  const manual = CONFIG.vinculoSazonalidade?.[nomeFonte.trim()] ?? CONFIG.vinculoSazonalidade?.[norm(nomeFonte)];
  if (manual) {
    const m = unidades.find((u) => idDe(u) === manual || norm(nomeDe(u)) === norm(manual));
    if (m) return m;
  }
  const sigla = SIGLAS[chave(nomeFonte)];
  const ehUpa = /^UPA\b/.test(norm(nomeFonte)) && !/^UPAE/.test(norm(nomeFonte));
  const buscadas = palavras(sigla || nomeFonte);
  if (!buscadas.length) return null;
  const candidatas = unidades.filter((u) => {
    const nu = norm(nomeDe(u));
    if (ehUpa && (!/^UPA\b/.test(nu) || /^UPAE/.test(nu))) return false;
    if (!ehUpa && /^UPA/.test(nu)) return false;
    const pu = new Set(palavras(nomeDe(u)));
    return buscadas.every((p) => pu.has(p));
  });
  // prefere a unidade classificada (ex.: HRRBC CG 001/2016 em vez do contrato emergencial)
  return candidatas.sort((a, b) => (tipoDe(a) ? 0 : 1) - (tipoDe(b) ? 0 : 1))[0] || null;
}

/** Liga cada linha da sazonalidade a uma unidade. `campo` = nome do campo gravado na linha ('aba' ou 'id'). */
export function vincularSazonalidade(registros, unidades, opcoes) {
  return registros.map((r) => {
    const u = acharUnidade(r.unidade, unidades, opcoes);
    return { ...r, [opcoes.campo]: u ? opcoes.idDe(u) : '', nomePainel: u ? opcoes.nomeDe(u) : '' };
  });
}

/** Leitos por tipo (soma das linhas recebidas). */
export function leitosPorTipo(registros) {
  const m = {};
  registros.forEach((r) => r.partes.forEach((p) => { m[p.tipo || 'outro'] = (m[p.tipo || 'outro'] || 0) + p.n; }));
  return m;
}

/** Situação na data de hoje: ativos (antes da desmobilização) ou desmobilizados. */
export function situacaoSaz(r, hoje = new Date().toISOString().slice(0, 10)) {
  const fim = r.desmLeitos;
  if (!fim) return { id: 'semData', nome: 'Sem data de desmobilização' };
  return fim <= hoje ? { id: 'desmobilizado', nome: 'Desmobilizados' } : { id: 'ativo', nome: 'Em funcionamento' };
}
