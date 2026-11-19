// "?" com explicação em linguagem simples (aparece ao passar o mouse ou tocar)
// O balão só existe na tela quando está aberto e é empurrado para dentro da tela se for vazar pela borda.
import { useLayoutEffect, useRef, useState } from 'react';

export default function Ajuda({ texto }) {
  const [aberto, setAberto] = useState(false);
  const [desloca, setDesloca] = useState(0);
  const balao = useRef(null);

  useLayoutEffect(() => {
    if (!aberto || !balao.current) { setDesloca(0); return; }
    const r = balao.current.getBoundingClientRect();
    const margem = 12, vw = document.documentElement.clientWidth;
    if (r.right > vw - margem) setDesloca((d) => d - (r.right - (vw - margem)));
    else if (r.left < margem) setDesloca((d) => d + (margem - r.left));
  }, [aberto]);

  return (
    <span className="ajuda" tabIndex={0} role="note" aria-label={texto}
      onMouseEnter={() => setAberto(true)} onMouseLeave={() => setAberto(false)}
      onFocus={() => setAberto(true)} onBlur={() => setAberto(false)}>
      ?
      {aberto && <span ref={balao} className="ajuda-balao" aria-hidden="true" style={desloca ? { transform: `translateX(calc(-50% + ${desloca}px))` } : undefined}>{texto}</span>}
    </span>
  );
}
