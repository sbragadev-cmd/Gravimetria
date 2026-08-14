// ============================================================================
// Tela de autenticação: entrar, criar cooperativa (admin) ou entrar em
// cooperativa existente com código de convite (operador).
// ============================================================================
import {
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  writeBatch,
} from "../firebase.js";
import { CATEGORICAL } from "../lib/palette.js";

const DEFAULT_CATEGORIAS = [
  "Papel",
  "Papelão",
  "Plástico",
  "Vidro",
  "Metal",
  "Alumínio",
  "Longa Vida (Tetra Pak)",
  "Rejeito",
];

function gerarCodigoConvite() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem caracteres ambíguos
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function renderAuthView(root) {
  let mode = "login"; // login | criar | entrar
  let loading = false;
  let errorMsg = "";
  let successMsg = "";

  function paint() {
    root.innerHTML = `
      <div class="auth-wrap">
        <div class="card auth-card">
          <div class="auth-logo">
            <img src="icons/icon-192.png" alt="" />
            <div>
              <h1>Gravimetria Cooperativa</h1>
              <p class="hint" style="margin:0">Cálculo e histórico da composição gravimétrica</p>
            </div>
          </div>

          <div class="auth-switch">
            <button data-mode="login" class="${mode === "login" ? "active" : ""}">Entrar</button>
            <button data-mode="entrar" class="${mode === "entrar" ? "active" : ""}">Entrar na cooperativa</button>
            <button data-mode="criar" class="${mode === "criar" ? "active" : ""}">Criar cooperativa</button>
          </div>

          ${errorMsg ? `<div class="error-msg">${errorMsg}</div>` : ""}
          ${successMsg ? `<div class="success-msg">${successMsg}</div>` : ""}

          <div id="auth-form"></div>
        </div>
      </div>
    `;

    root.querySelectorAll(".auth-switch button").forEach((btn) => {
      btn.addEventListener("click", () => {
        mode = btn.dataset.mode;
        errorMsg = "";
        successMsg = "";
        paint();
      });
    });

    const formRoot = document.getElementById("auth-form");
    if (mode === "login") paintLogin(formRoot);
    if (mode === "entrar") paintEntrar(formRoot);
    if (mode === "criar") paintCriar(formRoot);
  }

  function paintLogin(el) {
    el.innerHTML = `
      <form id="f-login">
        <div class="field"><label>E-mail</label><input type="email" name="email" required autocomplete="username" /></div>
        <div class="field"><label>Senha</label><input type="password" name="senha" required autocomplete="current-password" /></div>
        <button class="primary" type="submit" ${loading ? "disabled" : ""}>${loading ? '<span class="spinner"></span> Entrando…' : "Entrar"}</button>
      </form>
    `;
    el.querySelector("#f-login").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      loading = true; errorMsg = ""; paint();
      try {
        await signInWithEmailAndPassword(auth, fd.get("email").trim(), fd.get("senha"));
      } catch (err) {
        loading = false;
        errorMsg = traduzErro(err);
        paint();
      }
    });
  }

  function paintEntrar(el) {
    el.innerHTML = `
      <p class="hint">Peça o código de convite ao administrador da sua cooperativa.</p>
      <form id="f-entrar">
        <div class="field"><label>Código de convite</label><input name="codigo" required maxlength="6" style="text-transform:uppercase" /></div>
        <div class="field"><label>Seu nome</label><input name="nome" required /></div>
        <div class="field"><label>E-mail</label><input type="email" name="email" required autocomplete="username" /></div>
        <div class="field"><label>Senha (mín. 6 caracteres)</label><input type="password" name="senha" required minlength="6" autocomplete="new-password" /></div>
        <button class="primary" type="submit" ${loading ? "disabled" : ""}>${loading ? '<span class="spinner"></span> Entrando…' : "Entrar na cooperativa"}</button>
      </form>
    `;
    el.querySelector("#f-entrar").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      loading = true; errorMsg = ""; paint();
      try {
        const codigo = fd.get("codigo").trim().toUpperCase();
        const conviteSnap = await getDoc(doc(db, "convites", codigo));
        if (!conviteSnap.exists() || conviteSnap.data().ativo === false) {
          throw { code: "app/codigo-invalido" };
        }
        const cooperativaId = conviteSnap.data().cooperativaId;
        const nome = fd.get("nome").trim();
        const email = fd.get("email").trim();
        const cred = await createUserWithEmailAndPassword(auth, email, fd.get("senha"));

        await setDoc(doc(db, "usuarios", cred.user.uid), {
          nome, email, cooperativaId, papel: "operador",
          codigoConviteUsado: codigo, criadoEm: serverTimestamp(),
        });
        await setDoc(doc(db, "cooperativas", cooperativaId, "membros", cred.user.uid), {
          nome, email, papel: "operador",
          codigoConviteUsado: codigo, criadoEm: serverTimestamp(),
        });
      } catch (err) {
        loading = false;
        errorMsg = traduzErro(err);
        paint();
      }
    });
  }

  function paintCriar(el) {
    el.innerHTML = `
      <form id="f-criar">
        <div class="field"><label>Nome da cooperativa</label><input name="coopNome" required /></div>
        <div class="field-row">
          <div class="field"><label>Cidade</label><input name="cidade" /></div>
          <div class="field"><label>Estado (UF)</label><input name="estado" maxlength="2" style="text-transform:uppercase" /></div>
        </div>
        <hr style="border:none;border-top:1px solid var(--gridline);margin:4px 0" />
        <p class="hint" style="margin:0">Sua conta de administrador:</p>
        <div class="field"><label>Seu nome</label><input name="nome" required /></div>
        <div class="field"><label>E-mail</label><input type="email" name="email" required autocomplete="username" /></div>
        <div class="field"><label>Senha (mín. 6 caracteres)</label><input type="password" name="senha" required minlength="6" autocomplete="new-password" /></div>
        <button class="primary" type="submit" ${loading ? "disabled" : ""}>${loading ? '<span class="spinner"></span> Criando…' : "Criar cooperativa"}</button>
      </form>
    `;
    el.querySelector("#f-criar").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      loading = true; errorMsg = ""; paint();
      try {
        const nome = fd.get("nome").trim();
        const email = fd.get("email").trim();
        const cred = await createUserWithEmailAndPassword(auth, email, fd.get("senha"));

        const coopRef = await addDoc(collection(db, "cooperativas"), {
          nome: fd.get("coopNome").trim(),
          cidade: fd.get("cidade").trim(),
          estado: fd.get("estado").trim().toUpperCase(),
          criadoPor: cred.user.uid,
          criadoEm: serverTimestamp(),
        });

        // Cria o perfil e o vínculo de admin ANTES de outras escritas na
        // cooperativa: as regras de segurança usam usuarios/{uid} para
        // confirmar que este usuário é admin desta cooperativa.
        await setDoc(doc(db, "usuarios", cred.user.uid), {
          nome, email, cooperativaId: coopRef.id, papel: "admin", criadoEm: serverTimestamp(),
        });
        await setDoc(doc(db, "cooperativas", coopRef.id, "membros", cred.user.uid), {
          nome, email, papel: "admin", criadoEm: serverTimestamp(),
        });

        const codigo = gerarCodigoConvite();
        await setDoc(doc(db, "convites", codigo), { cooperativaId: coopRef.id, ativo: true });
        await updateDoc(doc(db, "cooperativas", coopRef.id), { codigoConvite: codigo });

        const batch = writeBatch(db);
        DEFAULT_CATEGORIAS.forEach((catNome, i) => {
          const ref = doc(collection(db, "cooperativas", coopRef.id, "categorias"));
          batch.set(ref, {
            nome: catNome,
            cor: CATEGORICAL[i] ?? "#898781",
            ordem: i,
            ativo: true,
            criadoEm: serverTimestamp(),
          });
        });
        await batch.commit();
      } catch (err) {
        loading = false;
        errorMsg = traduzErro(err);
        paint();
      }
    });
  }

  paint();
}

function traduzErro(err) {
  const map = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "app/codigo-invalido": "Código de convite inválido. Confira com o administrador da cooperativa.",
  };
  return map[err?.code] || "Ocorreu um erro. Tente novamente. (" + (err?.message ?? err) + ")";
}
