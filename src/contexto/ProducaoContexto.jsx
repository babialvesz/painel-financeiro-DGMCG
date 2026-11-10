// Dados + filtros da área de Produção (ano, período, tipo)
import { createContext, useContext, useMemo, useState } from 'react';

const Ctx = createContext(null);

export function ProducaoProvider({ modelo, children }) {
  const [filtro, setFiltro] = useState({ ano: modelo.anos[0] || '', periodo: 'acum', tipo: '' });
  const valor = useMemo(() => {
    const mesesAno = modelo.meses.filter((m) => m.startsWith(filtro.ano));
    return {
      modelo, filtro,
      alterarFiltro: (p) => setFiltro((f) => ({ ...f, ...p, ...(p.ano && p.ano !== f.ano ? { periodo: 'acum' } : {}) })),
      mesesAno,
      comps: filtro.periodo === 'acum' ? mesesAno : [filtro.periodo],
      // janela = do início do ano até o mês escolhido (para gráficos de evolução)
      janela: filtro.periodo === 'acum' ? mesesAno : mesesAno.filter((m) => m <= filtro.periodo),
      unidades: modelo.unidades.filter((u) => !filtro.tipo || u.tipo === filtro.tipo),
    };
  }, [modelo, filtro]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useProducao = () => useContext(Ctx);
