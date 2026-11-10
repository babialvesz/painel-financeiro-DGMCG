import { useMemo } from 'react';
import { usePainel } from '../contexto/PainelContexto';
import { CONFIG } from '../config';
import { link, navegar } from '../hooks/useRota';
import { analisarItensUnidade, descontosFiltrados, situacao, valor } from '../utils/analise';
import { brl, contrato, nomeCurto, pct, plural, rotuloMes, rotuloPeriodo } from '../utils/formatacao';
import { mesesComDado } from '../utils/analise';
import { classeCss } from '../services/descontos';
import Trilha from '../components/layout/Trilha';
import Card from '../components/comum/Card';
import StatCard from '../components/comum/StatCard';
import Pill from '../components/comum/Pill';
import Abas from '../components/comum/Abas';
import GraficoMensal from '../components/comum/GraficoMensal';
import { Anel, Progresso } from '../components/comum/Graficos';
import Icone from '../components/comum/Icone';
import { Celula } from './Entregas';
import { indicadores } from '../utils/entregas';
import ItensUnidade from './unidade/ItensUnidade';
import MesAMes from './unidade/MesAMes';
import DetalheItem from './unidade/DetalheItem';

export default function Unidade({ aba, query }) {
  const { modelo, meses, janela, filtro } = usePainel();
  const u = modelo.porAba[aba];
  const analise = useMemo(() => (u ? analisarItensUnidade(modelo, u, meses, janela) : null), [modelo, u, meses, janela]);

  if (!u) return <div className="vazio-pagina">Unidade não encontrada. <a href={link('unidades')}>Voltar para unidades</a></div>;

  const s = situacao(u, meses, janela);
  const entrega = modelo.entregas.find((e) => e.aba === u.aba && e.ano === filtro.ano);
  // Período real da unidade: só os meses que ela já enviou (ex.: jan–ago se setembro ainda não chegou)
  const mesesU = mesesComDado(u, meses);
  const faltando = filtro.periodo === 'acum' ? meses.filter((m) => m > (mesesU[mesesU.length - 1] || '')) : [];
  const linhasPeriodo = [['Período', rotuloPeriodo(mesesU.length ? mesesU : meses, filtro.periodo)]];
  if (faltando.length) linhasPeriodo.push(['Ainda não enviou', faltando.map(rotuloMes).join(', ')]);
  const ver = query.ver === 'mensal' ? 'mensal' : 'itens';
  const ir = (params) => navegar(link('unidade', aba, { ver: query.ver, item: query.item, ...params }));
  const mesesJ = janela.filter((m) => u.v[m]);
  const classificacao = [u.grupo, u.porte].filter((x) => x && x !== CONFIG.semClassificacao).join(' · ');
  const alerta = s.mesesDef >= CONFIG.alertaMeses;
  const descontos = descontosFiltrados(modelo, { ...filtro, grupo: '', porte: '' }).filter((d) => d.aba === u.aba);
  const totalDeducoes = descontos.reduce((a, d) => a + d.valor, 0);
  const porClassificacao = Object.entries(descontos.reduce((m, d) => ({ ...m, [d.classificacao]: (m[d.classificacao] || 0) + d.valor }), {})).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <Trilha passos={[{ nome: 'Unidades', href: link('unidades') }, { nome: nomeCurto(u.nome) }]} />
      <div className="titulo-pagina">
        <div>
          <h1>{nomeCurto(u.nome)}</h1>
          <p className="sub">{[contrato(u.aba), u.oss, classificacao].filter(Boolean).join(' · ')}</p>
        </div>
        {s.temDado && <Pill res={s.res} />}
      </div>

      {!s.temDado ? (
        <div className="vazio-pagina">Esta unidade ainda não enviou a prestação de contas de {rotuloPeriodo(meses, filtro.periodo)}.</div>
      ) : (
        <>
          <div className="grade-stats-unidade cinco">
            <StatCard rotulo="Receitas" ajuda="Tudo o que entrou para a unidade no período (repasses e outras receitas)." valor={brl(s.rec)} linhas={linhasPeriodo} />
            <StatCard rotulo="Despesas" ajuda="Todas as despesas da unidade no período, antes das provisões (reservas para férias, 13º e rescisões)." valor={brl(s.desp)} linhas={[['Média por mês', brl(s.desp / Math.max(1, meses.filter((m) => u.v[m]).length))]]} />
            <StatCard rotulo="Resultado" ajuda="Receitas menos despesas. Negativo = déficit (despesas maiores que as receitas). Positivo = superávit (despesas menores que as receitas)."
              cor={s.res < 0 ? 'var(--vermelho)' : 'var(--verde)'} valor={brl(s.res)}
              linhas={[[s.res < 0 ? 'Déficit: despesas maiores que as receitas' : 'Superávit: despesas menores que as receitas', '']]} />
            <StatCard rotulo="Com deduções" ajuda="Resultado menos os descontos, abatimentos e compensações aplicados à unidade no período (aba DESCONTOS_DEVOLUÇÃO_COMPENSAÇÃO)."
              cor={totalDeducoes ? (s.res - totalDeducoes < 0 ? 'var(--vermelho)' : 'var(--verde)') : undefined}
              valor={totalDeducoes ? brl(s.res - totalDeducoes) : <span className="muted">-</span>}
              linhas={[['Deduções no período', totalDeducoes ? brl(totalDeducoes) : 'R$ 0,00']]}
              href={totalDeducoes ? '#descontos-unidade' : undefined} />
            <div className={`stat stat-anel ${alerta ? 'alerta' : ''}`}>
              <span className="stat-rotulo">Meses no vermelho</span>
              <Anel valor={s.mesesJanela ? s.mesesDef / s.mesesJanela : 0} tamanho={92} espessura={8} cor={alerta ? 'var(--amarelo)' : 'var(--vermelho)'}>
                <strong>{s.mesesDef}<small>/{s.mesesJanela}</small></strong>
              </Anel>
              <span className="stat-nota">{alerta ? `Em alerta: ${plural(s.mesesDef, 'mês', 'meses')} no vermelho` : 'meses com prestação de contas'}</span>
            </div>
          </div>

          {entrega && (
            <Card titulo="Entrega das prestações de contas"
              acoes={<a className="link-acao" href={link('entrega', entrega.id)}>Ver detalhes <Icone nome="seta" tamanho={14} /></a>}
              sub={(() => { const i = indicadores(Object.values(entrega.meses)); return i.avaliadas ? `${i.noPrazo} de ${i.avaliadas} entregues no prazo${i.pendentes ? ` · ${plural(i.pendentes, 'competência', 'competências')} ainda não ${i.pendentes === 1 ? 'entregue' : 'entregues'}` : ''}. Passe o mouse em cada mês.` : 'Sem entregas avaliadas ainda.'; })()}>
              <div className="ent-linha">
                {Object.keys(entrega.meses).sort().map((c) => <div key={c}><small>{rotuloMes(c)}</small><Celula s={entrega.meses[c]} /></div>)}
              </div>
            </Card>
          )}

          <div className="grade-2">
            <Card titulo="Receitas × despesas por mês" sub="Passe o mouse para ver o valor exato.">
              <GraficoMensal altura={220} meses={mesesJ} series={[
                { nome: 'Receitas', cor: '--acento-suave', valores: mesesJ.map((m) => valor(u, m, 'REC')) },
                { nome: 'Despesas', cor: '--acento', valores: mesesJ.map((m) => valor(u, m, 'DESP')) },
              ]} />
            </Card>
            <Card titulo="Resultado de cada mês" sub="Verde = superávit · vermelho = déficit.">
              <GraficoMensal altura={220} corPorSinal meses={mesesJ} series={[{ nome: 'Resultado', valores: mesesJ.map((m) => valor(u, m, 'RES')) }]} />
            </Card>
          </div>

          {descontos.length > 0 && (
            <div className="grade-deducoes" id="descontos-unidade">
              <Card titulo="Deduções por classificação" sub="Descontos, abatimentos e compensações aplicados à unidade.">
                <div className="deducao-corpo">
                <ul className="lista-pesos">
                  {porClassificacao.map(([c, v]) => (
                    <li key={c}><div>
                      <span className="lista-pesos-topo"><span><span className={`pill pill-classe-${classeCss(c)}`}>{c}</span></span><b>{brl(v)}</b></span>
                      <Progresso valor={v / totalDeducoes} cor={`var(--classe-${classeCss(c)})`} />
                      <small>{pct(v / totalDeducoes)} das deduções · {plural(descontos.filter((d) => d.classificacao === c).length, 'lançamento', 'lançamentos')}</small>
                    </div></li>
                  ))}
                </ul>
                <div className="resumo-deducao">
                  <div><span>Resultado</span><b className={s.res < 0 ? 'neg' : 'pos'}>{brl(s.res)}</b></div>
                  <div><span>− Deduções</span><b>{brl(totalDeducoes)}</b></div>
                  <div className="total"><span>= Com deduções</span><b className={s.res - totalDeducoes < 0 ? 'neg' : 'pos'}>{brl(s.res - totalDeducoes)}</b></div>
                </div>
                </div>
              </Card>
              <Card titulo="Lançamentos de dedução" sub="Da aba DESCONTOS_DEVOLUÇÃO_COMPENSAÇÃO."
                acoes={<a className="link-seta" href={link('descontos', { u: descontos[0].nome })}>Ver na aba Descontos <Icone nome="seta" tamanho={14} /></a>}>
                <div className="rolagem">
                  <table className="tabela">
                    <thead><tr><th>Competência</th><th className="num">Valor</th><th>Classificação</th><th>Objeto contratual</th><th>Nº SEI</th><th>Justificativa</th></tr></thead>
                    <tbody>
                      {descontos.map((d, i) => (
                        <tr key={i}><td>{rotuloMes(d.comp)}</td><td className="num forte">{brl(d.valor)}</td>
                          <td><span className={`pill pill-classe-${classeCss(d.classificacao)}`}>{d.classificacao}</span></td>
                          <td>{d.objeto}</td><td className="sei">{d.sei || '—'}</td><td className="muted">{d.justificativa || '—'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="total-tabela">Total de deduções: <b>{brl(totalDeducoes)}</b></p>
              </Card>
            </div>
          )}

          <Abas abas={[{ id: 'itens', nome: 'Despesas por item' }, { id: 'mensal', nome: 'Tabela mês a mês' }]}
            ativa={ver} onTrocar={(id) => ir({ ver: id === 'mensal' ? 'mensal' : '' })} />

          {ver === 'itens'
            ? <ItensUnidade u={u} analise={analise} onAbrirItem={(c) => ir({ item: c })} />
            : <MesAMes u={u} meses={mesesJ} onAbrirItem={(c) => ir({ item: c })} />}
        </>
      )}

      {query.item && analise && <DetalheItem u={u} codigo={query.item} analise={analise} onFechar={() => ir({ item: '' })} />}
    </>
  );
}
