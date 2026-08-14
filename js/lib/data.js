// ============================================================================
// Funções de acesso a dados compartilhadas entre views (evita import
// circular com app.js).
// ============================================================================
import { db, collection, getDocs, query, orderBy } from "../firebase.js";
import { state, setState } from "../state.js";

export async function recarregarCategorias() {
  if (!state.perfil) return;
  const snap = await getDocs(
    query(collection(db, "cooperativas", state.perfil.cooperativaId, "categorias"), orderBy("ordem", "asc"))
  );
  setState({ categorias: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
}

export async function carregarMembros() {
  if (!state.perfil) return [];
  const snap = await getDocs(collection(db, "cooperativas", state.perfil.cooperativaId, "membros"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
