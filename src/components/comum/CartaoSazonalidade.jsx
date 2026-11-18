// Card "Leitos de sazonalidade" na página de cada unidade (financeiro e produção)
import Card from './Card';
import Icone from './Icone';
import { dataBr, descreverLeitos, nomeTipoLeito, situacaoSaz } from '../../utils/sazonalidade';
import '../../styles/sazonalidade.css';

export default function CartaoSazonalidade({ registros, linkTodas }) {
  if (!registros?.length) return null;
  const total = registros.reduce((a, r) => a + r.leitos, 0);
  return (
    <Card className="card-saz" titulo="Leitos de sazonalidade 2026"
      sub="Leitos abertos e reforço de RH na urgência/emergência durante a sazonalidade. Fonte: planilha “Desmobilização de leitos e RH sazonalidade 2026”."
      acoes={linkTodas && <a className="link-acao" href={linkTodas}>Ver todas as unidades <Icone nome="seta" tamanho={14} /></a>}>
      {registros.map((r, i) => {
        const s = situacaoSaz(r);
        return (
          <div key={i} className="saz-unidade">
            <div className="saz-total">
              <span className="saz-icone" aria-hidden="true"><Icone nome="leito" tamanho={22} /></span>
              <div>
                <b>{r.leitos} {r.leitos === 1 ? 'leito' : 'leitos'}</b>
                <span>{r.situacao === 'Conversão' ? 'por conversão de leitos' : r.situacao === 'Incremento' ? 'de incremento' : ''}</span>
              </div>
              <span className={`saz-selo ${s.id}`}>{s.nome}</span>
            </div>
            <ul className="saz-tipos" aria-label="Leitos por tipo">
              {r.partes.map((p, j) => <li key={j}><b>{p.n}</b> {p.tipo ? nomeTipoLeito(p.tipo) : 'tipo não informado'}</li>)}
            </ul>
            <dl className="ficha saz-ficha">
              <div><dt>Reforço de RH na urgência</dt><dd>{r.rh ? 'Sim' : 'Não'}</dd></div>
              <div><dt>Início dos leitos</dt><dd>{dataBr(r.inicio) || <span className="saz-muted">não informado</span>}</dd></div>
              <div><dt>Desmobilização dos leitos</dt><dd>{dataBr(r.desmLeitos) || <span className="saz-muted">não informada</span>}</dd></div>
              <div><dt>Desmobilização do reforço de RH</dt><dd>{dataBr(r.desmRh) || <span className="saz-muted">{r.rh ? 'não informada' : 'sem reforço'}</span>}</dd></div>
            </dl>
            {registros.length > 1 && i === registros.length - 1 && <p className="nota-card">Total da unidade: <b>{total} leitos</b> ({registros.map(descreverLeitos).join(' · ')})</p>}
          </div>
        );
      })}
    </Card>
  );
}
