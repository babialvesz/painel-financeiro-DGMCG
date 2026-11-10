import { useMemo, useState } from 'react';
import { usePainel } from '../contexto/PainelContexto';
import { CONFIG } from '../config';
import { link, navegar } from '../hooks/useRota';
import { agrupar, compararItens, contagemPorMes, maiorGrupoPorUnidade, situacoes, valor } from '../utils/analise';
import { brl, nomeCurto, pct, plural, rotuloMes, rotuloPeriodo } from '../utils/formatacao';
import Card from '../components/comum/Card';
import StatCard from '../components/comum/StatCard';
import Icone from '../components/comum/Icone';
import GraficoMensal from '../components/comum/GraficoMensal';
import { Anel, BarrasResultado, Progresso } from '../components/comum/Graficos';

export default function VisaoGeral() {
  const { modelo, unidades, meses, janela, filtro } = usePainel();
  const sits = useMemo(() => situacoes(unidades, meses, janela), [unidades, meses, janela]);
  const g = useMemo(() => agrupar(sits), [sits]);
  const ativas = useMemo(() => unidades.filter((u) => janela.some((m) => u.v[m])), [unidades, janela]);
  const cont = useMemo(() => contagemPorMes(ativas, janela), [ativas, janela]);
  const pesos = useMemo(() => compararItens(modelo, unidades, meses), [modelo, unidades, meses]);
  const maiorEm = useMemo(() => maiorGrupoPorUnidade(modelo, unidades, meses), [modelo, unidades, meses]);

  const total = sits.length;
  const periodo = rotuloPeriodo(meses, filtro.periodo);
  const rot = cont.map((c) => rotuloMes(c.m));
  const ultimo = cont[cont.length - 1];
  const completos = cont.filter((c) => c.enviaram >= 0.7 * Math.max(...cont.map((x) => x.enviaram)));
  const ultimoCompleto = completos[completos.length - 1];
  const media = (k) => Math.round(completos.reduce((s, c) => s + c[k], 0) / Math.max(completos.length, 1));

  const piores = [...g.deficit].sort((a, b) => a.res - b.res);
  const grupos = modelo.raizes.map((c) => pesos.linhas[c]).filter(Boolean).sort((a, b) => b.pesoMedio - a.pesoMedio);

  const semValores = modelo.unidades.filter((u) => !Object.keys(u.v).length);
  return (
    <>
      {semValores.length > 0 && (
        <div className="aviso-suave aviso-erro">
          <Icone nome="alerta" tamanho={16} />
          <span><b>{semValores.length} de {modelo.unidades.length} unidades estão sem valores</b> na aba PAINEL_VALORES da planilha. Provavelmente a última gravação do Apps Script parou no meio. Rode <b>painel_gerarDados</b> de novo (com DRY_RUN = false).</span>
        </div>
      )}
      <ComoLer />

      <div className="grade-topo">
        <section className="card heroi">
          <div className="heroi-texto">
            <span className="heroi-sobre">{periodo}</span>
            <h1><b>{g.deficit.length}</b> de {total} unidades<br />estão em déficit</h1>
            <p>Déficit = despesas maiores que as receitas. Cada unidade tem o seu próprio orçamento: aqui contamos quantas estão em déficit, sem misturar os valores de uma com os de outra.</p>
            <a className="botao-claro" href={link('unidades', { f: 'deficit' })}>Ver quais são <Icone nome="seta" tamanho={16} /></a>
          </div>
          <Anel valor={total ? g.deficit.length / total : 0} tamanho={150} espessura={13} cor="var(--heroi-anel)">
            <strong>{pct(total ? g.deficit.length / total : 0, 0)}</strong>
            <span>no vermelho</span>
          </Anel>
        </section>

        <Card titulo="Mês a mês" ajuda="Cada ponto é um mês. Mostra quantas unidades fecharam aquele mês em déficit (despesas maiores que as receitas) ou em superávit (despesas menores que as receitas).">
          <div className="stats">
            <StatCard rotulo="Déficit" cor="var(--vermelho)" valores={cont.map((c) => c.vermelho)} rotulos={cont.map((c, i) => `${rot[i]}: ${c.vermelho} unidades`)}
              valor={ultimoCompleto?.vermelho ?? 0} unidade={ultimoCompleto ? ` em ${rotuloMes(ultimoCompleto.m)}` : ''}
              linhas={[['Média por mês', media('vermelho')], ['Pior mês', Math.max(...cont.map((c) => c.vermelho))]]} />
            <StatCard rotulo="Superávit" cor="var(--verde)" valores={cont.map((c) => c.azul)} rotulos={cont.map((c, i) => `${rot[i]}: ${c.azul} unidades`)}
              valor={ultimoCompleto?.azul ?? 0} unidade={ultimoCompleto ? ` em ${rotuloMes(ultimoCompleto.m)}` : ''}
              linhas={[['Média por mês', media('azul')], ['Melhor mês', Math.max(...cont.map((c) => c.azul))]]} />
            <StatCard rotulo="Enviaram as contas" ajuda="Quantas unidades já mandaram a prestação de contas do mês. Meses recentes podem estar incompletos." cor="var(--acento)"
              valores={cont.map((c) => c.enviaram)} rotulos={cont.map((c, i) => `${rot[i]}: ${c.enviaram} de ${ativas.length}`)}
              valor={ultimo?.enviaram ?? 0} unidade={ultimo ? ` em ${rotuloMes(ultimo.m)}` : ''}
              linhas={[['Total de unidades', ativas.length], ['Faltam enviar', ultimo?.semEnvio ?? 0]]} />
          </div>
        </Card>
      </div>

      <div className="faixa-progresso card">
        <a className="faixa-item" href={link('unidades', { f: 'alerta' })}>
          <span className="faixa-icone alerta"><Icone nome="alerta" /></span>
          <span><small>Em alerta: no vermelho em {CONFIG.alertaMeses} meses ou mais</small><b>{plural(g.alerta.length, 'unidade', 'unidades')} de {total}</b></span>
          <Progresso valor={total ? g.alerta.length / total : 0} cor="var(--amarelo)" />
        </a>
        <span className="faixa-divisor" />
        <div className="faixa-item">
          <span className="faixa-icone"><Icone nome="info" /></span>
          <span><small>Prestação de contas de {ultimo ? rotuloMes(ultimo.m) : '—'}</small><b>{ultimo?.enviaram ?? 0} de {ativas.length} enviaram</b></span>
          <Progresso valor={ativas.length ? (ultimo?.enviaram ?? 0) / ativas.length : 0} />
        </div>
      </div>

      <div className="grade-principal">
        <Card titulo="Unidades que mais precisam de atenção" sub="Unidades em déficit, do maior para o menor resultado negativo. Valores de cada unidade, nunca somados."
          acoes={<a className="link-seta" href={link('unidades')}>Ver todas <Icone nome="seta" tamanho={14} /></a>}>
          <div className="rolagem">
            <table className="tabela">
              <thead>
                <tr><th>Unidade</th><th className="num">Receitas</th><th className="num">Despesas</th><th className="num">Resultado</th><th>Mês a mês</th></tr>
              </thead>
              <tbody>
                {piores.slice(0, 8).map((s) => (
                  <tr key={s.u.aba} className="clicavel" onClick={() => navegar(link('unidade', s.u.aba))}>
                    <td><a className="nome-unidade" href={link('unidade', s.u.aba)} onClick={(e) => e.stopPropagation()}>{nomeCurto(s.u.nome)}</a></td>
                    <td className="num">{brl(s.rec)}</td>
                    <td className="num">{brl(s.desp)}</td>
                    <td className="num forte neg">{brl(s.res)}</td>
                    <td className="col-mini" title={`${s.mesesDef} de ${s.mesesJanela} meses no vermelho`}>
                      <BarrasResultado valores={janela.map((m) => (s.u.v[m] ? valor(s.u, m, 'RES') : null))} altura={26} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!piores.length && <p className="vazio">Nenhuma unidade em déficit no período.</p>}
        </Card>

        <div className="coluna">
          {g.grave && (
            <a className="card grave" href={link('unidade', g.grave.u.aba)}>
              <div>
                <h2>Situação mais grave</h2>
                <p className="grave-nome">{nomeCurto(g.grave.u.nome)}</p>
                <p className="sub">Resultado no período: <b className="neg">{brl(g.grave.res)}</b></p>
                <span className="link-seta">Ver detalhes <Icone nome="seta" tamanho={14} /></span>
              </div>
              <Anel valor={g.grave.mesesJanela ? g.grave.mesesDef / g.grave.mesesJanela : 0} tamanho={104} espessura={9} cor="var(--vermelho)">
                <strong>{g.grave.mesesDef}<small>/{g.grave.mesesJanela}</small></strong>
                <span>meses no vermelho</span>
              </Anel>
            </a>
          )}
          <Card titulo="Principais grupos de despesa" ajuda="Para cada unidade calculamos quanto cada grupo representa do total das despesas DELA. Depois tiramos a média. Assim comparamos unidades grandes e pequenas sem somar valores.">
            <ul className="lista-pesos">
              {grupos.slice(0, 6).map((l) => (
                <li key={l.c}>
                  <a href={link('item', l.c)}>
                    <span className="lista-pesos-topo"><span>{l.item.n}</span><b>{pct(l.pesoMedio, 0)}</b></span>
                    <Progresso valor={l.pesoMedio} />
                    <small>{maiorEm[l.c] ? `É a maior despesa em ${plural(maiorEm[l.c], 'unidade', 'unidades')}` : `Aparece em ${plural(l.qtdUnidades, 'unidade', 'unidades')}`}</small>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card titulo="Quantas unidades ficaram em déficit em cada mês" sub="Contagem de unidades (não soma valores). Passe o mouse sobre as barras.">
        <GraficoMensal
          altura={240}
          empilhado
          meses={janela}
          formato={(v) => plural(v, 'unidade', 'unidades')}
          eixo={(v) => v}
          series={[
            { nome: 'Déficit', cor: '--vermelho', valores: cont.map((c) => c.vermelho) },
            { nome: 'Superávit', cor: '--verde', valores: cont.map((c) => c.azul) },
            { nome: 'Ainda não enviou', cor: '--trilho', valores: cont.map((c) => c.semEnvio) },
          ]}
        />
      </Card>
    </>
  );
}

function ComoLer() {
  const CHAVE = 'painel_como_ler_fechado';
  const [aberto, setAberto] = useState(() => { try { return !localStorage.getItem(CHAVE); } catch { return true; } });
  if (!aberto) return null;
  const fechar = () => { setAberto(false); try { localStorage.setItem(CHAVE, '1'); } catch { /* sem storage */ } };
  return (
    <div className="como-ler">
      <Icone nome="info" tamanho={20} />
      <div>
        <b>Como ler este painel</b>
        <ul>
          <li><span className="pill pill-neg">Déficit</span> as <b>despesas</b> da unidade foram <b>maiores que as receitas</b>.</li>
          <li><span className="pill pill-pos">Superávit</span> as <b>despesas</b> da unidade foram <b>menores que as receitas</b>.</li>
          <li>Cada unidade tem orçamento próprio: os valores <b>não são somados</b> entre unidades.</li>
          <li>Clique em qualquer unidade para ver <b>as despesas dela por item</b>.</li>
        </ul>
      </div>
      <button className="fechar" onClick={fechar} aria-label="Fechar explicação"><Icone nome="fechar" /></button>
    </div>
  );
}
