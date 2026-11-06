// Registra só os módulos do Chart.js que o painel usa
import { Chart, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

Chart.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);
Chart.defaults.font.family = "Inter, 'Segoe UI', Roboto, Arial, sans-serif";
Chart.defaults.font.size = 12;
// cores: aplicadas a cada desenho conforme o tema (ver GraficoMensal.aplicarTemaGraficos)
