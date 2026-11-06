import Ajuda from './Ajuda';

export default function Card({ titulo, ajuda, sub, acoes, children, className = '', destaque }) {
  return (
    <section className={`card ${destaque ? 'card-destaque' : ''} ${className}`}>
      {(titulo || acoes) && (
        <div className="card-topo">
          <div>
            {titulo && <h2>{titulo}{ajuda && <Ajuda texto={ajuda} />}</h2>}
            {sub && <p className="sub">{sub}</p>}
          </div>
          {acoes && <div className="card-acoes">{acoes}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
