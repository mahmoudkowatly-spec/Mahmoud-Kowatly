/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create a downloadable, multi-page A4 PDF without opening the browser print
 * dialog. html2canvas preserves the Arabic shaping and visual styling by
 * rendering the printable DOM, then jsPDF writes the pages to a named file.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  fileName: string,
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: Math.max(element.scrollWidth, element.clientWidth),
    onclone: (clonedDocument) => {
      const root = clonedDocument.querySelector<HTMLElement>("[data-pdf-export-root]");
      if (root) {
        root.style.width = "100%";
        root.style.maxWidth = "none";
        root.style.margin = "0";
        root.style.background = "#ffffff";
        root.style.color = "#111111";
        root.style.direction = "rtl";
      }
    },
  });

  if (!canvas.width || !canvas.height) {
    throw new Error("المقايسة فارغة أو تعذر تجهيز محتواها");
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 9;
  const marginTop = 10;
  const marginBottom = 13;
  const contentWidthMm = pageWidth - marginX * 2;
  const contentHeightMm = pageHeight - marginTop - marginBottom;
  const sourcePageHeight = Math.floor(canvas.width * contentHeightMm / contentWidthMm);
  const pageCount = Math.ceil(canvas.height / sourcePageHeight);

  const pageCanvas = document.createElement("canvas");
  const pageContext = pageCanvas.getContext("2d");
  if (!pageContext) throw new Error("تعذر تجهيز صفحات PDF");

  pageCanvas.width = canvas.width;
  pageCanvas.height = sourcePageHeight;

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    pageContext.fillStyle = "#ffffff";
    pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    const sourceY = pageIndex * sourcePageHeight;
    const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
    pageContext.drawImage(
      canvas,
      0, sourceY, canvas.width, sliceHeight,
      0, 0, canvas.width, sliceHeight,
    );

    if (pageIndex > 0) pdf.addPage();
    const imageData = pageCanvas.toDataURL("image/jpeg", 0.94);
    const renderedHeightMm = sliceHeight * contentWidthMm / canvas.width;
    pdf.addImage(imageData, "JPEG", marginX, marginTop, contentWidthMm, renderedHeightMm, undefined, "FAST");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Page ${pageIndex + 1} / ${pageCount}`, pageWidth - marginX, pageHeight - 5, { align: "right" });
  }

  const safeName = fileName
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\.pdf$/i, "")
    .trim() || "BOQ-Estimate";

  pdf.save(`${safeName}.pdf`);
  canvas.width = 0;
  canvas.height = 0;
  pageCanvas.width = 0;
  pageCanvas.height = 0;
}
