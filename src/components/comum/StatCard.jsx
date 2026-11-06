// Card de indicador com minigráfico de área e linhas de referência (estilo do modelo)
import Ajuda from './Ajuda';
import { AreaSpark } from './Graficos';

export default function StatCard({ rotulo, ajuda, valor, unidade, cor, valores, rotulos, linhas = [], href, ativo, onClick }) {
  const Tag = href ? 'a' : onClick ? 'button' : 'div';
  return (
    <Tag className={`stat ${href || onClick ? 'stat-clicavel' : ''} ${ativo ? 'ativo' : ''}`} href={href} onClick={onClick}>
      <span className="stat-rotulo">{rotulo}{ajuda && <Ajuda texto={ajuda} />}</span>
      {valores && <AreaSpark valores={valores} rotulos={rotulos} cor={cor} />}
      <span className="stat-valor" style={cor ? { color: cor } : undefined}>{valor}{unidade && <small>{unidade}</small>}</span>
      {linhas.length > 0 && (
        <span className="stat-linhas">
          {linhas.map(([n, v]) => <span key={n}><span>{n}</span>{v !== '' && <><span className="tracejado" /><b>{v}</b></>}</span>)}
        </span>
      )}
    </Tag>
  );
}
