// Regras de negócio do painel (sem dependência de tela)

export const anosDisponiveis = (resumo) =>
  [...new Set(resumo.meses.map((m) => m.slice(0, 4)))].sort().reverse();

export const mesesDoAno = (resumo, ano) => resumo.meses.filter((m) => m.startsWith(ano));

/**
 * Situação de cada unidade no período.
 * periodo = 'acum' (acumulado do ano) ou 'AAAA-MM' (um mês).
 * mesesDef = meses no vermelho no ano até o período escolhido.
 */
export function situacaoUnidades(resumo, ano, periodo) {
  const ms = mesesDoAno(resumo, ano);
  const noPeriodo = periodo === 'acum' ? ms : [periodo];
  const janela = periodo === 'acum' ? ms : ms.filter((m) => m <= periodo);
  return resumo.unidades
    .map((u) => {
      const vals = noPeriodo.map((m) => u.r[m]).filter(Boolean);
      return {
        ...u,
        res: vals.reduce((a, b) => a + b, 0),
        temDado: vals.length > 0,
        mesesDef: janela.filter((m) => (u.r[m] || 0) < 0).length,
      };
    })
    .filter((u) => u.temDado);
}

export function agrupar(unidades, alertaMeses) {
  const deficit = unidades.filter((u) => u.res < 0);
  const superavit = unidades.filter((u) => u.res > 0);
  const alerta = unidades.filter((u) => u.mesesDef >= alertaMeses);
  const grave = [...unidades].sort((a, b) => b.mesesDef - a.mesesDef || a.res - b.res)[0];
  return { deficit, superavit, alerta, grave: grave && grave.res < 0 ? grave : null };
}
