import { baixarCSV } from '../../utils/exportar';

export default function BotaoExportar({ nome, cabecalho, linhas }) {
  return (
    <button className="botao-secundario" onClick={() => baixarCSV(nome, cabecalho, linhas())} title="Baixar tabela para Excel">
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1v9m0 0L4.5 6.5M8 10l3.5-3.5M2 12v2h12v-2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      Exportar
    </button>
  );
}
