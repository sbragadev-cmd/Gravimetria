// ============================================================================
// Histórico: lista as gravimetrias já registradas, com filtro por período,
// detalhe expandido por registro e exclusão (admin).
// ============================================================================
import { db, collection, getDocs, deleteDoc, doc, query, orderBy, limit as fbLimit, where } from "../firebase.js";
import { state, isAdmin } from "../state.js";

export async function renderHistoricoView(root) {
  root.innerHTML = `<p class="hint"><span class="spinner"></span> Carregando…</p>`;

  const hoje = new Date().toISOString().slice(0, 10);
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  let filtroInicio = trintaDiasAtras;
  let filtroFim = hoje;
  let registros = [];
  let expandido = null;

  async function carregar() {
    const coopId = state.perfil.cooperativaId;
    const q = query(
      collection(db, "cooperativas", coopId, "gravimetrias"),
      where("data", ">=", filtroInicio),
      where("data", "<=", filtroFim),
      orderBy("data", "desc"),
      fbLimit(300)
    );
    const snap = await getDocs(q);
    registros = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    paint();
  }

  function paint() {
    root.innerHTML = `
      <h2>Histórico de gravimetrias</h2>
      <div class="card">
        <div class="toolbar">
          <div class="field"><label>De</label><input type="date" id="f-inicio" value="${filtroInicio}" /></div>
          <div class="field"><label>Até</label><input type="date" id="f-fim" value="${filtroFim}" /></div>
          <button id="btn-filtrar">Filtrar</button>
        </div>

        ${
          registros.length === 0
            ? `<div class="empty-state">Nenhuma gravimetria encontrada nesse período.</div>`
            : `<div class="table-wrap"><table>
                <thead><tr><th>Data</th><th class="num">Peso total (kg)</th><th>Responsável</th><th>Categoria principal</th><th></th></tr></thead>
                <tbody>
                  ${registros.map((r) => linhaTabela(r)).join("")}
                </tbody>
              </table></div>`
        }
      </div>
      <div id="detalhe-root"></div>
    `;

    root.querySelector("#btn-filtrar").addEventListener("click", () => {
      filtroInicio = root.querySelector("#f-inicio").value;
      filtroFim = root.querySelector("#f-fim").value;
      carregar();
    });

    root.querySelectorAll(".btn-ver").forEach((btn) => {
      btn.addEventListener("click", () => {
        expandido = expandido === btn.dataset.id ? null : btn.dataset.id;
        renderDetalhe();
      });
    });
    root.querySelectorAll(".btn-excluir").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Excluir esta gravimetria? Esta ação não pode ser desfeita.")) return;
        await deleteDoc(doc(db, "cooperativas", state.perfil.cooperativaId, "gravimetrias", btn.dataset.id));
        registros = registros.filter((r) => r.id !== btn.dataset.id);
        paint();
      });
    });

    renderDetalhe();
  }

  function linhaTabela(r) {
    const principal = categoriaPrincipal(r);
    return `
      <tr>
        <td>${formatarData(r.data)}</td>
        <td class="num">${(r.pesoTotalAmostra ?? r.somaCategorias ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
        <td>${escapeHtml(r.responsavelNome ?? "—")}</td>
        <td>${principal ? escapeHtml(principal.nome) + " (" + principal.pct.toFixed(0) + "%)" : "—"}</td>
        <td style="white-space:nowrap">
          <button class="link btn-ver" data-id="${r.id}">${expandido === r.id ? "Ocultar" : "Detalhes"}</button>
          ${isAdmin() ? `<button class="link btn-excluir" data-id="${r.id}" style="color:var(--danger)">Excluir</button>` : ""}
        </td>
      </tr>`;
  }

  function renderDetalhe() {
    const detalheRoot = root.querySelector("#detalhe-root");
    if (!expandido) {
      detalheRoot.innerHTML = "";
      return;
    }
    const r = registros.find((x) => x.id === expandido);
    if (!r) return;
    const cats = (r.categoriasSnapshot ?? []).length
      ? r.categoriasSnapshot
      : Object.keys(r.pesos ?? {}).map((id) => ({ id, nome: id, cor: "#898781" }));

    detalheRoot.innerHTML = `
      <div class="card">
        <h3>Detalhe — ${formatarData(r.data)}</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th></th><th>Categoria</th><th class="num">Peso (kg)</th><th class="num">%</th></tr></thead>
            <tbody>
              ${cats
                .map(
                  (c) => `
                <tr>
                  <td><span class="swatch" style="background:${c.cor}"></span></td>
                  <td>${escapeHtml(c.nome)}</td>
                  <td class="num">${(r.pesos?.[c.id] ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td class="num">${(r.percentuais?.[c.id] ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 1 })}%</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
        ${r.observacoes ? `<p class="hint" style="margin-top:10px"><strong>Observações:</strong> ${escapeHtml(r.observacoes)}</p>` : ""}
      </div>
    `;
  }

  await carregar();
}

function categoriaPrincipal(r) {
  const percentuais = r.percentuais ?? {};
  const entries = Object.entries(percentuais);
  if (entries.length === 0) return null;
  const [id, pct] = entries.reduce((max, e) => (e[1] > max[1] ? e : max));
  const nomeMap = Object.fromEntries((r.categoriasSnapshot ?? []).map((c) => [c.id, c.nome]));
  return { nome: nomeMap[id] ?? id, pct };
}

function formatarData(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}
