// Gráfico de barras por mês (de UMA unidade). Tooltip com valor exato. Cores seguem o tema.
import { Bar } from 'react-chartjs-2';
import { Chart } from 'chart.js';
import { corTema } from '../../hooks/useTema';
import { brl, curto, rotuloMes } from '../../utils/formatacao';

export function aplicarTemaGraficos() {
  Chart.defaults.color = corTema('--muted');
  Chart.defaults.borderColor = corTema('--grade');
  Chart.defaults.plugins.tooltip.backgroundColor = corTema('--tooltip');
  Chart.defaults.plugins.tooltip.titleColor = corTema('--texto');
  Chart.defaults.plugins.tooltip.bodyColor = corTema('--texto');
  Chart.defaults.plugins.tooltip.borderColor = corTema('--borda');
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
}

export default function GraficoMensal({ meses, series, altura = 250, corPorSinal = false, formato = brl, eixo = curto, empilhado = false }) {
  aplicarTemaGraficos();
  const data = {
    labels: meses.map(rotuloMes),
    datasets: series.map((s) => ({
      label: s.nome,
      data: s.valores,
      backgroundColor: corPorSinal ? s.valores.map((v) => corTema(v < 0 ? '--vermelho' : '--verde')) : corTema(s.cor),
      borderRadius: 4,
      maxBarThickness: 30,
      stack: empilhado ? 'a' : undefined,
    })),
  };
  const options = {
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: series.length > 1, position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3 } },
      tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${formato(c.raw)}` } },
    },
    scales: {
      x: { grid: { display: false }, stacked: empilhado },
      y: { ticks: { callback: (v) => eixo(v) }, stacked: empilhado, beginAtZero: true },
    },
  };
  return <div className="grafico" style={{ height: altura }}><Bar data={data} options={options} /></div>;
}
