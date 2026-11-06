// Regras de negócio do painel (funções puras, sem tela)
import { CONFIG } from '../config';

/* ---------- Período ---------- */

export const anosDisponiveis = (modelo) =>
  [...new Set(modelo.meses.map((m) => m.slice(0, 4)))].sort().reverse();

export const mesesDoAno = (modelo, ano) => modelo.meses.filter((m) => m.startsWith(ano));

/** Meses somados nos totais: o ano inteiro (acumulado) ou só o mês escolhido. */
export const mesesDoPeriodo = (modelo, ano, periodo) =>
  periodo === 'acum' ? mesesDoAno(modelo, ano) : [periodo];

/** Meses usados nas estatísticas (mín., máx., média, evolução): do início do ano até o fim do período. */
export const mesesDaJanela = (modelo, ano, periodo) =>
  periodo === 'acum' ? mesesDoAno(modelo, ano) : mesesDoAno(modelo, ano).filter((m) => m <= periodo);

/* ---------- Somas ---------- */

export const valor = (u, comp, chave) => u.v[comp]?.[chave] || 0;

export const soma = (u, chave, meses) => meses.reduce((s, m) => s + valor(u, m, chave), 0);

/** Meses em que a unidade tem lançamento de despesa ou receita. */
export const mesesComDado = (u, meses) => meses.filter((m) => u.v[m] && (u.v[m].DESP || u.v[m].REC));

/** Quantas unidades prestaram contas em cada mês. */
export function prestacoesPorMes(unidades, meses) {
  return meses.map((m) => unidades.filter((u) => u.v[m] && (u.v[m].DESP || u.v[m].REC)).length);
}

/* ---------- Unidades ---------- */

export function filtrarUnidades(modelo, { grupo, porte }) {
  return modelo.unidades.filter((u) => (!grupo || u.grupo === grupo) && (!porte || u.porte === porte));
}

/** Situação da unidade no período. */
export function situacao(u, meses, janela) {
  const comDado = mesesComDado(u, meses);
  return {
    u,
    rec: soma(u, 'REC', meses),
    desp: soma(u, 'DESP', meses),
    res: soma(u, 'RES', meses),
    temDado: comDado.length > 0,
    mesesDef: janela.filter((m) => u.v[m] && valor(u, m, 'RES') < 0).length,
    mesesJanela: mesesComDado(u, janela).length,
  };
}

export function situacoes(unidades, meses, janela) {
  return unidades.map((u) => situacao(u, meses, janela)).filter((s) => s.temDado);
}

export function agrupar(sits) {
  const deficit = sits.filter((s) => s.res < 0);
  const superavit = sits.filter((s) => s.res > 0);
  const alerta = sits.filter((s) => s.mesesDef >= CONFIG.alertaMeses);
  const grave = [...sits].sort((a, b) => b.mesesDef - a.mesesDef || a.res - b.res)[0];
  return { deficit, superavit, alerta, grave: grave && grave.res < 0 ? grave : null };
}

/** Unidades parecidas: mesmo grupo e porte (exceto "Não classificado"). */
export function pares(modelo, u) {
  if (!u.grupo || u.grupo === CONFIG.semClassificacao) return [];
  return modelo.unidades.filter((x) => x.grupo === u.grupo && x.porte === u.porte);
}

/* ---------- Itens ---------- */

/** Códigos com valor ≠ 0 para um conjunto de unidades no período. */
export function codigosComValor(modelo, unidades, meses) {
  const set = new Set();
  unidades.forEach((u) => meses.forEach((m) => {
    const v = u.v[m];
    if (v) Object.keys(v).forEach((k) => { if (modelo.itens[k] && v[k]) set.add(k); });
  }));
  return set;
}

/** Itens "finais": têm valor e nenhum subitem com valor (evita contar o pai junto com o filho). */
export function itensFinais(modelo, codigos) {
  return [...codigos].filter((c) => !modelo.itens[c].filhos.some((f) => temDescendente(modelo, f, codigos)));
}

