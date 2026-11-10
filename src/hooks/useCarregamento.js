// Login, perfil e carregamento dos dados de cada área (sob demanda, com cache)
import { useCallback, useEffect, useRef, useState } from 'react';
import { CONFIG, googleConfigurado } from '../config';
import * as auth from '../services/googleAuth';
import * as sheets from '../services/sheets';
import * as local from '../services/local';
import { areasDoUsuario } from '../services/perfis';
import { montarModelo } from '../services/modelo';
import { montarProducao } from '../services/producao';

const usaLocal = () => local.temDadosEmbutidos() || CONFIG.fonte === 'local';

/** Sessão: quem entrou e quais áreas pode ver. */
export function useSessao() {
  const [estado, setEstado] = useState(usaLocal() ? 'carregando' : 'login'); // login | carregando | pronto
  const [erro, setErro] = useState('');
  const [sessao, setSessao] = useState(null);

  const entrar = useCallback(async () => {
    setEstado('carregando'); setErro('');
    try {
      if (usaLocal()) {
        setSessao({ usuario: { email: 'teste local', nome: 'Teste local' }, areas: Object.keys(CONFIG.areas), perfil: 'ADMIN (teste)' });
      } else {
        const token = auth.tokenValido() || (await auth.entrar());
        const usuario = await auth.usuario(token);
        const { areas, perfil } = await areasDoUsuario(usuario.email, token);
        setSessao({ usuario, areas, perfil });
      }
      setEstado('pronto');
    } catch (e) {
      auth.sair();
      setErro(e.message); setEstado('login');
    }
  }, []);

  useEffect(() => {
    if (usaLocal() || (googleConfigurado() && auth.tokenValido())) entrar();
  }, [entrar]);

  const sair = useCallback(() => { auth.sair(); setSessao(null); setEstado('login'); }, []);
  return { estado, erro, sessao, entrar, sair, podeSair: !usaLocal() };
}

const CARREGADORES = {
  financeiro: async () => {
    const bruto = usaLocal() ? await local.carregar() : await sheets.carregar(await tokenOuLogin());
    const m = montarModelo(bruto);
    if (!m.unidades.length || !m.meses.length) throw new Error('Nenhum dado financeiro encontrado.');
    return m;
  },
  producao: async () => {
    const bruto = usaLocal() ? { linhas: (await local.carregar()).producaoLinhas || [] } : await sheets.carregarProducao(await tokenOuLogin());
    const m = montarProducao(bruto.linhas);
    if (!m.registros.length) throw new Error('Nenhum dado de produção encontrado na aba Dados_Tratados.');
    return m;
  },
};

async function tokenOuLogin() { return auth.tokenValido() || auth.entrar(); }

/** Dados de uma área: carrega na primeira vez que a área é aberta e guarda em memória. */
export function useDadosArea(area, ativo, onSessaoExpirada) {
  const cache = useRef({});
  const [, forcar] = useState(0);
  const carregar = useCallback(async (a, recarregar = false) => {
    if (!recarregar && cache.current[a] && cache.current[a].estado !== 'erro') return;
    cache.current[a] = { estado: 'carregando' }; forcar((n) => n + 1);
    try {
      cache.current[a] = { estado: 'pronto', modelo: await CARREGADORES[a]() };
    } catch (e) {
      if (e instanceof sheets.ErroSessao) { onSessaoExpirada?.(); return; }
      cache.current[a] = { estado: 'erro', erro: e.message };
    }
    forcar((n) => n + 1);
  }, [onSessaoExpirada]);

  useEffect(() => { if (ativo && area) carregar(area); }, [area, ativo, carregar]);
  return { ...(cache.current[area] || { estado: 'carregando' }), recarregar: () => carregar(area, true) };
}
