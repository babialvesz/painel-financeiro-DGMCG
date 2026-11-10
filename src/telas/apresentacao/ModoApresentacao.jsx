// Moldura do modo apresentação: sem menu, sem troca de área e sem filtros de rede.
// #/apresentacao            → pastas
// #/apresentacao?pasta=UPA  → unidades da pasta
// #/apresentacao/<id>       → apresentação de UMA unidade
import { useMemo } from 'react';
import { CONFIG } from '../../config';
import { link } from '../../hooks/useRota';
import { listaApresentacao } from '../../utils/apresentacao';
import Icone from '../../components/comum/Icone';
import Pastas from './Pastas';
import Apresentacao from './Apresentacao';

export default function ModoApresentacao({ rota, tema, sessao, fin, prod }) {
  const finM = fin?.estado === 'pronto' ? fin.modelo : null;
  const prodM = prod?.estado === 'pronto' ? prod.modelo : null;
  const carregando = [fin, prod].some((d) => d && d.estado === 'carregando');
  const erros = [fin, prod].filter((d) => d?.estado === 'erro').map((d) => d.erro);
  const lista = useMemo(() => listaApresentacao(finM, prodM, finM?.entregas || []), [finM, prodM]);
  const id = rota.partes[1];
  const item = id && lista.find((x) => x.id === id);
  const voltar = sessao.areas.includes('financeiro') ? CONFIG.areas.financeiro.inicio : CONFIG.areas[sessao.areas[0]].inicio;

  const telaCheia = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="apres">
      <header className="apres-topo">
        <div className="identidade-logos">
          {CONFIG.instituicao.logos.map((l) => <img key={l.src} src={l.src} alt={l.alt} onError={(e) => { e.currentTarget.style.display = 'none'; }} />)}
        </div>
        <span className="apres-selo"><Icone nome="apresentacao" tamanho={15} /> Modo apresentação</span>
        <div className="apres-acoes">
          {id && <a className="botao-secundario" href={link('apresentacao', { pasta: item?.tipo })}><Icone nome="voltar" tamanho={15} /> Outra unidade</a>}
          <button className="botao-secundario" onClick={telaCheia} title="Tela cheia (Esc para sair)"><Icone nome="telaCheia" tamanho={15} /> Tela cheia</button>
          <a className="botao-secundario" href={voltar}><Icone nome="sair" tamanho={15} /> Sair</a>
        </div>
      </header>
      <main className="apres-pagina" key={tema}>
        {erros.map((e) => <div key={e} className="aviso-suave aviso-erro"><Icone nome="alerta" tamanho={16} /> {e}</div>)}
        {!id && <Pastas lista={lista} pasta={rota.query.pasta} carregando={carregando} />}
        {id && !item && (carregando
          ? <div className="vazio-pagina"><span className="girando" aria-hidden="true" /> Carregando…</div>
          : <div className="vazio-pagina">Unidade não encontrada. <a href={link('apresentacao')}>Voltar às pastas</a></div>)}
        {item && <Apresentacao key={item.id} item={item} fin={finM} prod={prodM} />}
      </main>
      <footer className="rodape"><span className="creditos">{CONFIG.instituicao.creditos}</span></footer>
    </div>
  );
}
