// ============================================================================
// Helpers para configurar gráficos Chart.js seguindo a paleta e o "chrome"
// (cores de eixo/grade/texto) definidos em lib/palette.js.
// ============================================================================
import { CHROME } from "./palette.js";

Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', sans-serif";
Chart.defaults.color = CHROME.textSecondary;
Chart.defaults.borderColor = CHROME.gridline;

export function configDoughnut(labels, valores, cores) {
  return {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: valores,
          backgroundColor: cores,
          borderColor: CHROME.surface,
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { color: CHROME.textPrimary, boxWidth: 12, padding: 12 } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : "0.0";
              return `${ctx.label}: ${ctx.parsed.toFixed(2)} kg (${pct}%)`;
            },
          },
        },
      },
    },
  };
}

export function configBarrasEmpilhadas(labels, datasets) {
  return {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: CHROME.muted } },
        y: {
          stacked: true,
          grid: { color: CHROME.gridline },
          ticks: { color: CHROME.muted },
          title: { display: true, text: "%", color: CHROME.muted },
        },
      },
      plugins: {
        legend: { position: "bottom", labels: { color: CHROME.textPrimary, boxWidth: 12, padding: 12 } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`,
          },
        },
      },
    },
  };
}

const chartInstances = new Map();

export function montarGrafico(canvas, config) {
  const existing = chartInstances.get(canvas);
  if (existing) existing.destroy();
  const chart = new Chart(canvas, config);
  chartInstances.set(canvas, chart);
  return chart;
}
