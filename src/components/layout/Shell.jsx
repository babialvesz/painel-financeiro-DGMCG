import { usePainel } from '../../contexto/PainelContexto';
import { CONFIG } from '../../config';
import { rotuloMes } from '../../utils/formatacao';
import Icone from '../comum/Icone';

const MENU = [
  { id: '', href: '#/', nome: 'Visão geral', icone: 'inicio' },
  { id: 'unidades', href: '#/unidades', nome: 'Unidades', icone: 'unidades', tambem: ['unidade'] },
  { id: 'itens', href: '#/itens', nome: 'Despesas por item', icone: 'itens', tambem: ['item'] },
  { id: 'descontos', href: '#/descontos', nome: 'Descontos', icone: 'desconto' },
];

export default function Shell({ telaAtual, tema, alternarTema, onSair, children }) {
  const { modelo, anos, filtro, alterarFiltro, mesesAno } = usePainel();
  const grupos = [...new Set(modelo.unidades.map((u) => u.grupo).filter(Boolean))].sort();
  const portes = [...new Set(modelo.unidades.filter((u) => !filtro.grupo || u.grupo === filtro.grupo).map((u) => u.porte).filter(Boolean))].sort();

  return (
    <div className="app">
      <aside className="lateral">
        <a className="logo" href="#/" aria-label="Início">
          <span className="logo-icone" aria-hidden="true"><i /><i /><i /></span>
        </a>
        <nav className="menu" aria-label="Seções">
          {MENU.map((m) => {
            const ativo = telaAtual === m.id || m.tambem?.includes(telaAtual);
            return (
              <a key={m.id} href={m.href} className={ativo ? 'ativo' : ''} aria-current={ativo ? 'page' : undefined} title={m.nome}>
                <Icone nome={m.icone} tamanho={20} />
                <span>{m.nome}</span>
              </a>
            );
          })}
        </nav>
        <div className="lateral-rodape">
          <button onClick={alternarTema} title={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'}>
            <Icone nome={tema === 'escuro' ? 'sol' : 'lua'} tamanho={19} />
            <span>{tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}</span>
          </button>
          {onSair && (
            <button onClick={onSair} title="Sair">
              <Icone nome="sair" tamanho={19} />
              <span>Sair</span>
            </button>
          )}
        </div>
      </aside>

      <div className="principal">
        <header className="barra-topo">
          <div className="identidade">
            <div className="identidade-logos">
              {CONFIG.instituicao.logos.map((l) => (
                <img key={l.src} src={l.src} alt={l.alt} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ))}
            </div>
            <div className="identidade-texto">
              <strong>{CONFIG.instituicao.titulo}</strong>
              <span>Unidades de saúde geridas por Organizações Sociais de Saúde (OSS)</span>
            </div>
          </div>
          <div className="filtros">
            <Seletor rotulo="Ano" valor={filtro.ano} onChange={(v) => alterarFiltro({ ano: v })} opcoes={anos.map((a) => [a, a])} />
            <Seletor rotulo="Período" valor={filtro.periodo} onChange={(v) => alterarFiltro({ periodo: v })}
              opcoes={[['acum', 'Ano todo (acumulado)'], ...mesesAno.map((m) => [m, `Só ${rotuloMes(m)}`])]} />
            <Seletor rotulo="Tipo" valor={filtro.grupo} onChange={(v) => alterarFiltro({ grupo: v })}
              opcoes={[['', 'Todos'], ...grupos.map((g) => [g, g === CONFIG.semClassificacao ? 'Outros' : g])]} />
            <Seletor rotulo="Porte" valor={filtro.porte} onChange={(v) => alterarFiltro({ porte: v })}
              opcoes={[['', 'Todos'], ...portes.map((p) => [p, p])]} />
          </div>
        </header>
        <main className="pagina">{children}</main>
        <footer className="rodape">
          Valores antes das provisões · Fonte: Acompanhamento financeiro (em análise pela Prestação de Contas, sujeito a alterações)
          {modelo.atualizado && ` · Atualizado em ${modelo.atualizado}`}
          <span className="creditos">{CONFIG.instituicao.creditos}</span>
        </footer>
      </div>
    </div>
  );
}

function Seletor({ rotulo, valor, onChange, opcoes }) {
  return (
    <label className="seletor">
      <span>{rotulo}</span>
      <select value={valor} onChange={(e) => onChange(e.target.value)}>
        {opcoes.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
      </select>
    </label>
  );
}