function temDescendente(modelo, c, codigos) {
  return codigos.has(c) || modelo.itens[c].filhos.some((f) => temDescendente(modelo, f, codigos));
}

/** Estatísticas de uma série mensal: mín., máx., média, variação (como no painel analítico da planilha). */
export function estatisticas(valores) {
  const vals = valores.filter((v) => v !== null);
  if (!vals.length) return { min: 0, max: 0, media: 0, varRS: 0, varPct: null };
  const min = Math.min(...vals), max = Math.max(...vals);
  const media = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { min, max, media, varRS: max - min, varPct: min > 0 ? (max - min) / min : null };
}

/** Série mensal de um item numa unidade (null = mês sem prestação de contas). */
export const serieItem = (u, chave, meses) => mesesComDado(u, meses).map((m) => valor(u, m, chave));

/**
 * Análise completa dos itens de uma unidade.
 * Devolve linhas por código (todos os níveis) + destaques.
 */
export function analisarItensUnidade(modelo, u, meses, janela) {
  const despTotal = soma(u, 'DESP', meses);
  const codigos = codigosComValor(modelo, [u], meses);
  const finais = new Set(itensFinais(modelo, codigos));
  const mesesSerie = mesesComDado(u, janela);
  const grupoPares = pares(modelo, u).filter((p) => p !== u && soma(p, 'DESP', meses) > 0);

  const linhas = {};
  codigos.forEach((c) => {
    const total = soma(u, c, meses);
    const serie = mesesSerie.map((m) => valor(u, m, c));
    const est = estatisticas(serie);
    const pct = despTotal ? total / despTotal : 0;
    let pctPares = null;
    if (grupoPares.length >= 2) {
      pctPares = grupoPares.reduce((s, p) => s + soma(p, c, meses) / soma(p, 'DESP', meses), 0) / grupoPares.length;
    }
    linhas[c] = { c, item: modelo.itens[c], total, pct, serie, mesesSerie, ...est, pctPares, difPares: pctPares === null ? null : pct - pctPares, final: finais.has(c) };
  });

  const listaFinais = [...finais].map((c) => linhas[c]).filter((l) => l.total > 0);
  const porTotal = [...listaFinais].sort((a, b) => b.total - a.total);

  // Maior alta: último mês vs média dos meses anteriores (precisa de 3+ meses)
  let maiorAlta = null;
  if (mesesSerie.length >= 3) {
    listaFinais.forEach((l) => {
      const ant = l.serie.slice(0, -1);
      const mediaAnt = ant.reduce((a, b) => a + b, 0) / ant.length;
      const dif = l.serie[l.serie.length - 1] - mediaAnt;
      if (dif > 0 && (!maiorAlta || dif > maiorAlta.dif)) maiorAlta = { ...l, dif, mediaAnt, ultimo: l.serie[l.serie.length - 1], mesUltimo: mesesSerie[mesesSerie.length - 1] };
    });
  }

  // Mais acima do padrão: maior diferença de participação vs unidades parecidas, ponderada em R$
  let acimaPadrao = null;
  listaFinais.forEach((l) => {
    if (l.difPares === null || l.difPares <= Math.max(0.01, 0.3 * l.pctPares)) return;  // mesmo critério da etiqueta "Acima do normal"
    const excesso = l.difPares * despTotal;
    if (!acimaPadrao || excesso > acimaPadrao.excesso) acimaPadrao = { ...l, excesso };
  });

  return {
    despTotal,
    linhas,
    finais: listaFinais,
    temPares: grupoPares.length >= 2,
    qtdPares: grupoPares.length,
    destaques: {
      maior: porTotal[0] || null,
      menor: porTotal[porTotal.length - 1] || null,
      maiorAlta,
      acimaPadrao,
    },
    maioresDespesas: porTotal.slice(0, 7),
    maioresVariacoes: [...listaFinais].sort((a, b) => b.varRS - a.varRS).slice(0, 7),
  };
}

