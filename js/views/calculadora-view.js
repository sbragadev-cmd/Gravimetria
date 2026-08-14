// ============================================================================
// Calculadora de gravimetria: informa o peso total da amostra e o peso de
// cada categoria, calcula os percentuais automaticamente e salva o registro.
// ============================================================================
import { db, collection, addDoc, serverTimestamp } from "../firebase.js";
import { state, categoriasAtivas } from "../state.js";
import { corPorCategoria } from "../lib/palette.js";
import { montarGrafico, configDoughnut } from "../lib/charts.js";

export function renderCalculadoraView(root) {
  const categorias = categoriasAtivas();
  const cores = corPorCategoria(categorias);
  const pesos = Object.fromEntries(categorias.map((c) => [c.id, 0]));
  let pesoTotalAmostra = 0;
  let salvando = false;
  let mensagem = "";

  if (categorias.length === 0) {
    root.innerHTML = `
      <div class="card empty-state">
        <h3>Nenhuma categoria cadastrada</h3>
        <p>Peça a um administrador para cadastrar as categorias de materiais em Configurações.</p>
      </div>`;
    return;
  }

  function somaCategorias() {
    return Object.values(pesos).reduce((a, b) => a + (Number(b) || 0), 0);
  }

  function paint() {
    const soma = somaCategorias();
    const diffPct = pesoTotalAmostra > 0 ? Math.abs(soma - pesoTotalAmostra) / pesoTotalAmostra * 100 : 0;
    const statusClasse = pesoTotalAmostra === 0 ? "" : diffPct > 2 ? "warn" : "ok";

    root.innerHTML = `
      <h2>Calculadora de gravimetria</h2>
      <p class="hint">Informe o peso total da amostra e o peso de cada categoria após a triagem.</p>

      <div class="grid grid-2">
        <div class="card">
          <form id="f-grav">
            <div class="field-row">
              <div class="field"><label>Data da amostra</label><input type="date" name="data" value="${new Date().toISOString().slice(0, 10)}" required /></div>
              <div class="field"><label>Peso total da amostra (kg)</label><input type="number" name="pesoTotal" step="0.01" min="0" required /></div>
            </div>

            <div>
              ${categorias
                .map(
                  (c) => `
                <div class="cat-row">
                  <span class="swatch" style="background:${cores.get(c.id)}"></span>
                  <span>${escapeHtml(c.nome)}</span>
                  <input type="number" class="peso-cat" data-id="${c.id}" step="0.01" min="0" value="0" />
                  <span class="pct" data-pct="${c.id}">0,0%</span>
                </div>`
                )
                .join("")}
            </div>

            <div class="total-row ${statusClasse}" id="total-row">
              <span>Soma das categorias</span>
              <span id="total-soma">0,00 kg</span>
            </div>
            <p class="hint" id="total-hint" style="margin-top:-6px"></p>

            <div class="field"><label>Observações (opcional)</label><textarea name="observacoes" rows="2"></textarea></div>

            ${mensagem ? `<div class="success-msg">${mensagem}</div>` : ""}
            <div class="actions">
              <button class="primary" type="submit" ${salvando ? "disabled" : ""}>${salvando ? '<span class="spinner"></span> Salvando…' : "Salvar gravimetria"}</button>
            </div>
          </form>
        </div>

        <div class="chart-card">
          <h3>Composição (prévia)</h3>
          <canvas id="preview-chart" height="240"></canvas>
          <p class="chart-legend-note">Atualiza conforme você digita os pesos.</p>
        </div>
      </div>
    `;

    const form = root.querySelector("#f-grav");
    const pesoTotalInput = form.pesoTotal;

    function atualizarPercentuaisEChart() {
      const soma = somaCategorias();
      root.querySelectorAll(".peso-cat").forEach((input) => {
        const id = input.dataset.id;
        const pct = soma > 0 ? ((Number(input.value) || 0) / soma) * 100 : 0;
        const span = root.querySelector(`[data-pct="${id}"]`);
        if (span) span.textContent = pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
      });
      root.querySelector("#total-soma").textContent =
        soma.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " kg";

      const totalRow = root.querySelector("#total-row");
      const totalHint = root.querySelector("#total-hint");
      const pesoTotal = Number(pesoTotalInput.value) || 0;
      totalRow.classList.remove("warn", "ok");
      if (pesoTotal > 0) {
        const diff = Math.abs(soma - pesoTotal);
        const diffPct2 = (diff / pesoTotal) * 100;
        if (diffPct2 > 2) {
          totalRow.classList.add("warn");
          totalHint.textContent = `⚠ A soma das categorias difere do peso total da amostra em ${diffPct2.toFixed(1)}% (${diff.toFixed(2)} kg). Confira as pesagens.`;
        } else {
          totalRow.classList.add("ok");
          totalHint.textContent = "✓ Soma confere com o peso total informado.";
        }
      } else {
        totalHint.textContent = "";
      }

      const canvas = root.querySelector("#preview-chart");
      const valores = categorias.map((c) => Number(pesos[c.id]) || 0);
      montarGrafico(canvas, configDoughnut(categorias.map((c) => c.nome), valores, categorias.map((c) => cores.get(c.id))));
    }

    root.querySelectorAll(".peso-cat").forEach((input) => {
      input.addEventListener("input", () => {
        pesos[input.dataset.id] = Number(input.value) || 0;
        atualizarPercentuaisEChart();
      });
    });
    pesoTotalInput.addEventListener("input", () => {
      pesoTotalAmostra = Number(pesoTotalInput.value) || 0;
      atualizarPercentuaisEChart();
    });

    atualizarPercentuaisEChart();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const soma = somaCategorias();
      if (soma <= 0) {
        alert("Informe o peso de pelo menos uma categoria.");
        return;
      }
      salvando = true;
      mensagem = "";
      paint();

      const fd = new FormData(form);
      const percentuais = {};
      categorias.forEach((c) => {
        percentuais[c.id] = soma > 0 ? (Number(pesos[c.id] || 0) / soma) * 100 : 0;
      });

      try {
        await addDoc(collection(db, "cooperativas", state.perfil.cooperativaId, "gravimetrias"), {
          data: fd.get("data"),
          pesoTotalAmostra: Number(fd.get("pesoTotal")) || soma,
          pesos: { ...pesos },
          percentuais,
          somaCategorias: soma,
          observacoes: fd.get("observacoes")?.trim() || "",
          categoriasSnapshot: categorias.map((c) => ({ id: c.id, nome: c.nome, cor: cores.get(c.id) })),
          responsavelUid: state.user.uid,
          responsavelNome: state.perfil.nome,
          criadoEm: serverTimestamp(),
        });
        salvando = false;
        mensagem = "Gravimetria salva com sucesso!";
        categorias.forEach((c) => (pesos[c.id] = 0));
        pesoTotalAmostra = 0;
        paint();
      } catch (err) {
        salvando = false;
        alert("Erro ao salvar: " + err.message);
        paint();
      }
    });
  }

  paint();
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}
