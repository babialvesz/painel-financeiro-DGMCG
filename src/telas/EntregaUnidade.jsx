import { useMemo } from 'react';
import { usePainel } from '../contexto/PainelContexto';
import { link } from '../hooks/useRota';
import { SITUACOES } from '../services/entregas';
import { competencias, dataBR, entregasFiltradas, indicadores, porUnidade, textoDias } from '../utils/entregas';
import { pct, plural, rotuloMes } from '../utils/formatacao';
import Card from '../components/comum/Card';
import StatCard from '../components/comum/StatCard';
import GraficoMensal from '../components/comum/GraficoMensal';
import Trilha from '../components/layout/Trilha';
import Icone from '../components/comum/Icone';
import { Celula, Legenda } from './Entregas';

const dias = (n) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${n === 1 ? 'dia' : 'dias'}`;
const fmtDias = (v) => (v === null ? 'sem dado' : v > 0 ? `${dias(v)} antes do prazo` : v < 0 ? `${dias(-v)} depois do prazo` : 'no último dia do prazo');

export default function EntregaUnidade({ id }) {
  const { modelo, filtro } = usePainel();
  const e = modelo.entregas.find((x) => x.id === id && x.ano === filtro.ano) || modelo.entregas.find((x) => x.id === id);
  const lista = useMemo(() => entregasFiltradas(modelo, { ano: e?.ano || filtro.ano }), [modelo, e, filtro.ano]);

  if (!e) return <div className="vazio-pagina">Unidade não encontrada no cronograma. <a href={link('entregas')}>Voltar para entregas</a></div>;

  const comps = Object.keys(e.meses).sort();
  const sits = comps.map((c) => e.meses[c]);
  const ind = indicadores(sits);
  // comparação com as unidades do mesmo tipo (pontualidade de cada uma; nada é somado)
  const mesmoTipo = porUnidade(lista.filter((x) => x.tipo === e.tipo), competencias(lista)).filter((x) => x.avaliadas);
  const mediaTipo = mesmoTipo.length ? mesmoTipo.reduce((a, x) => a + x.pontualidade, 0) / mesmoTipo.length : null;
  const posicao = [...mesmoTipo].sort((a, b) => b.pontualidade - a.pontualidade || a.mediaAtraso - b.mediaAtraso).findIndex((x) => x.e.id === e.id) + 1;
  const u = e.aba && modelo.porAba[e.aba];

  return (
    <>
      <Trilha passos={[{ nome: 'Entregas', href: link('entregas') }, { nome: e.nome }]} />
      <div className="titulo-pagina">
        <div>
          <h1>{e.nome}{e.sigla && ` – ${e.sigla}`}</h1>
          <p className="sub">{[e.tipo, e.oss, `Ano ${e.ano}`].filter(Boolean).join(' · ')}{u && <> · <a href={link('unidade', u.aba)}>ver as finanças desta unidade</a></>}</p>
        </div>
        {ind.pendentes > 0 ? <span className="pill pill-ent-pendente">Entrega pendente</span>
          : ind.avaliadas && ind.noPrazo === ind.avaliadas ? <span className="pill pill-ent-prazo">Sempre no prazo</span> : null}
      </div>

      <div className="grade-stats-unidade">
        <StatCard rotulo="Entregues no prazo" valor={ind.pontualidade === null ? '—' : pct(ind.pontualidade, 0)} cor="var(--verde)"
          linhas={[['No prazo', `${ind.noPrazo} de ${ind.avaliadas}`], ['No dia útil seguinte', ind.limite]]} />
        <StatCard rotulo="Atrasos" valor={ind.atrasos + ind.pendentes} cor={ind.atrasos + ind.pendentes ? 'var(--vermelho)' : undefined}
          linhas={[['Entregues com atraso', ind.atrasos], ['Ainda não entregues', ind.pendentes]]} />
        <StatCard rotulo="Maior atraso" valor={ind.maior ? dias(ind.maior.dias) : '—'} cor={ind.maior ? 'var(--vermelho)' : undefined}
          linhas={ind.maior ? [['Competência', rotuloMes(ind.maior.comp)], ['Atraso médio', ind.atrasos ? dias(ind.mediaAtraso) : '—']] : [['Nenhum atraso', '']]} />
        <StatCard rotulo="Ranking de pontualidade" ajuda="Posição entre as unidades do mesmo tipo, da mais pontual (1º) para a menos pontual."
          valor={posicao ? `${posicao}º de ${mesmoTipo.length}` : '—'}
          linhas={[['Comparada com', `tipo ${e.tipo.toLowerCase()}`], ['Média do tipo no prazo', mediaTipo === null ? '—' : pct(mediaTipo, 0)]]} />
      </div>

      {ind.conferir > 0 && (
        <div className="aviso-suave"><Icone nome="alerta" tamanho={16} /> {plural(ind.conferir, 'data parece', 'datas parecem')} estar com erro (entrega registrada antes do fim do mês da competência). Vale conferir na planilha.</div>
      )}

      <div className="grade-2 iguais">
        <Card titulo="Quantos dias antes ou depois do prazo" sub="Verde = entregou antes ou no prazo · vermelho = atrasou. Passe o mouse para ver os dias.">
          <GraficoMensal corPorSinal altura={250} meses={comps} formato={fmtDias} eixo={(v) => v}
            series={[{ nome: 'Dias', valores: sits.map((s) => (['prazo', 'limite', 'atraso', 'pendente'].includes(s.status) ? -s.dias : null)) }]} />
        </Card>
        <Card titulo="Linha do tempo">
          <Legenda status={['prazo', 'limite', 'atraso', 'pendente', 'aberto']} />
          <div className="ent-linha">
            {sits.map((s) => (
              <div key={s.comp}><small>{rotuloMes(s.comp)}</small><Celula s={s} /></div>
            ))}
          </div>
        </Card>
      </div>

      <Card titulo="Mês a mês">
        <div className="rolagem">
          <table className="tabela">
            <thead><tr><th>Competência</th><th>Prazo</th><th>Entregue em</th><th>Situação</th><th>Diferença</th></tr></thead>
            <tbody>
              {sits.map((s) => (
                <tr key={s.comp}>
                  <td className="forte">{rotuloMes(s.comp)}</td>
                  <td>{dataBR(s.prazo)}{s.prazo !== s.prazoBase && <span className="meta">dia {s.prazoBase.slice(8)} caiu em fim de semana/feriado</span>}</td>
                  <td>{s.entrega ? dataBR(s.entrega) : '—'}</td>
                  <td><span className={`pill pill-ent-${s.status}`}>{SITUACOES[s.status].nome}</span></td>
                  <td className={s.status === 'atraso' || s.status === 'pendente' ? 'neg' : 'muted'}>{textoDias(s) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
