import { CONFIG } from '../../config';
import Icone from '../comum/Icone';

/**
 * Moldura do painel: menu lateral, topo com identidade, troca de área e filtros, rodapé.
 * menu = [{ id, href, nome, icone, tambem? }]
 */
export default function Shell({ area, areas, usuario, menu, telaAtual, filtros, rodape, tema, alternarTema, onSair, children }) {
  const info = CONFIG.areas[area];
  const iniciais = (usuario?.nome || usuario?.email || '?').split(/[\s.@]+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <div className="app">
      <aside className="lateral">
        <a className="logo" href={info.inicio} aria-label="Início">
          <span className="logo-icone" aria-hidden="true"><i /><i /><i /></span>
        </a>
        <nav className="menu" aria-label="Seções">
          {menu.map((m) => {
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
          {usuario && (
            <span className="usuario" title={usuario.teste ? 'Versão de teste: abre sem login e mostra todas as áreas' : `${usuario.nome || ''}\n${usuario.email}`}>
              {usuario.teste ? <span className="avatar avatar-teste">Teste</span>
                : usuario.foto ? <img className="avatar" src={usuario.foto} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement('span'), { className: 'avatar', textContent: iniciais })); }} />
                  : <span className="avatar">{iniciais}</span>}
              {!usuario.teste && <span className="usuario-nome">{(usuario.nome || usuario.email).split(' ')[0]}</span>}
            </span>
          )}
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
              <strong>{info.titulo}</strong>
              <span>Unidades de saúde geridas por Organizações Sociais de Saúde (OSS) · {info.gerencia}</span>
            </div>
            {areas.length > 1 && (
              <nav className="troca-area" aria-label="Área do painel">
                {areas.map((a) => (
                  <a key={a} href={CONFIG.areas[a].inicio} className={a === area ? 'ativo' : ''} aria-current={a === area ? 'page' : undefined}>
                    {CONFIG.areas[a].nome}<small>{CONFIG.areas[a].gerencia}</small>
                  </a>
                ))}
              </nav>
            )}
          </div>
          {filtros && <div className="filtros">{filtros}</div>}
        </header>
        <main className="pagina">{children}</main>
        <footer className="rodape">
          {rodape}
          <span className="creditos">{CONFIG.instituicao.creditos}</span>
        </footer>
      </div>
    </div>
  );
}

export function Seletor({ rotulo, valor, onChange, opcoes }) {
  return (
    <label className="seletor">
      <span>{rotulo}</span>
      <select value={valor} onChange={(e) => onChange(e.target.value)}>
        {opcoes.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
      </select>
    </label>
  );
}
