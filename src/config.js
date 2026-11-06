// Configurações gerais do painel
export const CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  planilhaId: import.meta.env.VITE_PLANILHA_ID || '',
  // 'local' = lê public/dados-local.json (só para desenvolvimento)
  fonte: import.meta.env.VITE_FONTE || 'planilha',
  abas: {
    unidades: 'PAINEL_UNIDADES',
    itens: 'PAINEL_ITENS',
    valores: 'PAINEL_VALORES',
    // lida direto, do jeito que a equipe preenche (sem Apps Script)
    descontos: 'DESCONTOS_DEVOLUÇÃO_COMPENSAÇÃO',
  },
  escopo: 'https://www.googleapis.com/auth/spreadsheets.readonly',
  // nº de meses no vermelho para a unidade entrar em "alerta"
  alertaMeses: 3,
  // grupo/porte que não entram na comparação com unidades parecidas
  semClassificacao: 'Não classificado',
  // Identificação institucional (topo do painel)
  instituicao: {
    // arquivos em public/
    logos: [
      { src: './logo-ses.png', alt: 'Secretaria da Saúde – Governo de Pernambuco' },
      { src: './logo-dgmcg.png', alt: 'DGMCG – Diretoria Geral de Monitoramento dos Contratos de Gestão' },
    ],
    titulo: 'Acompanhamento Financeiro das Unidades',
    creditos: 'Desenvolvido por Bárbara Silva – Assessora Técnica · DGMCG',
  },
  // Nome padronizado de unidades (chave = nome da aba na BASE_CONSOLIDADA).
  // O ideal é corrigir também na planilha; aqui garante o padrão no painel.
  // Descontos: liga o código da unidade na aba de descontos a uma aba do painel,
  // quando o nome não bate automaticamente. Ex.: '3204': 'HMAAGRESTE - CG 001/2025'
  vinculoDescontos: {
    '2923': 'CMP - CG 001/2024', // Implantação do Programa Carretas da Saúde = Carretas da Mulher Pernambucana
    '3204': 'HMAAGRESTE - CG 001/2025', // Hospital da Mulher - Caruaru = Hospital da Mulher do Agreste
  },
  nomesPadrao: {
    'HNSA - CG 003/2026': 'HOSPITAL NOSSA SENHORA APARECIDA - HNSA',
  },
};

export const googleConfigurado = () => Boolean(CONFIG.clientId && CONFIG.planilhaId && !/COLE_AQUI/.test(CONFIG.clientId));

/**
 * Lê o config.json que fica ao lado do index.html no servidor.
 * Assim a TI troca o ID do Google ou da planilha sem precisar gerar o site de novo.
 */
export async function carregarConfigServidor() {
  try {
    const r = await fetch('./config.json', { cache: 'no-store' });
    if (!r.ok) return;
    const c = await r.json();
    if (c.googleClientId) CONFIG.clientId = String(c.googleClientId).trim();
    if (c.planilhaId) CONFIG.planilhaId = String(c.planilhaId).trim();
  } catch { /* sem config.json: usa os valores do build (.env) */ }
}
