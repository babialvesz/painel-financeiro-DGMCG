/**
 * ============================================================
 *  PAINEL FINANCEIRO — GERA AS ABAS LIDAS PELO APP WEB
 * ============================================================
 *  Lê a BASE_CONSOLIDADA e grava 3 abas leves na mesma planilha:
 *    PAINEL_UNIDADES → Aba | Unidade | OSS | Grupo | Porte | Atualizado_em
 *    PAINEL_ITENS    → Codigo | Item
 *    PAINEL_VALORES  → Aba | Competencia | Chave | Valor
 *
 *  Chave = código do item (ex.: 6.1.1.1) ou um dos totais:
 *    REC  Total de Receitas Operacionais
 *    REP  Total de Repasses
 *    OREC Total de Outras Receitas
 *    DESP Total de Despesas Operacionais Antes das Provisões
 *    RES  Resultado (Déficit/Superávit) Antes das Provisões
 *
 *  Regras: só bloco DRE, valores ≠ 0, ignora competência depois do mês atual.
 *  (Mesmas regras do scripts/gerar_dados_local.py)
 *
 *  Substitui PainelWebApp.gs / PainelAbas.gs (apague-os do projeto).
 *
 *  Ordem de teste:
 *   1) painel_gerarDados() com DRY_RUN = true  → confere totais no log
 *   2) painel_gerarDados() com DRY_RUN = false → grava as abas
 *   3) No fim do consolidarBase(), chame painel_gerarDados()
 * ============================================================
 */

const PAINEL_CFG = {
  ABA_BASE: 'BASE_CONSOLIDADA',
  ABA_UNIDADES: 'PAINEL_UNIDADES',
  ABA_ITENS: 'PAINEL_ITENS',
  ABA_VALORES: 'PAINEL_VALORES',
  BLOCO_DRE: 'DRE',
  TOTAIS: {
    'TOTAL DE RECEITAS OPERACIONAIS': 'REC',
    'TOTAL DE REPASSES': 'REP',
    'TOTAL DE OUTRAS RECEITAS': 'OREC',
    'TOTAL DE DESPESAS OPERACIONAIS ANTES DAS PROVISOES': 'DESP',
    'RESULTADO (DEFICIT/SUPERAVIT) ANTES DAS PROVISOES': 'RES'
  },
  FUSO: 'America/Recife',
  DRY_RUN: true     // true = só mostra no log, NÃO grava as abas
};


function painel_gerarDados() {
  const t0 = Date.now();
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(PAINEL_CFG.ABA_BASE);
  if (!sh) throw new Error('Aba não encontrada: ' + PAINEL_CFG.ABA_BASE);
  const dados = sh.getDataRange().getValues();
  const idx = painel_indices_(dados.shift());
  const blocoDre = painel_norm_(PAINEL_CFG.BLOCO_DRE);
  const mesAtual = Utilities.formatDate(new Date(), PAINEL_CFG.FUSO, 'yyyy-MM');
  const agora = Utilities.formatDate(new Date(), PAINEL_CFG.FUSO, 'dd/MM/yyyy HH:mm');
  const reCodigo = /^(\d+(?:\.\d+)*)\.?\s+(.*)$/;

  const unidades = {}, itens = {}, valores = {}, futuros = {};
  let semCompetencia = 0;

  dados.forEach(r => {
    const aba = String(r[idx.Aba]).trim();
    if (!aba) return;
    const comp = painel_competencia_(r[idx.Competencia]);
    if (!comp) { semCompetencia++; return; }
    if (!unidades[aba]) {
      unidades[aba] = [aba, String(r[idx.Unidade]).trim() || aba, String(r[idx.OSS]).trim(),
        String(r[idx.Grupo]).trim(), String(r[idx.Porte]).trim(), agora];
    }
    if (painel_norm_(r[idx.Bloco]) !== blocoDre) return;
    const valor = Number(r[idx.Valor]) || 0;
    if (valor === 0) return;
    if (comp > mesAtual) { futuros[aba + ' | ' + comp] = (futuros[aba + ' | ' + comp] || 0) + 1; return; }

    const rub = String(r[idx.Rubrica]).replace(/\s+/g, ' ').trim();
    let chave = PAINEL_CFG.TOTAIS[painel_norm_(rub).replace(/\s+/g, ' ')];
    if (!chave) {
      const m = rub.match(reCodigo);
      if (!m) return;
      chave = m[1];
      if (!itens[chave]) itens[chave] = m[2].trim();
    }
    const k = aba + '\u0001' + comp + '\u0001' + chave;
    valores[k] = (valores[k] || 0) + valor;
  });

  const ordemCod = c => c.split('.').map(n => ('000' + n).slice(-3)).join('.');
  const linhasUni = Object.keys(unidades).sort().map(a => unidades[a]);
  const linhasItens = Object.keys(itens).sort((a, b) => ordemCod(a).localeCompare(ordemCod(b))).map(c => [c, itens[c]]);
  const linhasVal = Object.keys(valores).sort().map(k => {
    const p = k.split('\u0001'); return [p[0], p[1], p[2], painel_arred_(valores[k])];
  });

  // ---- Log de conferência ----
  Logger.log('Unidades: ' + linhasUni.length + ' | Itens: ' + linhasItens.length + ' | Valores: ' + linhasVal.length);
  Logger.log('Linhas sem competência válida: ' + semCompetencia);
  const kf = Object.keys(futuros);
  Logger.log(kf.length ? '⚠️ Competência futura com valor (ignorada):\n' + kf.map(k => '   ' + k).join('\n') : 'Nenhuma competência futura com valor.');
  const tot = {};
  linhasVal.forEach(l => {
    if (l[2] !== 'REC' && l[2] !== 'DESP' && l[2] !== 'RES') return;
    const t = tot[l[0]] = tot[l[0]] || { REC: 0, DESP: 0, RES: 0 };
    t[l[2]] += l[3];
  });
  Logger.log('--- Acumulado por unidade: receita | despesa | resultado ---');
  Object.keys(tot).sort().forEach(a => Logger.log(a + ' | ' + painel_fmt_(tot[a].REC) + ' | ' + painel_fmt_(tot[a].DESP) + ' | ' + painel_fmt_(tot[a].RES)));

  if (PAINEL_CFG.DRY_RUN) { Logger.log('DRY_RUN = true → nada foi gravado.'); return; }

  painel_gravarAba_(ss, PAINEL_CFG.ABA_UNIDADES, ['Aba', 'Unidade', 'OSS', 'Grupo', 'Porte', 'Atualizado_em'], linhasUni, [6]);
  painel_gravarAba_(ss, PAINEL_CFG.ABA_ITENS, ['Codigo', 'Item'], linhasItens, [1]);
  painel_gravarAba_(ss, PAINEL_CFG.ABA_VALORES, ['Aba', 'Competencia', 'Chave', 'Valor'], linhasVal, [2, 3]);
  Logger.log('Abas gravadas em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s.');
}


