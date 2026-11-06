// "?" com explicação em linguagem simples (aparece ao passar o mouse ou tocar)
export default function Ajuda({ texto }) {
  return (
    <span className="ajuda" tabIndex={0} role="note" aria-label={texto}>
      ?
      <span className="ajuda-balao" aria-hidden="true">{texto}</span>
    </span>
  );
}
