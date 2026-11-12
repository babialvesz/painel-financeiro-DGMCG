import { useEffect } from 'react';
import { CONFIG } from './config';
import { useDadosArea, useSessao } from './hooks/useCarregamento';
import { navegar, useRota } from './hooks/useRota';
import { useTema } from './hooks/useTema';
import { PainelProvider } from './contexto/PainelContexto';
import { ProducaoProvider } from './contexto/ProducaoContexto';
import Shell from './components/layout/Shell';
import { FiltrosFinanceiro, FiltrosProducao, RodapeFinanceiro, RodapeProducao } from './components/layout/Filtros';
import TelaLogin from './telas/TelaLogin';
import VisaoGeral from './telas/VisaoGeral';
import Unidades from './telas/Unidades';
import Unidade from './telas/Unidade';
import DespesasPorItem from './telas/DespesasPorItem';
import Descontos from './telas/Descontos';
import Entregas from './telas/Entregas';
import EntregaUnidade from './telas/EntregaUnidade';
import VisaoProducao from './telas/producao/VisaoProducao';
import InicioProducao from './telas/producao/InicioProducao';
import UnidadesProducao from './telas/producao/UnidadesProducao';
import UnidadeProducao from './telas/producao/UnidadeProducao';
import IndicadoresProducao from './telas/producao/IndicadoresProducao';
import IndicadorProducao from './telas/producao/IndicadorProducao';
import Icone from './components/comum/Icone';
import ModoApresentacao from './telas/apresentacao/ModoApresentacao';

const MENUS = {
  financeiro: [
    { id: '', href: '#/', nome: 'Visão geral', icone: 'inicio' },
    { id: 'unidades', href: '#/unidades', nome: 'Unidades', icone: 'unidades', tambem: ['unidade'] },
    { id: 'itens', href: '#/itens', nome: 'Despesas por item', icone: 'itens', tambem: ['item'] },
    { id: 'descontos', href: '#/descontos', nome: 'Descontos', icone: 'desconto' },
    { id: 'entregas', href: '#/entregas', nome: 'Entregas', icone: 'calendario', tambem: ['entrega'] },
    { id: 'apresentacao', href: '#/apresentacao', nome: 'Apresentar', icone: 'apresentacao' },
  ],
  producao: [
    { id: '', href: '#/producao', nome: 'Início', icone: 'mapa' },
    { id: 'metas', href: '#/producao/metas', nome: 'Metas', icone: 'grafico' },
    { id: 'unidades', href: '#/producao/unidades', nome: 'Unidades', icone: 'unidades', tambem: ['unidade'] },
    { id: 'indicadores', href: '#/producao/indicadores', nome: 'Indicadores', icone: 'meta', tambem: ['indicador'] },
    { id: 'apresentacao', href: '#/apresentacao', nome: 'Apresentar', icone: 'apresentacao' },
  ],
};

function TelaFinanceiro({ rota }) {
  const [tela, param] = rota.partes;
  switch (tela) {
    case 'unidades': return <Unidades query={rota.query} />;
    case 'unidade': return <Unidade aba={param} query={rota.query} />;
    case 'itens': return <DespesasPorItem />;
    case 'item': return <DespesasPorItem codigo={param} />;
    case 'descontos': return <Descontos query={rota.query} />;
    case 'entregas': return <Entregas query={rota.query} />;
    case 'entrega': return <EntregaUnidade id={param} />;
    default: return <VisaoGeral />;
  }
}

function TelaProducao({ rota }) {
  const [, tela, param] = rota.partes;
  switch (tela) {
    case 'unidades': return <UnidadesProducao query={rota.query} />;
    case 'unidade': return <UnidadeProducao id={param} query={rota.query} />;
    case 'indicadores': return <IndicadoresProducao />;
    case 'indicador': return <IndicadorProducao nome={param} />;
    case 'metas': return <VisaoProducao />;
    default: return <InicioProducao query={rota.query} />;
  }
}

export default function App() {
  const { estado, erro, sessao, entrar, sair, podeSair } = useSessao();
  const rota = useRota();
  const [tema, alternarTema] = useTema();
  const apresentacao = rota.partes[0] === 'apresentacao';
  const area = rota.partes[0] === 'producao' ? 'producao' : 'financeiro';
  const pode = (a) => estado === 'pronto' && sessao.areas.includes(a);
  const permitido = apresentacao ? estado === 'pronto' : pode(area);
  // cada área carrega só quando é usada (no modo apresentação, todas as áreas do perfil)
  const dadosFin = useDadosArea('financeiro', pode('financeiro') && (apresentacao || area === 'financeiro'), sair);
  const dadosProd = useDadosArea('producao', pode('producao') && (apresentacao || area === 'producao'), sair);
  const dados = area === 'producao' ? dadosProd : dadosFin;

  // área sem permissão (ou link antigo): vai para a primeira área liberada
  useEffect(() => {
    if (estado === 'pronto' && !apresentacao && !sessao.areas.includes(area)) navegar(CONFIG.areas[sessao.areas[0]].inicio);
  }, [estado, sessao, area, apresentacao]);

  if (estado !== 'pronto') return <TelaLogin carregando={estado === 'carregando'} erro={erro} onEntrar={entrar} />;
  if (!permitido) return null;

  if (apresentacao) {
    return (
      <ModoApresentacao rota={rota} tema={tema} sessao={sessao}
        fin={pode('financeiro') ? dadosFin : null} prod={pode('producao') ? dadosProd : null} />
    );
  }

  const props = {
    area, areas: sessao.areas, usuario: sessao.usuario, menu: MENUS[area],
    telaAtual: (area === 'producao' ? rota.partes[1] : rota.partes[0]) || '',
    tema, alternarTema, onSair: podeSair ? sair : null,
  };

  if (dados.estado !== 'pronto') {
    return (
      <Shell {...props}>
        {dados.estado === 'erro' ? (
          <div className="vazio-pagina">
            <p><Icone nome="alerta" /> Não foi possível carregar os dados de {CONFIG.areas[area].nome.toLowerCase()}.</p>
            <p className="muted">{dados.erro}</p>
            <button className="botao" onClick={dados.recarregar}>Tentar de novo</button>
          </div>
        ) : (
          <div className="vazio-pagina"><span className="girando" aria-hidden="true" /> Carregando dados de {CONFIG.areas[area].nome.toLowerCase()}…</div>
        )}
      </Shell>
    );
  }

  // key={tema}: redesenha os gráficos com as cores do tema
  return area === 'producao' ? (
    <ProducaoProvider modelo={dados.modelo}>
      <Shell {...props} filtros={<FiltrosProducao />} rodape={<RodapeProducao />}>
        <TelaProducao key={tema} rota={rota} />
      </Shell>
    </ProducaoProvider>
  ) : (
    <PainelProvider modelo={dados.modelo}>
      <Shell {...props} filtros={<FiltrosFinanceiro />} rodape={<RodapeFinanceiro />}>
        <TelaFinanceiro key={tema} rota={rota} />
      </Shell>
    </PainelProvider>
  );
}
