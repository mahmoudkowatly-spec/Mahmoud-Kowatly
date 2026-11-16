/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportElementToPdf(
  element: HTMLElement,
  fileName: string,
): Promise<{ blob: Blob; download: () => void }> {
  // Create an invisible, isolated iframe to host the print DOM without parent Tailwind oklch styles
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "820px";
  iframe.style.height = "auto";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error("Could not create isolated rendering frame");

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", Arial, sans-serif;
            background-color: #ffffff;
            color: #000000;
            direction: rtl;
          }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th, td { border: 1px solid #000000; padding: 6px 8px; font-size: 11px; }
          th { background-color: #d9d9d9; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <div id="capture-root">
          ${element.innerHTML}
        </div>
      </body>
      </html>
    `);
    iframeDoc.close();

    // Allow iframe a brief moment to finish layout
    await new Promise((r) => setTimeout(r, 120));

    const targetEl = iframeDoc.getElementById("capture-root") || iframeDoc.body;

    const canvas = await html2canvas(targetEl, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 820,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;
    const pageUsableHeight = pageHeight - margin * 2;

    let heightLeft = contentHeight;
    let position = margin;

    // Page 1
    pdf.addImage(imgData, "PNG", margin, position, contentWidth, contentHeight, undefined, "FAST");
    heightLeft -= pageUsableHeight;

    // Additional pages if needed
    let pageNumber = 1;
    while (heightLeft > 5) {
      pdf.addPage();
      pageNumber++;
      position = margin - (pageNumber - 1) * pageUsableHeight;
      pdf.addImage(imgData, "PNG", margin, position, contentWidth, contentHeight, undefined, "FAST");
      heightLeft -= pageUsableHeight;
    }

    const blob = pdf.output("blob");

    const download = () => {
      pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
    };

    return { blob, download };
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}
