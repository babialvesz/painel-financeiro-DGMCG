// Configurações gerais do painel
export const CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  planilhaId: import.meta.env.VITE_PLANILHA_ID || '',
  // 'local' = lê public/dados-local.json (só para desenvolvimento)
  fonte: import.meta.env.VITE_FONTE || 'planilha',
  abas: {
    // aba gerada pelo consolidarBase (lida direto: não precisa mais das abas PAINEL_*)
    base: 'BASE_CONSOLIDADA',
    // lida direto, do jeito que a equipe preenche (sem Apps Script)
    descontos: 'DESCONTOS_DEVOLUÇÃO_COMPENSAÇÃO',
    // cronograma de entrega das prestações de contas (PCF), também lido direto
    entregas: 'DATAS DE ENTREGA',
  },
  // Prazo de entrega da PCF: dia 25 do mês seguinte à competência.
  // Se cair em fim de semana ou feriado, vale o próximo dia útil.
  entregas: {
    diaPrazo: 25,
    // feriados que caírem no dia 25 (AAAA-MM-DD), ex.: '2026-12-25'
    feriados: ['2026-12-25', '2027-12-25'],
  },
  // Entregas: liga a sigla/nome da aba DATAS DE ENTREGA a uma aba do painel, quando não bate sozinho
  // Apresentação: liga a aba financeira à unidade da produção, quando o contrato e o nome não batem sozinhos
  vinculoProducao: {
    'UPAE PETROLINA - CG 010/2025': 'UPAE/UPA Petrolina',
  },
  vinculoEntregas: {
    HRPSM: 'HRSM - CG 019/2022',
    HMAGRESTE: 'HMAAGRESTE - CG 001/2025',
  },
  // leitura das planilhas + e-mail de quem entrou (para o perfil)
  escopo: 'https://www.googleapis.com/auth/spreadsheets.readonly openid email profile',
  // Áreas do painel (uma por gerência). Cada uma lê a sua própria planilha.
  areas: {
    financeiro: { nome: 'Financeiro', gerencia: 'GGCCG', titulo: 'Acompanhamento Financeiro das Unidades', inicio: '#/' },
    producao: { nome: 'Produção', gerencia: 'GMCG', titulo: 'Produção das Unidades', inicio: '#/producao' },
  },
  // Planilha de produção (GMCG) e aba lida
  planilhaProducaoId: import.meta.env.VITE_PLANILHA_PRODUCAO_ID || '1T9mZMRHQ1Lt1bZZuuZNSGxd89CBjC1g7eK2q0It5HKo',
  abaProducao: 'Dados_Tratados',
  // Cadastro das unidades (cidade, endereço, CNES, latitude/longitude) — BD Unidades OSS, aba Unidades
  planilhaCadastroId: import.meta.env.VITE_PLANILHA_CADASTRO_ID || '1h6yEUJCEzHAtWVw1IHGtND5g79Qmv3RW7fBL-qdmXmY',
  abaCadastro: 'Unidades',
  // Perfis: planilha "controle de acesso aos paineis" (colunas nome | email | acessos permitidos).
  // acessos = GGCCG (financeiro), GMCG (produção), ADMIN (tudo); vários separados por vírgula.
  // Vazio = sem controle de perfis.
  planilhaPerfisId: import.meta.env.VITE_PLANILHA_PERFIS_ID || '146YqXQ9X7W7tkdOD06XLf7Pph0RdiAueVaddDV6bfwI',
  abaPerfis: '', // vazio = primeira aba da planilha
  // E-mails com acesso a todas as áreas sem depender da planilha de acessos (config.json → "acessoLivre")
  acessoLivre: [],
  perfis: {
    ADMIN: ['financeiro', 'producao'],
    DGMCG: ['financeiro', 'producao'],
    CGICG: ['financeiro', 'producao'],
    GGCCG: ['financeiro'],
    GMCG: ['producao'],
  },
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
    if (c.planilhaProducaoId) CONFIG.planilhaProducaoId = String(c.planilhaProducaoId).trim();
    if (c.planilhaPerfisId !== undefined) CONFIG.planilhaPerfisId = String(c.planilhaPerfisId).trim();
    if (c.planilhaCadastroId) CONFIG.planilhaCadastroId = String(c.planilhaCadastroId).trim();
    if (Array.isArray(c.acessoLivre)) CONFIG.acessoLivre = c.acessoLivre.map((e) => String(e).trim().toLowerCase()).filter(Boolean);
  } catch { /* sem config.json: usa os valores do build (.env) */ }
}
