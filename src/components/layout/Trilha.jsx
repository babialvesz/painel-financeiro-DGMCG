// Caminho de navegação: Unidades › Hospital X › 6.1.1.1 Médicos
export default function Trilha({ passos }) {
  return (
    <nav className="trilha" aria-label="Você está em">
      {passos.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className="trilha-sep" aria-hidden="true">›</span>}
          {p.href && i < passos.length - 1 ? <a href={p.href}>{p.nome}</a> : <span aria-current="page">{p.nome}</span>}
        </span>
      ))}
    </nav>
  );
}
