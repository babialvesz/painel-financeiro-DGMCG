// Minigráfico de evolução mensal (SVG)
export default function Sparkline({ valores, largura = 84, altura = 24, cor = 'var(--acento)' }) {
  const vals = valores.filter((v) => v !== null && v !== undefined);
  if (vals.length < 2) return <span className="muted">—</span>;
  const min = Math.min(...vals), max = Math.max(...vals), amp = max - min || 1;
  const pontos = vals.map((v, i) => [(i / (vals.length - 1)) * (largura - 4) + 2, altura - 3 - ((v - min) / amp) * (altura - 6)]);
  const [ux, uy] = pontos[pontos.length - 1];
  return (
    <svg className="spark" width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} aria-hidden="true">
      <polyline points={pontos.map((p) => p.join(',')).join(' ')} fill="none" stroke={cor} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={ux} cy={uy} r="2.6" fill={cor} />
    </svg>
  );
}
