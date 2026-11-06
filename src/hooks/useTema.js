// Tema escuro/claro (lembrado neste navegador)
import { useEffect, useState } from 'react';

const CHAVE = 'painel_tema_v2'; // v2: ignora o tema escuro salvo por versões antigas
const PADRAO = 'claro';
const ler = () => { try { return localStorage.getItem(CHAVE) || PADRAO; } catch { return PADRAO; } };

export function useTema() {
  const [tema, setTema] = useState(ler);
  // aplica já na renderização, para os gráficos lerem as cores certas
  document.documentElement.dataset.tema = tema;
  useEffect(() => {
    try { localStorage.setItem(CHAVE, tema); } catch { /* sem storage */ }
  }, [tema]);
  return [tema, () => setTema((t) => (t === 'escuro' ? 'claro' : 'escuro'))];
}

/** Lê uma cor do tema atual (variável CSS) para usar nos gráficos. */
export const corTema = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || '#888';
