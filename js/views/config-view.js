// ============================================================================
// Configurações (somente admin): dados da cooperativa, código de convite,
// categorias de materiais e equipe.
// ============================================================================
import {
  db,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "../firebase.js";
import { state, setState } from "../state.js";
import { recarregarCategorias, carregarMembros } from "../lib/data.js";
import { CATEGORICAL } from "../lib/palette.js";

function gerarCodigoConvite() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function renderConfigView(root) {
  root.innerHTML = `<p class="hint"><span class="spinner"></span> Carregando…</p>`;
  const membros = await carregarMembros();
  paint(root, membros);
}

function paint(root, membros) {
  const coop = state.cooperativa;
  const categorias = [...state.categorias].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  root.innerHTML = `
    <h2>Configurações</h2>
    <p class="hint">Gerencie os dados da cooperativa, categorias de materiais e equipe.</p>

    <div class="card">
      <h3>Dados da cooperativa</h3>
      <form id="f-coop" class="field-row" style="margin-top:10px">
        <div class="field"><label>Nome</label><input name="nome" value="${escAttr(coop?.nome)}" required /></div>
        <div class="field"><label>Cidade</label><input name="cidade" value="${escAttr(coop?.cidade)}" /></div>
        <div class="field" style="max-width:100px"><label>UF</label><input name="estado" maxlength="2" value="${escAttr(coop?.estado)}" style="text-transform:uppercase" /></div>
        <div class="field" style="align-self:flex-end"><button class="primary" type="submit">Salvar</button></div>
      </form>
    </div>

    <div class="card">
      <h3>Código de convite</h3>
      <p class="hint">Compartilhe este código com novos funcionários para que criem sua conta em "Entrar na cooperativa".</p>
      <div style="display:flex;align-items:center;gap:14px">
        <span style="font-family:monospace;font-size:1.6rem;letter-spacing:0.15em;font-weight:700">${escapeHtml(coop?.codigoConvite ?? "—")}</span>
        <button id="btn-novo-codigo">Gerar novo código</button>
      </div>
    </div>

    <div class="card">
      <h3>Categorias de materiais</h3>
      <p class="hint">A ordem define a posição na calculadora e nos gráficos. As 8 primeiras categorias ativas recebem cores próprias; a partir da 9ª entram agrupadas como "Outros" nos gráficos.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th></th><th>Categoria</th><th></th><th></th></tr></thead>
          <tbody id="cat-tbody">
            ${categorias
              .map(
                (c, i) => `
              <tr data-id="${c.id}" style="${c.ativo === false ? "opacity:.5" : ""}">
                <td><span class="swatch" style="background:${c.cor || "#898781"}"></span></td>
                <td>
                  <input class="cat-nome-input" data-id="${c.id}" value="${escAttr(c.nome)}" style="border:none;background:transparent;padding:2px 0" />
                </td>
                <td style="white-space:nowrap">
                  <button class="link btn-mover" data-id="${c.id}" data-dir="-1" title="Mover para cima" ${i === 0 ? "disabled" : ""}>↑</button>
                  <button class="link btn-mover" data-id="${c.id}" data-dir="1" title="Mover para baixo" ${i === categorias.length - 1 ? "disabled" : ""}>↓</button>
                </td>
                <td style="white-space:nowrap">
                  <button class="link btn-toggle-ativo" data-id="${c.id}">${c.ativo === false ? "Reativar" : "Desativar"}</button>
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <form id="f-nova-cat" class="field-row" style="margin-top:14px">
        <div class="field"><label>Nova categoria</label><input name="nome" placeholder="Ex.: Papelão misto" required /></div>
        <div class="field" style="align-self:flex-end"><button class="primary" type="submit">Adicionar</button></div>
      </form>
    </div>

    <div class="card">
      <h3>Equipe (${membros.length})</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th></tr></thead>
          <tbody>
            ${membros
              .map(
                (m) => `
              <tr>
                <td>${escapeHtml(m.nome)}</td>
                <td>${escapeHtml(m.email)}</td>
                <td><span class="badge ${m.papel === "admin" ? "admin" : ""}">${m.papel === "admin" ? "Administrador" : "Operador"}</span></td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  root.querySelector("#f-coop").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const coopRef = doc(db, "cooperativas", coop.id);
    const dados = {
      nome: fd.get("nome").trim(),
      cidade: fd.get("cidade").trim(),
      estado: fd.get("estado").trim().toUpperCase(),
    };
    await updateDoc(coopRef, dados);
    setState({ cooperativa: { ...coop, ...dados } });
  });

  root.querySelector("#btn-novo-codigo").addEventListener("click", async () => {
    if (!confirm("Gerar um novo código invalida o código atual. Continuar?")) return;
    const novoCodigo = gerarCodigoConvite();
    await setDoc(doc(db, "convites", novoCodigo), { cooperativaId: coop.id, ativo: true });
    if (coop.codigoConvite) {
      await updateDoc(doc(db, "convites", coop.codigoConvite), { ativo: false }).catch(() => {});
    }
    await updateDoc(doc(db, "cooperativas", coop.id), { codigoConvite: novoCodigo });
    setState({ cooperativa: { ...coop, codigoConvite: novoCodigo } });
  });

  root.querySelectorAll(".cat-nome-input").forEach((input) => {
    input.addEventListener("change", async () => {
      await updateDoc(doc(db, "cooperativas", coop.id, "categorias", input.dataset.id), {
        nome: input.value.trim(),
      });
      await recarregarCategorias();
    });
  });

  root.querySelectorAll(".btn-toggle-ativo").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const cat = state.categorias.find((c) => c.id === btn.dataset.id);
      await updateDoc(doc(db, "cooperativas", coop.id, "categorias", btn.dataset.id), {
        ativo: cat.ativo === false,
      });
      await recarregarCategorias();
      paint(root, membros);
    });
  });

  root.querySelectorAll(".btn-mover").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const dir = Number(btn.dataset.dir);
      const ordenadas = [...state.categorias].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
      const idx = ordenadas.findIndex((c) => c.id === id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= ordenadas.length) return;
      const a = ordenadas[idx], b = ordenadas[swapIdx];
      await updateDoc(doc(db, "cooperativas", coop.id, "categorias", a.id), { ordem: b.ordem ?? swapIdx });
      await updateDoc(doc(db, "cooperativas", coop.id, "categorias", b.id), { ordem: a.ordem ?? idx });
      await recarregarCategorias();
      paint(root, membros);
    });
  });

  root.querySelector("#f-nova-cat").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const ordem = state.categorias.length;
    await addDoc(collection(db, "cooperativas", coop.id, "categorias"), {
      nome: fd.get("nome").trim(),
      cor: CATEGORICAL[ordem % CATEGORICAL.length],
      ordem,
      ativo: true,
      criadoEm: serverTimestamp(),
    });
    await recarregarCategorias();
    paint(root, membros);
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}
function escAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}
