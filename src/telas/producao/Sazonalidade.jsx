// Aba Sazonalidade (Produção): leitos abertos e reforço de RH na sazonalidade 2026
import { useProducao } from '../../contexto/ProducaoContexto';
import { link, navegar } from '../../hooks/useRota';
import { leitosPorTipo, TIPOS_LEITO } from '../../services/sazonalidade';
import { dataBr, nomeSaz, nomeTipoLeito, situacaoSaz } from '../../utils/sazonalidade';
import StatCard from '../../components/comum/StatCard';
import Card from '../../components/comum/Card';
import '../../styles/sazonalidade.css';

const FILTROS = [['', 'Todas'], ['upa', 'UPAs'], ['hosp', 'Hospitais'], ['rh', 'Com reforço de RH']];

export default function Sazonalidade({ query = {} }) {
  const { modelo } = useProducao();
  const todas = modelo.sazonalidade || [];

  if (!modelo.sazonalidadeLigada) {
    return (
      <>
        <div className="titulo-pagina"><div><h1>Leitos de sazonalidade</h1></div></div>
        <div className="vazio-pagina">A planilha de sazonalidade ainda não está ligada ao painel. Falta a aba <b>SAZONALIDADE</b> na base unificada.{modelo.sazonalidadeErro && <><br /><small>{modelo.sazonalidadeErro}</small></>}</div>
      </>
    );
  }

  const f = query.f || '';
  const lista = todas.filter((r) => !f || (f === 'upa' ? r.upa : f === 'hosp' ? !r.upa : r.rh));
  const total = lista.reduce((a, r) => a + r.leitos, 0);
  const porTipo = leitosPorTipo(lista);
  const maior = Math.max(1, ...Object.values(porTipo));
  const sit = lista.reduce((m, r) => { const s = situacaoSaz(r).id; m[s] = (m[s] || 0) + 1; return m; }, {});
  const ultima = lista.map((r) => r.desmLeitos).filter(Boolean).sort().pop();
  const semNome = todas.filter((r) => r.semNome);
  const semVinculo = todas.filter((r) => !r.semNome && !r.id);
  const contar = (k) => todas.filter((r) => (!k ? true : k === 'upa' ? r.upa : k === 'hosp' ? !r.upa : r.rh)).length;

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Leitos de sazonalidade 2026</h1>
          <p className="sub">Leitos abertos por conversão ou incremento e reforço de RH na urgência/emergência durante a sazonalidade, com as datas de desmobilização. Fonte: planilha “Desmobilização de leitos e RH sazonalidade 2026”. Os filtros do topo não se aplicam aqui.</p>
        </div>
      </div>

      <div className="saz-filtros" role="group" aria-label="Filtrar unidades">
        {FILTROS.map(([v, n]) => (
          <button key={n} type="button" className={`chip ${f === v ? 'ativo' : ''}`} aria-pressed={f === v} onClick={() => navegar(link('producao', 'sazonalidade', { f: v }))}>
            {n} <b>{contar(v)}</b>
          </button>
        ))}
      </div>

      <div className="grade-stats-unidade">
        <StatCard rotulo="Leitos de sazonalidade" valor={total.toLocaleString('pt-BR')}
          linhas={[['Unidades', String(lista.filter((r) => !r.semNome).length)], ...(lista.some((r) => r.semNome) ? [['Linha sem nome na planilha', String(lista.filter((r) => r.semNome).length)]] : [])]} />
        <StatCard rotulo="Unidades com reforço de RH" valor={`${lista.filter((r) => r.rh).length} de ${lista.length}`} linhas={[['Na urgência/emergência', '']]} />
        <StatCard rotulo="Em funcionamento hoje" valor={String(sit.ativo || 0)} cor={sit.ativo ? 'var(--verde)' : undefined}
          linhas={[['Desmobilizadas', String(sit.desmobilizado || 0)], ...(sit.semData ? [['Sem data de desmobilização', String(sit.semData)]] : [])]} />
        <StatCard rotulo="Última desmobilização" valor={ultima ? dataBr(ultima) : '—'} linhas={[['Data prevista ou realizada', '']]} />
      </div>

      <div className="grade-2">
        <Card titulo="Leitos por tipo" sub={f ? 'Só as unidades do filtro escolhido.' : 'Todas as unidades da planilha.'}>
          <ul className="saz-barras">
            {TIPOS_LEITO.filter((t) => porTipo[t.id]).map((t) => (
              <li key={t.id}><span>{t.nome}</span><span className="barra" aria-hidden="true"><span style={{ width: `${(porTipo[t.id] / maior) * 100}%` }} /></span><b>{porTipo[t.id]}</b></li>
            ))}
            {porTipo.outro > 0 && <li><span>Tipo não informado</span><span className="barra" aria-hidden="true"><span style={{ width: `${(porTipo.outro / maior) * 100}%` }} /></span><b>{porTipo.outro}</b></li>}
          </ul>
        </Card>
        <Card titulo="Situação dos leitos" sub="Conversão = leitos existentes usados para a sazonalidade · Incremento = leitos novos.">
          <ul className="saz-barras">
            {['Conversão', 'Incremento'].map((s) => {
              const n = lista.filter((r) => r.situacao === s).reduce((a, r) => a + r.leitos, 0);
              const u = lista.filter((r) => r.situacao === s).length;
              return n ? <li key={s}><span>{s} <small className="saz-muted">({u} {u === 1 ? 'unidade' : 'unidades'})</small></span><span className="barra" aria-hidden="true"><span style={{ width: `${(n / Math.max(1, total)) * 100}%` }} /></span><b>{n}</b></li> : null;
            })}
          </ul>
        </Card>
      </div>

      <Card titulo="Por unidade" sub="Clique numa unidade para abrir a página dela.">
        <div className="rolagem">
          <table className="tabela saz-tabela">
            <caption className="sr">Leitos de sazonalidade por unidade</caption>
            <thead><tr>
              <th scope="col">Unidade</th><th scope="col" className="num">Leitos</th><th scope="col">Tipo de leito</th><th scope="col">Situação</th>
              <th scope="col">Reforço de RH</th><th scope="col">Desmobilização dos leitos</th><th scope="col">Desmobilização do RH</th><th scope="col">Hoje</th>
            </tr></thead>
            <tbody>
              {lista.map((r, i) => {
                const s = situacaoSaz(r);
                return (
                  <tr key={i} className={r.id ? 'clicavel' : ''} onClick={r.id ? () => navegar(link('producao', 'unidade', r.id)) : undefined}>
                    <td>
                      {r.id ? <a className="nome-unidade" href={link('producao', 'unidade', r.id)} onClick={(e) => e.stopPropagation()}>{nomeSaz(r)}</a> : <span className="nome-unidade">{nomeSaz(r)}</span>}
                      {r.semNome ? <small>Linha sem nome na planilha, logo abaixo de {r.depoisDe}</small> : r.unidade !== r.nomePainel && <small>Na planilha: {r.unidade}</small>}
                    </td>
                    <td className="num"><b>{r.leitos}</b></td>
                    <td><ul className="saz-tipos">{r.partes.map((p, j) => <li key={j}><b>{p.n}</b> {p.tipo ? nomeTipoLeito(p.tipo) : 'não informado'}</li>)}</ul></td>
                    <td>{r.situacao || '—'}</td>
                    <td>{r.rh ? 'Sim' : 'Não'}</td>
                    <td>{dataBr(r.desmLeitos) || '—'}</td>
                    <td>{dataBr(r.desmRh) || '—'}</td>
                    <td><span className={`saz-selo ${s.id}`}>{s.nome}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="nota-card">A planilha não traz a data de início de funcionamento dos leitos (coluna vazia). “Hoje” compara a data de desmobilização com a data de hoje.</p>
      </Card>

      {(semNome.length > 0 || semVinculo.length > 0) && (
        <div className="saz-aviso">
          {semNome.length > 0 && <p style={{ margin: 0 }}>Na planilha, {semNome.length === 1 ? 'uma linha está' : `${semNome.length} linhas estão`} sem o nome da unidade ({semNome.map((r) => `logo abaixo de ${r.depoisDe}, com ${r.leitos} leitos`).join('; ')}). Ela entra nos totais, mas não aparece em nenhuma unidade. Preencha o nome na planilha de origem.</p>}
          {semVinculo.length > 0 && <p style={{ margin: semNome.length ? '8px 0 0' : 0 }}>Não achei no painel: {semVinculo.map((r) => r.unidade).join('; ')}. Para ligar, use a aba Vínculos da base unificada (tipo “Sazonalidade”, nome na planilha → nome da unidade).</p>}
        </div>
      )}
    </>
  );
}
