// ============================================================================
// Estado global simples da aplicação (sem framework — apenas um objeto
// observável básico com pub/sub para os módulos de view reagirem a mudanças).
// ============================================================================

const listeners = new Set();

export const state = {
  authReady: false,
  user: null, // objeto do Firebase Auth
  perfil: null, // doc usuarios/{uid}: { nome, email, cooperativaId, papel }
  cooperativa: null, // doc cooperativas/{id}: { nome, cidade, estado, codigoConvite }
  categorias: [], // array de { id, nome, cor, ordem, ativo }
};

export function setState(partial) {
  Object.assign(state, partial);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isAdmin() {
  return state.perfil?.papel === "admin";
}

export function categoriasAtivas() {
  return state.categorias
    .filter((c) => c.ativo !== false)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}
