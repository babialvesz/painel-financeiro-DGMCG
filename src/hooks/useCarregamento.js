// Decide de onde vêm os dados e controla login/carregamento
import { useCallback, useEffect, useState } from 'react';
import { CONFIG, googleConfigurado } from '../config';
import * as auth from '../services/googleAuth';
import * as sheets from '../services/sheets';
import * as local from '../services/local';
import { montarModelo } from '../services/modelo';

const usaLocal = () => local.temDadosEmbutidos() || CONFIG.fonte === 'local';

export function useCarregamento() {
  const [estado, setEstado] = useState(usaLocal() ? 'carregando' : 'login'); // login | carregando | pronto
  const [erro, setErro] = useState('');
  const [modelo, setModelo] = useState(null);

  const carregar = useCallback(async () => {
    setEstado('carregando'); setErro('');
    try {
      let bruto;
      if (usaLocal()) bruto = await local.carregar();
      else bruto = await sheets.carregar(auth.tokenValido() || (await auth.entrar()));
      const m = montarModelo(bruto);
      if (!m.unidades.length || !m.meses.length) throw new Error('Nenhum dado encontrado.');
      setModelo(m); setEstado('pronto');
    } catch (e) {
      if (e instanceof sheets.ErroSessao) auth.sair();
      setErro(e.message); setEstado('login');
    }
  }, []);

  useEffect(() => {
    if (usaLocal() || (googleConfigurado() && auth.tokenValido())) carregar();
  }, [carregar]);

  const sair = useCallback(() => { auth.sair(); setModelo(null); setEstado('login'); }, []);

  return { estado, erro, modelo, carregar, sair, podeSair: !usaLocal() };
}
