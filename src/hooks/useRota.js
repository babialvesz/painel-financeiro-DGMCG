// Roteamento simples pelo # da URL (funciona no GitHub Pages e em qualquer servidor)
// Ex.: #/unidade/HMA%20-%20CG%20023%2F2022?item=6.1.1.1
import { useEffect, useState } from 'react';

function ler() {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [caminho, busca = ''] = h.split('?');
  return {
    partes: caminho.split('/').filter(Boolean).map(decodeURIComponent),
    query: Object.fromEntries(new URLSearchParams(busca)),
  };
}

export function useRota() {
  const [rota, setRota] = useState(ler);
  useEffect(() => {
    const mudou = () => { setRota(ler()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', mudou);
    return () => window.removeEventListener('hashchange', mudou);
  }, []);
  return rota;
}

/** Monta um link: link('unidade', aba, { item: '1.1' }) → '#/unidade/...?item=1.1' */
export function link(...args) {
  const query = typeof args[args.length - 1] === 'object' ? args.pop() : null;
  const q = query && Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return `#/${args.map((a) => encodeURIComponent(a)).join('/')}${q && q.length ? `?${new URLSearchParams(q)}` : ''}`;
}

export const navegar = (href) => { window.location.hash = href.replace(/^#/, ''); };
