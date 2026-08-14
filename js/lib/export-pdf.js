// ============================================================================
// Exportação do relatório do painel em PDF (usa jsPDF + jspdf-autotable,
// carregados via CDN em index.html como window.jspdf).
// ============================================================================
export function exportarPdf({ cooperativa, periodo, composicaoMedia, pesoTotalGeral, numAmostras, graficoPizzaDataUrl }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let y = margin;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Relatório de Gravimetria", margin, y);
  y += 22;

  doc.setFontSize(11);
  doc.setFont(undefined, "normal");
  doc.text(cooperativa?.nome ?? "", margin, y);
  y += 16;
  if (cooperativa?.cidade || cooperativa?.estado) {
    doc.text(`${cooperativa.cidade ?? ""}${cooperativa.estado ? " - " + cooperativa.estado : ""}`, margin, y);
    y += 16;
  }
  doc.text(`Período: ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}`, margin, y);
  y += 16;
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, margin, y);
  y += 24;

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Resumo", margin, y);
  y += 18;
  doc.setFont(undefined, "normal");
  doc.setFontSize(10.5);
  doc.text(`Amostras no período: ${numAmostras}`, margin, y);
  y += 14;
  doc.text(`Peso total processado: ${formatKg(pesoTotalGeral)} kg`, margin, y);
  y += 14;
  doc.text(`Média por amostra: ${formatKg(pesoTotalGeral / numAmostras)} kg`, margin, y);
  y += 20;

  if (graficoPizzaDataUrl) {
    try {
      const imgSize = 200;
      doc.addImage(graficoPizzaDataUrl, "PNG", margin, y, imgSize, imgSize);
      y += imgSize + 16;
    } catch (e) {
      console.warn("Não foi possível inserir o gráfico no PDF:", e);
    }
  }

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Composição média por categoria", margin, y);
  y += 6;

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Categoria", "Peso (kg)", "%"]],
    body: composicaoMedia.map((c) => [c.nome, formatKg(c.pesoKg), c.pct.toFixed(1) + "%"]),
    styles: { fontSize: 9.5, cellPadding: 5 },
    headStyles: { fillColor: [27, 175, 122] },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
  });

  const nomeArquivo = `gravimetria_${periodo.inicio}_a_${periodo.fim}.pdf`;
  doc.save(nomeArquivo);
}

function formatKg(n) {
  return (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatarData(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
