import { googleConfigurado } from '../config';

export default function TelaLogin({ carregando, erro, onEntrar }) {
  return (
    <div className="login">
      <div className="login-caixa">
        <span className="logo-icone grande" aria-hidden="true"><i /><i /><i /></span>
        <h1>Acompanhamento Financeiro</h1>
        <p>Situação financeira das unidades de saúde geridas por OSS: receitas, despesas por item e resultado.</p>
        {carregando ? (
          <p className="login-status"><span className="girando" aria-hidden="true" /> Carregando dados…</p>
        ) : googleConfigurado() ? (
          <button className="botao" onClick={onEntrar}>Entrar com Google</button>
        ) : (
          <p className="login-aviso">Login com Google ainda não configurado neste ambiente.</p>
        )}
        {erro && <p className="login-erro" role="alert">{erro}</p>}
        {googleConfigurado() && !carregando && <p className="login-nota">Só quem tem acesso à planilha consegue ver os dados.</p>}
      </div>
    </div>
  );
}
