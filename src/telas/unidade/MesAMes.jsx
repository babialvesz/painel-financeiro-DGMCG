import { usePainel } from '../../contexto/PainelContexto';
import { valor } from '../../utils/analise';
import { brl, rotuloMes } from '../../utils/formatacao';
import { rotuloItem } from '../../services/modelo';
import Card from '../../components/comum/Card';

// Demonstrativo: recebido, gasto por grupo e resultado, mês a mês (valores exatos)
export default function MesAMes({ u, meses, onAbrirItem }) {
  const { modelo } = usePainel();
  const grupos = modelo.raizes.filter((c) => meses.some((m) => valor(u, m, c)));
  const linhas = [
    { id: 'REC', nome: 'Receitas (total)', tipo: 'total' },
    { id: 'REP', nome: 'Repasses', tipo: 'sub' },
    { id: 'OREC', nome: 'Outras receitas', tipo: 'sub' },
    { id: 'DESP', nome: 'Despesas (total)', tipo: 'total' },
    ...grupos.map((c) => ({ id: c, nome: rotuloItem(modelo.itens[c]), tipo: 'item' })),
    { id: 'RES', nome: 'Resultado (receitas − despesas)', tipo: 'resultado' },
  ];
  const total = (id) => meses.reduce((s, m) => s + valor(u, m, id), 0);

  return (
    <Card
      titulo="Tabela mês a mês"
      sub="Valores exatos de cada mês. Clique num grupo de despesa para ver o detalhe."
    >
      <div className="rolagem">
        <table className="tabela demonstrativo">
          <thead><tr><th>Linha</th>{meses.map((m) => <th key={m} className="num">{rotuloMes(m)}</th>)}<th className="num">Total</th></tr></thead>
          <tbody>
            {linhas.map((l) => {
              const t = total(l.id);
              const cor = (v) => (l.tipo === 'resultado' ? (v < 0 ? 'neg' : 'pos') : '');
              return (
                <tr key={l.id} className={`linha-${l.tipo} ${l.tipo === 'item' ? 'clicavel' : ''}`} onClick={l.tipo === 'item' ? () => onAbrirItem(l.id) : undefined}>
                  <td>{l.tipo === 'item' ? <span className="link-texto">{l.nome}</span> : l.nome}</td>
                  {meses.map((m) => { const v = valor(u, m, l.id); return <td key={m} className={`num ${cor(v)}`}>{v ? brl(v) : '–'}</td>; })}
                  <td className={`num forte ${cor(t)}`}>{brl(t)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
