// Ordenação de tabela por coluna (clique no cabeçalho)
import { useMemo, useState } from 'react';

export function useOrdenacao(linhas, inicial, sentidoInicial = 'desc') {
  const [ord, setOrd] = useState({ col: inicial, sentido: sentidoInicial });
  const ordenadas = useMemo(() => {
    const col = ord.col;
    const f = typeof col === 'function' ? col : (l) => l[col];
    return [...linhas].sort((a, b) => {
      const x = f(a), y = f(b);
      const r = typeof x === 'string' ? x.localeCompare(y, 'pt-BR') : (x ?? -Infinity) - (y ?? -Infinity);
      return ord.sentido === 'asc' ? r : -r;
    });
  }, [linhas, ord]);
  const cabecalho = (chave, rotulo, extra = {}) => ({
    onClick: () => setOrd((o) => ({ col: chave, sentido: o.col === chave && o.sentido === 'desc' ? 'asc' : 'desc' })),
    className: `ordenavel ${extra.className || ''} ${ord.col === chave ? `ord-${ord.sentido}` : ''}`,
    'aria-sort': ord.col === chave ? (ord.sentido === 'asc' ? 'ascending' : 'descending') : 'none',
    children: rotulo,
    title: 'Clique para ordenar',
  });
  return { ordenadas, cabecalho };
}
