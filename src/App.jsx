import { useCarregamento } from './hooks/useCarregamento';
import { useRota } from './hooks/useRota';
import { useTema } from './hooks/useTema';
import { PainelProvider } from './contexto/PainelContexto';
import Shell from './components/layout/Shell';
import TelaLogin from './telas/TelaLogin';
import VisaoGeral from './telas/VisaoGeral';
import Unidades from './telas/Unidades';
import Unidade from './telas/Unidade';
import Itens from './telas/Itens';
import Item from './telas/Item';
import Descontos from './telas/Descontos';

function Tela({ rota }) {
  const [tela, param] = rota.partes;
  switch (tela) {
    case 'unidades': return <Unidades query={rota.query} />;
    case 'unidade': return <Unidade aba={param} query={rota.query} />;
    case 'itens': return <Itens />;
    case 'item': return <Item codigo={param} query={rota.query} />;
    case 'descontos': return <Descontos query={rota.query} />;
    default: return <VisaoGeral />;
  }
}

export default function App() {
  const { estado, erro, modelo, carregar, sair, podeSair } = useCarregamento();
  const rota = useRota();
  const [tema, alternarTema] = useTema();

  if (estado !== 'pronto') return <TelaLogin carregando={estado === 'carregando'} erro={erro} onEntrar={carregar} />;

  return (
    <PainelProvider modelo={modelo}>
      <Shell telaAtual={rota.partes[0] || ''} tema={tema} alternarTema={alternarTema} onSair={podeSair ? sair : null}>
        {/* key={tema}: redesenha os gráficos com as cores do tema */}
        <Tela key={tema} rota={rota} />
      </Shell>
    </PainelProvider>
  );
}
