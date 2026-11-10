import { googleConfigurado } from '../config';

export default function TelaLogin({ carregando, erro, onEntrar }) {
  return (
    <div className="login">
      <div className="login-caixa">
        <span className="logo-icone grande" aria-hidden="true"><i /><i /><i /></span>
        <h1>Painel das Unidades OSS</h1>
        <p>Acompanhamento das unidades de saúde geridas por OSS: financeiro (GGCCG) e produção (GMCG). Cada pessoa vê as áreas do seu perfil.</p>
        {carregando ? (
          <p className="login-status"><span className="girando" aria-hidden="true" /> Carregando dados…</p>
        ) : googleConfigurado() ? (
          <button className="botao" onClick={onEntrar}>Entrar com Google</button>
        ) : (
          <p className="login-aviso">Login com Google ainda não configurado neste ambiente.</p>
        )}
        {erro && <p className="login-erro" role="alert">{erro}</p>}
        {googleConfigurado() && !carregando && <p className="login-nota">Entre com o e-mail cadastrado no painel. Os dados só aparecem para quem tem acesso às planilhas.</p>}
      </div>
    </div>
  );
}
