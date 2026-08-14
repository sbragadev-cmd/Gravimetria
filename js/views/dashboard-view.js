// ============================================================================
// Painel: estatísticas e gráficos agregados de um período, com exportação
// para PDF e Excel.
// ============================================================================
import { db, collection, getDocs, query, where, orderBy, limit as fbLimit } from "../firebase.js";
import { state, categoriasAtivas } from "../state.js";
import { corPorCategoria } from "../lib/palette.js";
import { montarGrafico, configDoughnut, configBarrasEmpilhadas } from "../lib/charts.js";
import { exportarPdf } from "../lib/export-pdf.js";
import { exportarXlsx } from "../lib/export-xlsx.js";

export async function renderDashboardView(root) {
  root.innerHTML = `<p class="hint"><span class="spinner"></span> Carregando…</p>`;

  const hoje = new Date().toISOString().slice(0, 10);
  const noventaDiasAtras = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  let filtroInicio = noventaDiasAtras;
  let filtroFim = hoje;
  let registros = [];

  const categorias = categoriasAtivas();
  const cores = corPorCategoria(categorias);

  async function carregar() {
    const coopId = state.perfil.cooperativaId;
    const q = query(
      collection(db, "cooperativas", coopId, "gravimetrias"),
      where("data", ">=", filtroInicio),
      where("data", "<=", filtroFim),
      orderBy("data", "asc"),
      fbLimit(1000)
    );
    const snap = await getDocs(q);
    registros = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    paint();
  }

  function agregados() {
    const somaPorCategoria = Object.fromEntries(categorias.map((c) => [c.id, 0]));
    let pesoTotalGeral = 0;
    registros.forEach((r) => {
      categorias.forEach((c) => {
        const v = Number(r.pesos?.[c.id]) || 0;
        somaPorCategoria[c.id] += v;
        pesoTotalGeral += v;
      });
    });
    const composicaoMedia = categorias.map((c) => ({
      id: c.id,
      nome: c.nome,
      cor: cores.get(c.id),
      pesoKg: somaPorCategoria[c.id],
      pct: pesoTotalGeral > 0 ? (somaPorCategoria[c.id] / pesoTotalGeral) * 100 : 0,
    }));
    return { composicaoMedia, pesoTotalGeral, numAmostras: registros.length };
  }

  function agregarPorMes() {
    const meses = {}; // "2026-08" -> { catId: peso, ... , total }
    registros.forEach((r) => {
      const mes = (r.data ?? "").slice(0, 7);
      if (!mes) return;
      if (!meses[mes]) meses[mes] = { total: 0 };
      categorias.forEach((c) => {
        const v = Number(r.pesos?.[c.id]) || 0;
        meses[mes][c.id] = (meses[mes][c.id] ?? 0) + v;
        meses[mes].total += v;
      });
    });
    const labels = Object.keys(meses).sort();
    const datasets = categorias.map((c) => ({
      label: c.nome,
      backgroundColor: cores.get(c.id),
      data: labels.map((m) => {
        const total = meses[m].total;
        const v = meses[m][c.id] ?? 0;
        return total > 0 ? (v / total) * 100 : 0;
      }),
    }));
    return { labels: labels.map(formatarMes), datasets };
  }

  function paint() {
    const { composicaoMedia, pesoTotalGeral, numAmostras } = agregados();
    const composicaoOrdenada = [...composicaoMedia].sort((a, b) => b.pesoKg - a.pesoKg);

    root.innerHTML = `
      <h2>Painel</h2>
      <div class="card">
        <div class="toolbar">
          <div class="field"><label>De</label><input type="date" id="f-inicio" value="${filtroInicio}" /></div>
          <div class="field"><label>Até</label><input type="date" id="f-fim" value="${filtroFim}" /></div>
          <button id="btn-filtrar">Filtrar</button>
          <div style="flex:1"></div>
          <button id="btn-pdf" ${numAmostras === 0 ? "disabled" : ""}>Exportar PDF</button>
          <button id="btn-xlsx" ${numAmostras === 0 ? "disabled" : ""}>Exportar Excel</button>
        </div>
      </div>

      ${
        numAmostras === 0
          ? `<div class="card empty-state">Nenhuma gravimetria registrada nesse período.</div>`
          : `
      <div class="grid grid-3">
        <div class="card stat-tile"><div class="value">${numAmostras}</div><div class="label">Amostras no período</div></div>
        <div class="card stat-tile"><div class="value">${pesoTotalGeral.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg</div><div class="label">Peso total processado</div></div>
        <div class="card stat-tile"><div class="value">${(pesoTotalGeral / numAmostras).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</div><div class="label">Média por amostra</div></div>
      </div>

      <div class="grid grid-2">
        <div class="chart-card">
          <h3>Composição média do período</h3>
          <canvas id="chart-pizza" height="240"></canvas>
        </div>
        <div class="chart-card">
          <h3>Evolução mensal por categoria</h3>
          <canvas id="chart-barras" height="240"></canvas>
        </div>
      </div>

      <div class="card">
        <h3>Composição média — tabela</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th></th><th>Categoria</th><th class="num">Peso (kg)</th><th class="num">%</th></tr></thead>
            <tbody>
              ${composicaoOrdenada
                .map(
                  (c) => `
                <tr>
                  <td><span class="swatch" style="background:${c.cor}"></span></td>
                  <td>${escapeHtml(c.nome)}</td>
                  <td class="num">${c.pesoKg.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td class="num">${c.pct.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}%</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`
      }
    `;

    root.querySelector("#btn-filtrar").addEventListener("click", () => {
      filtroInicio = root.querySelector("#f-inicio").value;
      filtroFim = root.querySelector("#f-fim").value;
      carregar();
    });

    if (numAmostras > 0) {
      const canvasPizza = root.querySelector("#chart-pizza");
      montarGrafico(
        canvasPizza,
        configDoughnut(composicaoMedia.map((c) => c.nome), composicaoMedia.map((c) => c.pesoKg), composicaoMedia.map((c) => c.cor))
      );

      const { labels, datasets } = agregarPorMes();
      const canvasBarras = root.querySelector("#chart-barras");
      montarGrafico(canvasBarras, configBarrasEmpilhadas(labels, datasets));

      root.querySelector("#btn-pdf").addEventListener("click", () => {
        exportarPdf({
          cooperativa: state.cooperativa,
          periodo: { inicio: filtroInicio, fim: filtroFim },
          composicaoMedia: composicaoOrdenada,
          pesoTotalGeral,
          numAmostras,
          graficoPizzaDataUrl: canvasPizza.toDataURL("image/png", 1.0),
        });
      });
      root.querySelector("#btn-xlsx").addEventListener("click", () => {
        exportarXlsx({
          cooperativa: state.cooperativa,
          periodo: { inicio: filtroInicio, fim: filtroFim },
          composicaoMedia: composicaoOrdenada,
          registros,
          categorias,
        });
      });
    }
  }

  await carregar();
}

function formatarMes(m) {
  const [y, mes] = m.split("-");
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${nomes[Number(mes) - 1]}/${y.slice(2)}`;
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}
