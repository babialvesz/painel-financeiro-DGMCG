// Dados embutidos na página (window.__DADOS__) ou arquivo local de desenvolvimento
export const temDadosEmbutidos = () => Boolean(window.__DADOS__);

export async function carregar() {
  if (window.__DADOS__) return window.__DADOS__;
  const r = await fetch('./dados-local.json');
  if (!r.ok) throw new Error('Arquivo public/dados-local.json não encontrado. Rode scripts/gerar_dados_local.py.');
  return r.json();
}
