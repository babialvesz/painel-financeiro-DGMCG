// Leitura das abas do painel via Google Sheets API (com o token do usuário)
import { CONFIG } from '../config';

export class ErroSessao extends Error {}

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const texto = (v) => String(v ?? '').trim();

async function lerAbas(nomes, token) {
  const ranges = nomes.map((n) => `ranges=${encodeURIComponent(n)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.planilhaId}/values:batchGet?${ranges}&valueRenderOption=UNFORMATTED_VALUE`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) throw new ErroSessao('Sua sessão expirou. Entre novamente.');
  if (r.status === 403) throw new Error('Sua conta Google não tem acesso à planilha. Peça acesso de leitura.');
  if (r.status === 400 || r.status === 404) throw new Error('Abas do painel não encontradas. Rode o painel_gerarDados() no Apps Script.');
  if (!r.ok) throw new Error(`Erro ao ler a planilha (${r.status}).`);
  const { valueRanges = [] } = await r.json();
  return valueRanges.map(({ values = [] }) => {
    if (!values.length) return [];
    const cab = values[0].map(norm);
    return values.slice(1).map((l) => Object.fromEntries(cab.map((c, i) => [c, l[i]])));
  });
}

// Lê uma aba "crua" (matriz de valores), sem tratar cabeçalho
export async function lerAbaCrua(nome, token, planilhaId = CONFIG.planilhaId) {
  const range = nome ? `'${nome.replace(/'/g, "''")}'!A1:Z` : 'A1:Z'; // sem nome = primeira aba
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${planilhaId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) throw new ErroSessao('Sua sessão expirou. Entre novamente.');
  if (r.status === 403) throw new Error(`Sua conta Google não tem acesso à planilha${nome ? ` da aba "${nome}"` : ''}.`);
  if (!r.ok) throw new Error(`Não foi possível ler a aba "${nome}" (${r.status}).`);
  return (await r.json()).values || [];
}

/** Planilha de produção (GMCG): aba Dados_Tratados + cadastro das unidades (mapa), que é opcional. */
export async function carregarProducao(token) {
  const opcional = (aba) => lerAbaCrua(aba, token, CONFIG.planilhaCadastroId).catch((e) => ({ erro: e.message }));
  const [linhas, cad, oss] = await Promise.all([
    lerAbaCrua(CONFIG.abaProducao, token, CONFIG.planilhaProducaoId),
    CONFIG.planilhaCadastroId ? opcional(CONFIG.abaCadastro) : [],
    CONFIG.planilhaCadastroId ? opcional('OSS (legenda)') : [],
  ]);
  return {
    linhas,
    cadastroLinhas: Array.isArray(cad) ? cad : [],
    ossLinhas: Array.isArray(oss) ? oss : [],
    cadastroErro: cad?.erro || '',
  };
}

// Devolve os dados no mesmo formato do dados-local.json
export async function carregar(token) {
  const { unidades, itens, valores } = CONFIG.abas;
  // as abas de descontos e de entregas não podem derrubar o painel inteiro se falharem
  const opcional = (nome) => lerAbaCrua(nome, token).then((linhas) => ({ linhas }), (e) => ({ erro: e.message }));
  const [[u, it, v], descontos, entregas] = await Promise.all([
    lerAbas([unidades, itens, valores], token),
    opcional(CONFIG.abas.descontos),
    opcional(CONFIG.abas.entregas),
  ]);
  return {
    descontosLinhas: descontos.linhas || [],
    descontosErro: descontos.erro || '',
    entregasLinhas: entregas.linhas || [],
    entregasErro: entregas.erro || '',
    atualizado: texto(u[0]?.ATUALIZADO_EM),
    unidades: u.map((l) => ({
      aba: texto(l.ABA), nome: texto(l.UNIDADE) || texto(l.ABA), oss: texto(l.OSS),
      grupo: texto(l.GRUPO), porte: texto(l.PORTE),
    })),
    itens: it.map((l) => ({ c: texto(l.CODIGO), n: texto(l.ITEM) })),
    valores: v.map((l) => [texto(l.ABA), texto(l.COMPETENCIA), texto(l.CHAVE), Number(l.VALOR) || 0]),
  };
}
