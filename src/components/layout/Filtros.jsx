// Filtros do topo de cada área
import { CONFIG } from '../../config';
import { usePainel } from '../../contexto/PainelContexto';
import { useProducao } from '../../contexto/ProducaoContexto';
import { rotuloMes } from '../../utils/formatacao';
import { Seletor } from './Shell';

export function FiltrosFinanceiro() {
  const { modelo, anos, filtro, alterarFiltro, mesesAno } = usePainel();
  const grupos = [...new Set(modelo.unidades.map((u) => u.grupo).filter(Boolean))].sort();
  const portes = [...new Set(modelo.unidades.filter((u) => !filtro.grupo || u.grupo === filtro.grupo).map((u) => u.porte).filter(Boolean))].sort();
  return (
    <>
      <Seletor rotulo="Ano" valor={filtro.ano} onChange={(v) => alterarFiltro({ ano: v })} opcoes={anos.map((a) => [a, a])} />
      <Seletor rotulo="Período" valor={filtro.periodo} onChange={(v) => alterarFiltro({ periodo: v })}
        opcoes={[['acum', 'Ano todo (acumulado)'], ...mesesAno.map((m) => [m, `Só ${rotuloMes(m)}`])]} />
      <Seletor rotulo="Tipo" valor={filtro.grupo} onChange={(v) => alterarFiltro({ grupo: v })}
        opcoes={[['', 'Todos'], ...grupos.map((g) => [g, g === CONFIG.semClassificacao ? 'Outros' : g])]} />
      <Seletor rotulo="Porte" valor={filtro.porte} onChange={(v) => alterarFiltro({ porte: v })}
        opcoes={[['', 'Todos'], ...portes.map((p) => [p, p])]} />
    </>
  );
}

export function RodapeFinanceiro() {
  const { modelo } = usePainel();
  return <>Valores antes das provisões · Fonte: Acompanhamento financeiro (em análise pela Prestação de Contas, sujeito a alterações){modelo.atualizado && ` · Atualizado em ${modelo.atualizado}`}</>;
}

export function FiltrosProducao() {
  const { modelo, filtro, alterarFiltro, mesesAno } = useProducao();
  return (
    <>
      <Seletor rotulo="Ano" valor={filtro.ano} onChange={(v) => alterarFiltro({ ano: v })} opcoes={modelo.anos.map((a) => [a, a])} />
      <Seletor rotulo="Período" valor={filtro.periodo} onChange={(v) => alterarFiltro({ periodo: v })}
        opcoes={[['acum', 'Ano todo (acumulado)'], ...mesesAno.map((m) => [m, `Só ${rotuloMes(m)}`])]} />
      <Seletor rotulo="Tipo" valor={filtro.tipo} onChange={(v) => alterarFiltro({ tipo: v })} opcoes={[['', 'Todos'], ...modelo.tipos.map((t) => [t, t])]} />
    </>
  );
}

export const RodapeProducao = () => <>Fonte: planilha de produção da GMCG (aba {CONFIG.abaProducao}) · meta cumprida = produção igual ou maior que a meta do mês</>;
