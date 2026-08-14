// ============================================================================
// Inicialização do Firebase (SDK modular v10, carregado via CDN/ESM oficial)
// ============================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  enableIndexedDbPersistence,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let firebaseConfig;
try {
  ({ firebaseConfig } = await import("./firebase-config.js"));
} catch (e) {
  console.error(
    "firebase-config.js não encontrado. Copie js/firebase-config.sample.js para js/firebase-config.js e preencha com as chaves do seu projeto Firebase (veja o README)."
  );
  document.body.innerHTML =
    '<div style="font-family:system-ui;padding:32px;max-width:560px;margin:40px auto;line-height:1.5">' +
    "<h1>Configuração do Firebase ausente</h1>" +
    "<p>Copie <code>js/firebase-config.sample.js</code> para <code>js/firebase-config.js</code> " +
    "e preencha com as credenciais do seu projeto (Console do Firebase &gt; Configurações do " +
    "projeto &gt; Seus apps). Veja o passo a passo no <code>README.md</code>.</p></div>";
  throw e;
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Persistência offline: permite pesar/lançar dados sem internet no galpão da
// cooperativa; o Firestore sincroniza automaticamente quando a conexão volta.
try {
  await enableIndexedDbPersistence(db);
} catch (err) {
  if (err.code === "failed-precondition") {
    console.warn("Persistência offline desativada: app aberto em várias abas.");
  } else if (err.code === "unimplemented") {
    console.warn("Persistência offline não suportada neste navegador.");
  }
}

export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  writeBatch,
};