/* ------------------------------------------------------------
 *  Auxiliares
 * ------------------------------------------------------------ */
// colunasTexto = posições (1 = primeira coluna) que devem ficar como texto
// (impede o Sheets de transformar "2026-01" em data)
function painel_gravarAba_(ss, nome, cabecalho, linhas, colunasTexto) {
  const LOTE = 3000;  // grava em partes para não estourar o tempo do Planilhas
  const n = linhas.length + 1;
  const sh = painel_tentar_(() => ss.getSheetByName(nome) || ss.insertSheet(nome), 'abrir ' + nome);
  painel_tentar_(() => {
    const usadas = sh.getLastRow();
    if (usadas > 0) sh.getRange(1, 1, usadas, Math.max(sh.getLastColumn(), 1)).clearContent();
    if (sh.getMaxRows() < n) sh.insertRowsAfter(sh.getMaxRows(), n - sh.getMaxRows());
    colunasTexto.forEach(c => sh.getRange(1, c, n, 1).setNumberFormat('@'));
    sh.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);
    sh.setFrozenRows(1);
    SpreadsheetApp.flush();
  }, 'preparar ' + nome);
  for (let i = 0; i < linhas.length; i += LOTE) {
    const parte = linhas.slice(i, i + LOTE);
    painel_tentar_(() => {
      sh.getRange(i + 2, 1, parte.length, cabecalho.length).setValues(parte);
      SpreadsheetApp.flush();
    }, nome + ' linhas ' + (i + 1) + '-' + (i + parte.length));
  }
  Logger.log(nome + ': ' + linhas.length + ' linhas gravadas.');
}

// Repete a operação até 4 vezes se o Planilhas demorar (erro de tempo limite).
function painel_tentar_(fn, oQue) {
  for (let t = 1; ; t++) {
    try { return fn(); } catch (e) {
      if (t >= 4 || !/tempo limite|timed out|timeout|Service/i.test(String(e))) throw e;
      Logger.log('⏳ Planilha lenta em "' + oQue + '" (tentativa ' + t + '). Aguardando e tentando de novo…');
      Utilities.sleep(5000 * t);
    }
  }
}

function painel_indices_(cab) {
  const req = ['Aba', 'Unidade', 'OSS', 'Grupo', 'Porte', 'Bloco', 'Ordem', 'Rubrica', 'Competencia', 'Valor'];
  const n = cab.map(painel_norm_);
  const idx = {};
  req.forEach(c => {
    const i = n.indexOf(painel_norm_(c));
    if (i < 0) throw new Error('Coluna não encontrada na base: ' + c);
    idx[c] = i;
  });
  return idx;
}

function painel_norm_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

function painel_competencia_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, PAINEL_CFG.FUSO, 'yyyy-MM');
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2);
  m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return m[2] + '-' + ('0' + m[1]).slice(-2);
  return null;
}

function painel_arred_(v) {
  return Math.round(v * 100) / 100;
}

function painel_fmt_(v) {
  const neg = v < 0;
  const p = Math.abs(v).toFixed(2).split('.');
  return (neg ? '-' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + p[1];
}
