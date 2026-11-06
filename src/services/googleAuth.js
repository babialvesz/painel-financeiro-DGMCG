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
      error_callback: (e) => reject(new Error(e?.type === 'popup_closed' ? 'Login cancelado.' : (e?.message || 'Falha no login.'))),
    });
    cliente.requestAccessToken();
  });
}

export function sair() {
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token, () => {});
  token = null; expiraEm = 0;
  try { sessionStorage.removeItem(CHAVE); } catch { /* sem storage */ }
}
