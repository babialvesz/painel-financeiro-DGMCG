// Etiqueta de situação
export default function Pill({ res, curto = false }) {
  if (res === null || res === undefined) return <span className="pill pill-nd">Sem dados</span>;
  return res < 0
    ? <span className="pill pill-neg" title="Despesas maiores que as receitas">Déficit</span>
    : <span className="pill pill-pos" title="Despesas menores que as receitas">Superávit</span>;
}