/** Ranking das unidades num item. */
export function rankingItem(modelo, unidades, c, meses, janela) {
  return unidades
    .map((u) => {
      const total = soma(u, c, meses);
      const desp = soma(u, 'DESP', meses);
      const serie = serieItem(u, c, janela);
      return { u, total, pct: desp ? total / desp : 0, serie, ...estatisticas(serie) };
    })
    .filter((l) => l.total !== 0);
}

/* ---------- Visão da rede SEM somar unidades ---------- */
// Cada unidade tem orçamento próprio: aqui só contamos unidades ou comparamos o peso
// de cada gasto dentro do orçamento de cada uma.

/** Por mês: quantas unidades ficaram no vermelho, no azul ou ainda não enviaram. */
export function contagemPorMes(unidades, meses) {
  return meses.map((m) => {
    let vermelho = 0, azul = 0, semEnvio = 0;
    unidades.forEach((u) => {
      if (!u.v[m] || !(u.v[m].DESP || u.v[m].REC)) semEnvio++;
      else if (valor(u, m, 'RES') < 0) vermelho++;
      else azul++;
    });
    return { m, vermelho, azul, semEnvio, enviaram: vermelho + azul };
  });
}

/**
 * Para cada item: em quantas unidades aparece, quanto pesa (em média) no gasto de cada unidade
 * e qual unidade tem o maior peso. Nenhum valor é somado entre unidades.
 */
export function compararItens(modelo, unidades, meses) {
  const base = unidades
    .map((u) => ({ u, desp: soma(u, 'DESP', meses) }))
    .filter((b) => b.desp > 0);
  const linhas = {};
  Object.keys(modelo.itens).forEach((c) => {
    const pesos = [];
    base.forEach(({ u, desp }) => {
      const t = soma(u, c, meses);
      if (t > 0) pesos.push({ u, total: t, pct: t / desp });
    });
    if (!pesos.length) return;
    pesos.sort((a, b) => b.pct - a.pct);
    linhas[c] = {
      c,
      item: modelo.itens[c],
      qtdUnidades: pesos.length,
      qtdBase: base.length,
      pesoMedio: pesos.reduce((s, p) => s + p.pct, 0) / pesos.length,
      maior: pesos[0],
      menor: pesos[pesos.length - 1],
      pesos,
    };
  });
  return { linhas, qtdBase: base.length };
}

/** Em quantas unidades cada grupo é o maior gasto. */
export function maiorGrupoPorUnidade(modelo, unidades, meses) {
  const cont = {};
  unidades.forEach((u) => {
    let melhor = null, mv = 0;
    modelo.raizes.forEach((c) => { const t = soma(u, c, meses); if (t > mv) { mv = t; melhor = c; } });
    if (melhor) cont[melhor] = (cont[melhor] || 0) + 1;
  });
  return cont;
}

/* ---------- Descontos ---------- */

/** Lançamentos de desconto no período e nos filtros de tipo/porte. */
export function descontosFiltrados(modelo, { ano, periodo, grupo, porte }) {
  return modelo.descontos.filter((d) => {
    if (!d.comp.startsWith(ano)) return false;
    if (periodo !== 'acum' && d.comp !== periodo) return false;
    if (grupo || porte) {
      const u = d.aba && modelo.porAba[d.aba];
      if (!u || (grupo && u.grupo !== grupo) || (porte && u.porte !== porte)) return false;
    }
    return true;
  });
}

/** Soma dos descontos por unidade do painel (aba) no período. */
export function deducoesPorUnidade(modelo, filtro) {
  const m = {};
  descontosFiltrados(modelo, { ...filtro, grupo: '', porte: '' }).forEach((d) => {
    if (d.aba) m[d.aba] = (m[d.aba] || 0) + d.valor;
  });
  return m;
}
