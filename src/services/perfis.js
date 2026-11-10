// Perfis de acesso: quem vê qual área (financeiro = GGCCG, produção = GMCG, admin = tudo)
//
// Aba PERFIS (na planilha configurada em CONFIG.planilhaPerfisId):
//   E-MAIL | PERFIL | NOME
//   fulana@gmail.com | GGCCG | Fulana
//   beltrano@gmail.com | GMCG, GGCCG | Beltrano    (mais de um perfil: separe por vírgula)
//
// Importante: o perfil só organiza o que cada pessoa vê. Quem protege os DADOS é a permissão
// de cada planilha no Google: sem acesso à planilha, a área não carrega para aquela pessoa.
import { CONFIG } from '../config';
import { ErroSessao, lerAbaCrua } from './sheets';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const todas = () => Object.keys(CONFIG.areas);

/** "GMCG, GGCCG" → ['producao', 'financeiro'] */
export function areasDoPerfil(texto) {
  const set = new Set();
  String(texto ?? '').split(/[,;/]+/).map(norm).filter(Boolean).forEach((p) => (CONFIG.perfis[p] || []).forEach((a) => set.add(a)));
  return todas().filter((a) => set.has(a));
}

/** Lê a aba PERFIS e devolve as áreas liberadas para o e-mail. */
export async function areasDoUsuario(email, token) {
  if (!CONFIG.planilhaPerfisId) return { areas: todas(), perfil: 'Sem controle de perfis' };
  let linhas;
  try {
    linhas = await lerAbaCrua(CONFIG.abaPerfis, token, CONFIG.planilhaPerfisId);
  } catch (e) {
    if (e instanceof ErroSessao) throw e;
    throw new Error('Não foi possível ler a lista de perfis do painel. Peça à CGICG para liberar seu acesso.');
  }
  const iCab = linhas.findIndex((l) => l.some((c) => norm(c).replace(/[^A-Z]/g, '') === 'EMAIL'));
  if (iCab < 0) throw new Error('A aba PERFIS precisa das colunas E-MAIL e PERFIL.');
  const cab = linhas[iCab].map((c) => norm(c).replace(/[^A-Z]/g, ''));
  const iE = cab.indexOf('EMAIL'), iP = cab.indexOf('PERFIL');
  const linha = linhas.slice(iCab + 1).find((l) => String(l[iE] ?? '').trim().toLowerCase() === email);
  if (!linha) throw new Error(`O e-mail ${email} não está cadastrado no painel. Peça acesso à CGICG.`);
  const areas = areasDoPerfil(linha[iP]);
  if (!areas.length) throw new Error(`O perfil "${linha[iP] || '(vazio)'}" não dá acesso a nenhuma área. Use GGCCG, GMCG ou ADMIN.`);
  return { areas, perfil: String(linha[iP]).trim() };
}
