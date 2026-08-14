// ============================================================================
// Bootstrap da aplicação: autenticação, roteamento por hash e casca (shell).
// ============================================================================
import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "./firebase.js";
import { state, setState, subscribe, isAdmin } from "./state.js";

import { renderAuthView } from "./views/auth-view.js";
import { renderCalculadoraView } from "./views/calculadora-view.js";
import { renderHistoricoView } from "./views/historico-view.js";
import { renderDashboardView } from "./views/dashboard-view.js";
import { renderConfigView } from "./views/config-view.js";

const appEl = document.getElementById("app");

const ROUTES = {
  calculadora: { label: "Calculadora", render: renderCalculadoraView, adminOnly: false },
  historico: { label: "Histórico", render: renderHistoricoView, adminOnly: false },
  dashboard: { label: "Painel", render: renderDashboardView, adminOnly: false },
  config: { label: "Configurações", render: renderConfigView, adminOnly: true },
};

function currentRoute() {
  const hash = (location.hash || "#calculadora").replace("#", "");
  return ROUTES[hash] ? hash : "calculadora";
}

async function carregarPerfilECooperativa(user) {
  const perfilSnap = await getDoc(doc(db, "usuarios", user.uid));
  if (!perfilSnap.exists()) {
    // Conta criada no Auth mas sem doc de perfil (fluxo interrompido) — desloga.
    await signOut(auth);
    setState({ user: null, perfil: null, cooperativa: null, categorias: [], authReady: true });
    return;
  }
  const perfil = { id: perfilSnap.id, ...perfilSnap.data() };
  const coopSnap = await getDoc(doc(db, "cooperativas", perfil.cooperativaId));
  const cooperativa = coopSnap.exists() ? { id: coopSnap.id, ...coopSnap.data() } : null;

  const catsSnap = await getDocs(
    query(collection(db, "cooperativas", perfil.cooperativaId, "categorias"), orderBy("ordem", "asc"))
  );
  const categorias = catsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  setState({ user, perfil, cooperativa, categorias, authReady: true });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    setState({ user: null, perfil: null, cooperativa: null, categorias: [], authReady: true });
    return;
  }
  try {
    await carregarPerfilECooperativa(user);
  } catch (err) {
    console.error("Erro ao carregar perfil:", err);
    setState({ authReady: true });
  }
});

function renderShell() {
  const route = currentRoute();
  const routeDef = ROUTES[route];

  const tabs = Object.entries(ROUTES)
    .filter(([, def]) => !def.adminOnly || isAdmin())
    .map(
      ([key, def]) =>
        `<button data-route="${key}" class="${key === route ? "active" : ""}">${def.label}</button>`
    )
    .join("");

  appEl.innerHTML = `
    <div class="topbar">
      <div class="brand">
        <img src="icons/icon-192.png" alt="" />
        <div>
          <div>Gravimetria</div>
          <div class="coop-name">${escapeHtml(state.cooperativa?.nome ?? "")}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="badge ${isAdmin() ? "admin" : ""}">${isAdmin() ? "Administrador" : "Operador"}</span>
        <button id="btn-sair">Sair</button>
      </div>
    </div>
    <nav class="tabs">${tabs}</nav>
    <main id="view-root"></main>
    <footer class="appfooter">Gravimetria Cooperativa · dados armazenados no Firebase</footer>
  `;

  appEl.querySelectorAll("nav.tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      location.hash = "#" + btn.dataset.route;
    });
  });
  document.getElementById("btn-sair").addEventListener("click", async () => {
    await signOut(auth);
    location.hash = "";
  });

  const viewRoot = document.getElementById("view-root");
  routeDef.render(viewRoot);
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

function render() {
  if (!state.authReady) {
    appEl.innerHTML = '<p style="text-align:center;padding:48px;color:#898781">Carregando…</p>';
    return;
  }
  if (!state.user || !state.perfil) {
    renderAuthView(appEl);
    return;
  }
  renderShell();
}

subscribe(render);
window.addEventListener("hashchange", render);
render();
