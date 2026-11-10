// Login com Google (Google Identity Services, fluxo de token no navegador)
import { CONFIG } from '../config';

const CHAVE = 'painel_token';
let token = null;
let expiraEm = 0;

function esperarGIS(tempoMax = 10000) {
  return new Promise((resolve, reject) => {
    const inicio = Date.now();
    (function checar() {
      if (window.google?.accounts?.oauth2) return resolve();
      if (Date.now() - inicio > tempoMax) return reject(new Error('Não foi possível carregar o login do Google.'));
      setTimeout(checar, 100);
    })();
  });
}

function salvar() {
  try { sessionStorage.setItem(CHAVE, JSON.stringify({ token, expiraEm })); } catch { /* sem storage */ }
}

export function tokenValido() {
  if (token && Date.now() < expiraEm) return token;
  try {
    const s = JSON.parse(sessionStorage.getItem(CHAVE) || 'null');
    if (s && Date.now() < s.expiraEm) { token = s.token; expiraEm = s.expiraEm; return token; }
  } catch { /* sem storage */ }
  return null;
}

export async function entrar() {
  await esperarGIS();
  return new Promise((resolve, reject) => {
    const cliente = window.google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.clientId,
      scope: CONFIG.escopo,
      callback: (r) => {
        if (r.error) return reject(new Error(r.error_description || r.error));
        token = r.access_token;
        expiraEm = Date.now() + (Number(r.expires_in) - 60) * 1000;
        salvar();
        resolve(token);
      },
      error_callback: (e) => reject(new Error(
        e?.type === 'popup_closed' ? 'A janela do Google foi fechada antes de terminar o login. Se ela mostrou "Acesso bloqueado", este e-mail ainda não está liberado no Google Cloud (usuários de teste) — ou publique o app.'
          : e?.type === 'popup_failed_to_open' ? 'O navegador bloqueou a janela de login do Google. Permita pop-ups para este site e tente de novo.'
            : (e?.message || 'Falha no login.'))),
    });
    cliente.requestAccessToken({ prompt: 'select_account' }); // sempre deixa escolher a conta (útil para trocar de usuário)
  });
}

/** E-mail e nome de quem entrou (precisa do escopo "email profile"). */
export async function usuario(tk) {
  try {
    const s = JSON.parse(sessionStorage.getItem(CHAVE + '_usuario') || 'null');
    if (s?.email) return s;
  } catch { /* sem storage */ }
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tk}` } });
  if (!r.ok) throw new Error('Não foi possível identificar sua conta Google. Entre novamente.');
  const j = await r.json();
  const u = { email: String(j.email || '').toLowerCase(), nome: j.name || j.given_name || '', foto: j.picture || '' };
  try { sessionStorage.setItem(CHAVE + '_usuario', JSON.stringify(u)); } catch { /* sem storage */ }
  return u;
}

export function sair() {
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token, () => {});
  token = null; expiraEm = 0;
  try { sessionStorage.removeItem(CHAVE); sessionStorage.removeItem(CHAVE + '_usuario'); } catch { /* sem storage */ }
}
