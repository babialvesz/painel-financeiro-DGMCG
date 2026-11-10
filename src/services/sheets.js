// Leitura das abas do painel via Google Sheets API (com o token do usuário)
import { CONFIG } from '../config';
import { lerBase } from './base';

export class ErroSessao extends Error {}



// Lê uma aba "crua" (matriz de valores), sem tratar cabeçalho
export async function lerAbaCrua(nome, token, planilhaId = CONFIG.planilhaId) {
  const range = nome ? `'${nome.replace(/'/g, "''")}'!A1:Z` : 'A1:Z'; // sem nome = primeira aba
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${planilhaId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) throw new ErroSessao('Sua sessão expirou. Entre novamente.');
  if (!r.ok) throw new Error(await explicarErro(r, nome));
  return (await r.json()).values || [];
}

/** Traduz o erro do Google para uma frase clara (API desativada, sem acesso, aba não encontrada...). */
async function explicarErro(r, nome) {
  let msg = '';
  try { msg = (await r.json())?.error?.message || ''; } catch { /* resposta sem JSON */ }
  const onde = nome ? `a aba "${nome}"` : 'a planilha';
  if (/has not been used|is disabled|SERVICE_DISABLED|accessNotConfigured/i.test(msg)) {
    return 'A Google Sheets API não está ativada no projeto do Google Cloud deste painel (APIs e serviços → Biblioteca → Google Sheets API → Ativar).';
  }
  if (r.status === 403) return `Sua conta Google não tem permissão para abrir ${onde}. Peça para compartilharem a planilha com você (leitura).`;
  if (r.status === 404) return 'Planilha não encontrada. Confira o ID da planilha no config.json.';
  if (r.status === 400 && /Unable to parse range/i.test(msg)) return `Não encontrei ${onde} na planilha. Confira o nome da aba.`;
  return `Não foi possível ler ${onde} (${r.status})${msg ? `: ${msg}` : ''}.`;
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

// Devolve os dados no mesmo formato do dados-local.json.
// Lê direto a BASE_CONSOLIDADA (gerada pelo consolidarBase); não depende mais das abas PAINEL_*.
export async function carregar(token) {
  // as abas de descontos e de entregas não podem derrubar o painel inteiro se falharem
  const opcional = (nome) => lerAbaCrua(nome, token).then((linhas) => ({ linhas }), (e) => ({ erro: e.message }));
  const [base, descontos, entregas] = await Promise.all([
    lerAbaCrua(CONFIG.abas.base, token),
    opcional(CONFIG.abas.descontos),
    opcional(CONFIG.abas.entregas),
  ]);
  return {
    ...lerBase(base),
    descontosLinhas: descontos.linhas || [],
    descontosErro: descontos.erro || '',
    entregasLinhas: entregas.linhas || [],
    entregasErro: entregas.erro || '',
  };
}
