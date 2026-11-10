// Lista única de unidades para o modo apresentação: junta financeiro (aba da planilha)
// e produção (Dados_Tratados) pelo número do contrato, depois pelo nome.
import { CONFIG } from '../config';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const slug = (s) => norm(s).replace(/\s+/g, '-').toLowerCase();
/** "CG 023/2022", "023/2022", "CG 0004/2026" → "023/2022" */
export function contrato(s) {
  const m = String(s ?? '').match(/(\d{1,4})\s*\/\s*(\d{4})/);
  return m ? `${String(Number(m[1])).padStart(3, '0')}/${m[2]}` : null;
}
const TIPO_FIN = { Hospitais: 'Hospital', UPAs: 'UPA', UPAEs: 'UPAE' };
export const PASTAS = [
  { id: 'Hospital', nome: 'Hospitais' },
  { id: 'UPA', nome: 'UPAs' },
  { id: 'UPAE', nome: 'UPAEs' },
  { id: 'Carreta', nome: 'Carretas' },
  { id: 'Outros', nome: 'Outras unidades' },
];

export function listaApresentacao(fin, prod, entregas = []) {
  const usadas = new Set();
  const lista = [];
  const prods = prod?.unidades || [];
  const porNome = (u) => {
    const manual = CONFIG.vinculoProducao[u.aba];
    if (manual) return prods.filter((p) => p.nome === manual);
    const c = contrato(u.aba);
    const porCg = c ? prods.filter((p) => contrato(p.cg) === c) : [];
    if (porCg.length) return porCg;
    const nome = norm(String(u.nome).replace(/\s*-?\s*(C\.?\s*G\.?|CONTRATO|N[ºO°])?\s*\d+\s*\/\s*\d{4}.*$/i, ''));
    const pre = norm(u.aba.split(/\s+-\s*/)[0]);
    return prods.filter((p) => norm(p.nome) === nome || norm(p.nome) === pre || norm(p.nome).startsWith(`${pre} `));
  };

  (fin?.unidades || []).forEach((u) => {
    const ps = porNome(u).filter((p) => !usadas.has(p.id));
    ps.forEach((p) => usadas.add(p.id));
    const p0 = ps[0];
    lista.push({
      id: slug(u.aba),
      nome: p0 && ps.length === 1 ? p0.nome : u.nome,
      tipo: p0?.tipo || TIPO_FIN[u.grupo] || (/^UPAE/i.test(u.aba) ? 'UPAE' : /^UPA/i.test(u.aba) ? 'UPA' : /HOSP/i.test(u.nome) ? 'Hospital' : /CARRETA/i.test(u.nome) ? 'Carreta' : 'Outros'),
      oss: p0?.oss || u.oss,
      cidade: p0?.cidade || '',
      fin: u,
      prod: ps,
      entrega: entregas.find((e) => e.aba === u.aba) || null,
    });
  });
  prods.filter((p) => !usadas.has(p.id)).forEach((p) => {
    lista.push({ id: `p-${p.id}`, nome: p.nome, tipo: p.tipo || 'Outros', oss: p.oss, cidade: p.cidade, fin: null, prod: [p], entrega: null });
  });
  lista.forEach((x) => { if (!PASTAS.some((p) => p.id === x.tipo)) x.tipo = 'Outros'; });
  return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
