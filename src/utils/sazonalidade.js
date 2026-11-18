// Formatação e resumo dos leitos de sazonalidade para as telas
import { nomeTipoLeito, situacaoSaz } from '../services/sazonalidade';

export { nomeTipoLeito, situacaoSaz };

/** "2026-07-06" → "06/07/2026" */
export const dataBr = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '');

/** "10 de enfermaria pediátrica + 10 de UTI pediátrica" */
export const descreverLeitos = (r) => r.partes.map((p) => `${p.n} ${p.tipo ? `de ${nomeTipoLeito(p.tipo).toLowerCase()}` : ''}`.trim()).join(' + ');

/** Nome para mostrar: o da unidade no painel, senão o da planilha. */
export const nomeSaz = (r) => r.nomePainel || r.unidade || 'Unidade não informada na planilha';
