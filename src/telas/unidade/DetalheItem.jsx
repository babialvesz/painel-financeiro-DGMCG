import { useEffect, useMemo } from 'react';
import { usePainel } from '../../contexto/PainelContexto';
import { link } from '../../hooks/useRota';
import { pares, soma, valor } from '../../utils/analise';
import { brl, nomeCurto, pct } from '../../utils/formatacao';
import GraficoMensal from '../../components/comum/GraficoMensal';
import BarrasLista from '../../components/comum/BarrasLista';
import Comparacao from '../../components/comum/Comparacao';
import Icone from '../../components/comum/Icone';

// Painel lateral com o detalhe de um gasto numa unidade
export default function DetalheItem({ u, codigo, analise, onFechar }) {
  const { modelo, meses } = usePainel();
  const item = modelo.itens[codigo];
  const l = analise.linhas[codigo];

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFechar();
    document.addEventListener('keydown', esc);
    document.body.classList.add('sem-rolagem');
    return () => { document.removeEventListener('keydown', esc); document.body.classList.remove('sem-rolagem'); };
  }, [onFechar]);

  const comparacao = useMemo(() => {
    const grupo = pares(modelo, u).filter((p) => soma(p, 'DESP', meses) > 0);
    if (grupo.length < 3) return [];
    return grupo
      .map((p) => { const t = soma(p, codigo, meses); return { p, t, pc: t / soma(p, 'DESP', meses) }; })
      .sort((a, b) => b.pc - a.pc)
      .map(({ p, t, pc }) => ({
        chave: p.aba, rotulo: nomeCurto(p.nome), sub: `Despesa: ${brl(t)}`, valor: pc, texto: pct(pc), destaque: p === u,
        tom: p === u ? 'atual' : 'claro', href: p === u ? undefined : link('unidade', p.aba, { item: codigo }),
      }));
  }, [modelo, u, codigo, meses]);

  const subitens = item ? item.filhos.map((f) => analise.linhas[f]).filter(Boolean).sort((a, b) => b.total - a.total) : [];
  const pai = item?.pai ? modelo.itens[item.pai] : null;

  return (
    <div className="gaveta-fundo" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <aside className="gaveta" role="dialog" aria-modal="true" aria-label={item ? item.n : 'Despesa'}>
        <div className="gaveta-topo">
          <div>
            <span className="gaveta-sobre">{nomeCurto(u.nome)}</span>
            {pai && <a className="gaveta-pai" href={link('unidade', u.aba, { item: pai.c })}>‹ faz parte de {pai.n}</a>}
            <h2>{item ? item.n : codigo} <span className="codigo">{codigo}</span></h2>
          </div>
          <button className="fechar" onClick={onFechar} aria-label="Fechar"><Icone nome="fechar" /></button>
        </div>

        {!l ? <p className="vazio">A unidade não teve essa despesa no período.</p> : (
          <>
            <div className="mini-kpis">
              <div><span>Valor</span><strong>{brl(l.total)}</strong></div>
              <div><span>Peso nas despesas da unidade</span><strong>{pct(l.pct)}</strong></div>
              <div><span>Média por mês</span><strong>{brl(l.media)}</strong></div>
              <div><span>Menor mês → maior mês</span><strong className="pequeno">{brl(l.min)} → {brl(l.max)}</strong></div>
            </div>

            <h3>Mês a mês</h3>
            <GraficoMensal altura={190} meses={l.mesesSerie} series={[{ nome: 'Despesa', cor: '--acento', valores: l.mesesSerie.map((m) => valor(u, m, codigo)) }]} />

            {subitens.length > 0 && (
              <>
                <h3>Do que é composto</h3>
                <BarrasLista linhas={subitens.map((s) => ({ chave: s.c, rotulo: s.item.n, valor: s.total, pct: l.total ? s.total / l.total : 0, href: link('unidade', u.aba, { item: s.c }) }))} />
              </>
            )}

            <h3>Comparado às unidades parecidas <Comparacao l={l} /></h3>
            {comparacao.length ? (
              <>
                <p className="sub">Quanto essa despesa pesa no orçamento de cada unidade do mesmo tipo e porte. A unidade atual está destacada.</p>
                <BarrasLista linhas={comparacao} mostrarPct={false} />
              </>
            ) : <p className="vazio">Não há unidades parecidas suficientes para comparar.</p>}
          </>
        )}

        <a className="botao-secundario largo" href={link('item', codigo)}>Comparar esta despesa entre todas as unidades <Icone nome="seta" tamanho={14} /></a>
      </aside>
    </div>
  );
}
