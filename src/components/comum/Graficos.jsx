// Minigráficos em SVG no estilo do painel
import { useId } from 'react';

/** Linha com área em degradê e pontos (como nos cards do modelo). */
export function AreaSpark({ valores, cor = 'var(--acento)', altura = 70, rotulos = [] }) {
  const id = useId().replace(/:/g, '');
  const vals = valores.map((v) => v ?? 0);
  if (vals.length < 2) return <div style={{ height: altura }} />;
  const L = 300, max = Math.max(...vals, 1), min = Math.min(...vals, 0), amp = max - min || 1;
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * (L - 12) + 6, altura - 8 - ((v - min) / amp) * (altura - 18)]);
  const linha = pts.map((p) => p.join(',')).join(' ');
  return (
    <svg className="area-spark" viewBox={`0 0 ${L} ${altura}`} preserveAspectRatio="none" height={altura} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pts[0][0]},${altura} ${linha} ${pts[pts.length - 1][0]},${altura}`} fill={`url(#${id})`} />
      <polyline points={linha} fill="none" stroke={cor} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.2" fill="var(--card)" stroke={cor} strokeWidth="1.6" vectorEffect="non-scaling-stroke">
          {rotulos[i] && <title>{rotulos[i]}</title>}
        </circle>
      ))}
    </svg>
  );
}

/** Anel de progresso (medidor). */
export function Anel({ valor, tamanho = 120, espessura = 10, cor = 'var(--acento)', children }) {
  const r = (tamanho - espessura) / 2, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, valor || 0));
  return (
    <div className="anel" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} aria-hidden="true">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="var(--trilho)" strokeWidth={espessura} />
        {v > 0 && <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`} transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`} />}
      </svg>
      <div className="anel-centro">{children}</div>
    </div>
  );
}

/** Barra de progresso simples. */
export function Progresso({ valor, cor = 'var(--acento)' }) {
  return (
    <span className="progresso" aria-hidden="true">
      <span style={{ width: `${Math.max(0, Math.min(1, valor || 0)) * 100}%`, background: cor }} />
    </span>
  );
}

/** Barrinhas mensais vermelho/verde do resultado (cards de unidade). */
export function BarrasResultado({ valores, altura = 34 }) {
  const max = Math.max(1, ...valores.map((v) => Math.abs(v ?? 0)));
  const meio = altura / 2, w = 100 / Math.max(valores.length, 1);
  return (
    <svg className="barras-resultado" viewBox={`0 0 100 ${altura}`} preserveAspectRatio="none" height={altura} aria-hidden="true">
      <line x1="0" x2="100" y1={meio} y2={meio} stroke="var(--borda)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      {valores.map((v, i) => {
        if (v === null) return <rect key={i} x={i * w + w * 0.2} width={w * 0.6} y={meio - 1} height={2} fill="var(--trilho)" />;
        const h = Math.max(1.5, (Math.abs(v) / max) * (meio - 2));
        return <rect key={i} x={i * w + w * 0.2} width={w * 0.6} y={v < 0 ? meio : meio - h} height={h} rx="0.8" fill={v < 0 ? 'var(--vermelho)' : 'var(--verde)'} />;
      })}
    </svg>
  );
}
