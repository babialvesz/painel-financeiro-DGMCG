// Exporta tabela para CSV que abre direto no Excel (separador ; e vírgula decimal)
export function baixarCSV(nomeArquivo, cabecalho, linhas) {
  const cel = (v) => {
    if (typeof v === 'number') return v.toFixed(2).replace('.', ',');
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cabecalho, ...linhas].map((l) => l.map(cel).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${nomeArquivo}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
