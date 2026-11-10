// Perfis de acesso: quem vê qual área (financeiro = GGCCG, produção = GMCG, admin = tudo)
//
// Planilha "controle de acesso aos paineis" (CONFIG.planilhaPerfisId), primeira aba:
//   nome | email | acessos permitidos
//   Fulana | fulana@gmail.com | GGCCG
//   Beltrano | beltrano@gmail.com | GMCG, GGCCG     (mais de um: separe por vírgula)
// A coluna de acessos também pode se chamar PERFIL. Outras colunas são ignoradas.
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
    throw new Error(`Não foi possível ler a planilha de acessos do painel. ${e.message}`);
  }
  const iCab = linhas.findIndex((l) => l.some((c) => norm(c).replace(/[^A-Z]/g, '') === 'EMAIL'));
  if (iCab < 0) throw new Error('A planilha de acessos precisa da coluna "email".');
  const cab = linhas[iCab].map((c) => norm(c).replace(/[^A-Z]/g, ''));
  const iE = cab.indexOf('EMAIL');
  const iP = cab.findIndex((c) => c === 'PERFIL' || c.startsWith('ACESSO'));
  if (iP < 0) throw new Error('A planilha de acessos precisa da coluna "acessos permitidos".');
  const linha = linhas.slice(iCab + 1).find((l) => String(l[iE] ?? '').trim().toLowerCase() === email);
  if (!linha) throw new Error(`O e-mail ${email} não está cadastrado no painel. Peça acesso à CGICG.`);
  const areas = areasDoPerfil(linha[iP]);
  if (!areas.length) throw new Error(`O perfil "${linha[iP] || '(vazio)'}" não dá acesso a nenhuma área. Use GGCCG, GMCG ou ADMIN.`);
  return { areas, perfil: String(linha[iP]).trim() };
}
