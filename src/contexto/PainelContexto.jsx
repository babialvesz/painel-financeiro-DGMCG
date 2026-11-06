// Dados + filtros globais (ano, período, tipo, porte), compartilhados por todas as telas
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { anosDisponiveis, filtrarUnidades, mesesDaJanela, mesesDoAno, mesesDoPeriodo } from '../utils/analise';

const Ctx = createContext(null);

export function PainelProvider({ modelo, children }) {
  const anos = useMemo(() => anosDisponiveis(modelo), [modelo]);
  const [filtro, setFiltro] = useState({ ano: anos[0], periodo: 'acum', grupo: '', porte: '' });
  useEffect(() => { if (!anos.includes(filtro.ano)) setFiltro((f) => ({ ...f, ano: anos[0], periodo: 'acum' })); }, [anos, filtro.ano]);

  const valor = useMemo(() => {
    const mesesAno = mesesDoAno(modelo, filtro.ano);
    return {
      modelo,
      anos,
      filtro,
      alterarFiltro: (parcial) => setFiltro((f) => {
        const novo = { ...f, ...parcial };
        if (parcial.ano && parcial.ano !== f.ano) novo.periodo = 'acum';
        if ('grupo' in parcial && parcial.grupo !== f.grupo) novo.porte = '';
        return novo;
      }),
      mesesAno,
      meses: mesesDoPeriodo(modelo, filtro.ano, filtro.periodo),
      janela: mesesDaJanela(modelo, filtro.ano, filtro.periodo),
      unidades: filtrarUnidades(modelo, filtro),
    };
  }, [modelo, anos, filtro]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const usePainel = () => useContext(Ctx);
