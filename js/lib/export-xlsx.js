// ============================================================================
// Exportação para Excel (.xlsx) usando SheetJS (window.XLSX, carregado via
// CDN em index.html). Gera duas planilhas: Resumo e Registros detalhados.
// ============================================================================
export function exportarXlsx({ cooperativa, periodo, composicaoMedia, registros, categorias }) {
  const wb = XLSX.utils.book_new();

  const resumoRows = [
    ["Cooperativa", cooperativa?.nome ?? ""],
    ["Período", `${periodo.inicio} a ${periodo.fim}`],
    ["Gerado em", new Date().toLocaleString("pt-BR")],
    [],
    ["Categoria", "Peso (kg)", "%"],
    ...composicaoMedia.map((c) => [c.nome, Number(c.pesoKg.toFixed(2)), Number(c.pct.toFixed(1))]),
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows);
  wsResumo["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  const header = ["Data", "Responsável", "Peso total (kg)", ...categorias.map((c) => c.nome + " (kg)"), "Observações"];
  const rows = registros.map((r) => [
    r.data ?? "",
    r.responsavelNome ?? "",
    Number((r.pesoTotalAmostra ?? r.somaCategorias ?? 0).toFixed(2)),
    ...categorias.map((c) => Number((r.pesos?.[c.id] ?? 0).toFixed(2))),
    r.observacoes ?? "",
  ]);
  const wsRegistros = XLSX.utils.aoa_to_sheet([header, ...rows]);
  wsRegistros["!cols"] = [
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    ...categorias.map(() => ({ wch: 14 })),
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRegistros, "Registros");

  XLSX.writeFile(wb, `gravimetria_${periodo.inicio}_a_${periodo.fim}.xlsx`);
}
