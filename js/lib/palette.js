// ============================================================================
// Paleta categórica validada (ordem fixa — ver skill de dataviz).
// 8 slots que passam nos testes de daltonismo/contraste em modo claro.
// Categorias além da 8ª entram em "Outros" nos gráficos (mas continuam
// listadas normalmente nas tabelas, histórico e exportações).
// ============================================================================

export const CATEGORICAL = [
  "#2a78d6", // 1 azul
  "#eb6834", // 2 laranja
  "#1baf7a", // 3 água
  "#eda100", // 4 amarelo
  "#e87ba4", // 5 magenta
  "#008300", // 6 verde
  "#4a3aa7", // 7 violeta
  "#e34948", // 8 vermelho
];

export const OUTROS_COR = "#898781"; // muted (mesmo tom usado para eixos/labels)

export const CHROME = {
  surface: "#fcfcfb",
  textPrimary: "#0b0b0b",
  textSecondary: "#52514e",
  muted: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
};

/**
 * Recebe a lista ordenada de categorias ativas e devolve um Map
 * categoriaId -> cor, atribuindo os 8 slots fixos em ordem e reaproveitando
 * o cinza neutro para qualquer categoria além da 8ª.
 */
export function corPorCategoria(categorias) {
  const map = new Map();
  categorias.forEach((cat, i) => {
    map.set(cat.id, i < CATEGORICAL.length ? CATEGORICAL[i] : OUTROS_COR);
  });
  return map;
}
