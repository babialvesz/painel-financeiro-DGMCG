export default function Abas({ abas, ativa, onTrocar }) {
  return (
    <div className="abas" role="tablist">
      {abas.map((a) => (
        <button key={a.id} role="tab" aria-selected={ativa === a.id} className={ativa === a.id ? 'ativa' : ''} onClick={() => onTrocar(a.id)}>
          {a.nome}
        </button>
      ))}
    </div>
  );
}
