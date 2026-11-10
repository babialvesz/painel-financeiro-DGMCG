// Regras das telas de Produção (por unidade; nada é somado entre unidades)

export const AVALIADAS = ['cumprida', 'nao'];

/** Resumo de um indicador numa unidade, nos meses escolhidos (soma só dentro da própria unidade). */
export function resumoIndicador(u, indicador, comps) {
  const serie = comps.map((c) => u.dados[indicador]?.[c] || null);
  const av = serie.filter((r) => r && AVALIADAS.includes(r.status));
  const meta = av.reduce((s, r) => s + r.meta, 0);
  const prod = av.reduce((s, r) => s + r.prod, 0);
  return {
    indicador, serie,
    meta, prod, pct: meta ? prod / meta : null,
    avaliados: av.length,
    cumpridos: av.filter((r) => r.status === 'cumprida').length,
    semProd: serie.filter((r) => r?.status === 'semProd').length,
  };
}

/** Todos os indicadores de uma unidade + totais de metas cumpridas. */
export function resumoUnidade(u, comps) {
  const inds = Object.keys(u.dados).map((k) => resumoIndicador(u, k, comps)).filter((r) => r.avaliados || r.semProd);
  const avaliados = inds.reduce((s, r) => s + r.avaliados, 0);
  const cumpridos = inds.reduce((s, r) => s + r.cumpridos, 0);
  return {
    u, inds: inds.sort((a, b) => (a.pct ?? 9) - (b.pct ?? 9)),
    avaliados, cumpridos, semProd: inds.reduce((s, r) => s + r.semProd, 0),
    pctMetas: avaliados ? cumpridos / avaliados : null,
    naoCumpridos: inds.filter((r) => r.pct !== null && r.pct < 1),
  };
}

/** Por mês: quantas metas (unidade × indicador) foram cumpridas, não cumpridas ou ficaram sem produção. */
export function metasPorMes(unidades, comps) {
  return comps.map((c) => {
    const n = { comp: c, cumprida: 0, nao: 0, semProd: 0 };
    unidades.forEach((u) => Object.values(u.dados).forEach((d) => { const r = d[c]; if (r && n[r.status] !== undefined) n[r.status] += 1; }));
    return n;
  });
}

/** Por indicador: em quantas unidades aparece, % das metas mensais cumpridas e % médio da meta por unidade. */
export function porIndicador(unidades, comps) {
  const m = {};
  unidades.forEach((u) => Object.keys(u.dados).forEach((k) => {
    const r = resumoIndicador(u, k, comps);
    if (!r.avaliados) return;
    const x = (m[k] ||= { indicador: k, unidades: [], avaliados: 0, cumpridos: 0 });
    x.unidades.push({ u, ...r });
    x.avaliados += r.avaliados; x.cumpridos += r.cumpridos;
  }));
  return Object.values(m).map((x) => ({
    ...x,
    pctMetas: x.cumpridos / x.avaliados,
    pctMedio: x.unidades.reduce((s, r) => s + r.pct, 0) / x.unidades.length,
    abaixo: x.unidades.filter((r) => r.pct < 1).length,
  })).sort((a, b) => b.unidades.length - a.unidades.length || a.indicador.localeCompare(b.indicador, 'pt-BR'));
}

export const inteiro = (v) => (v === null || v === undefined ? '—' : Math.round(v).toLocaleString('pt-BR'));
/** Cor do % da meta: verde ≥ 100%, amarelo 80–99%, vermelho < 80% */
export const tomPct = (p) => (p === null || p === undefined ? 'nd' : p >= 1 ? 'pos' : p >= 0.8 ? 'atencao' : 'neg');
export const corPct = (p) => ({ pos: 'var(--verde)', atencao: 'var(--amarelo)', neg: 'var(--vermelho)', nd: 'var(--muted)' })[tomPct(p)];
