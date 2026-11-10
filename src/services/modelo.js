// Converte os dados brutos no modelo usado pelas telas
//
// bruto = { atualizado, unidades:[{aba,nome,oss,grupo,porte}], itens:[{c,n}], valores:[[aba, 'AAAA-MM', chave, valor]] }
// chave = código do item (ex. '6.1.1.1') ou REC | REP | OREC | DESP | RES

const ordemCodigo = (a, b) => {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? -1) !== (y[i] ?? -1)) return (x[i] ?? -1) - (y[i] ?? -1);
  }
  return 0;
};

import { CONFIG } from '../config';
import { lerLancamentos, vincularUnidades } from './descontos';
import { lerEntregas, vincularEntregas } from './entregas';

export function montarModelo(bruto) {
  const unidades = bruto.unidades.map((u) => ({ ...u, nome: CONFIG.nomesPadrao[u.aba] || u.nome, v: {} }));
  const porAba = Object.fromEntries(unidades.map((u) => [u.aba, u]));
  const meses = new Set();

  bruto.valores.forEach(([aba, comp, chave, valor]) => {
    const u = porAba[aba];
    if (!u || !comp) return;
    (u.v[comp] ||= {})[chave] = ((u.v[comp] || {})[chave] || 0) + valor;
    meses.add(comp);
  });

  // Árvore de itens a partir dos códigos
  const itens = {};
  [...bruto.itens].sort((a, b) => ordemCodigo(a.c, b.c)).forEach(({ c, n }) => {
    const partes = c.split('.');
    itens[c] = { c, n, nivel: partes.length, pai: partes.length > 1 ? partes.slice(0, -1).join('.') : null, filhos: [] };
  });
  Object.values(itens).forEach((it) => {
    // se o pai direto não existir, sobe até achar um ancestral
    let p = it.pai;
    while (p && !itens[p]) p = p.includes('.') ? p.slice(0, p.lastIndexOf('.')) : null;
    it.pai = p;
    if (p) itens[p].filhos.push(it.c);
  });
  const raizes = Object.values(itens).filter((it) => !it.pai).map((it) => it.c);

  const ordenadas = unidades.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return {
    descontos: vincularUnidades(lerLancamentos(bruto.descontosLinhas || []), ordenadas, CONFIG.vinculoDescontos),
    descontosErro: bruto.descontosErro || '',
    entregas: vincularEntregas(lerEntregas(bruto.entregasLinhas || []), ordenadas, CONFIG.vinculoEntregas),
    entregasErro: bruto.entregasErro || '',
    atualizado: bruto.atualizado,
    unidades: ordenadas,
    porAba,
    itens,
    raizes,
    ordemCodigo,
    meses: [...meses].sort(),
  };
}

export const rotuloItem = (it) => (it ? `${it.c}. ${it.n}` : '');
