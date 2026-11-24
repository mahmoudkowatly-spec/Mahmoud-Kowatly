/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Print-native PDF export:
 * Keeps Arabic text selectable/searchable and delegates PDF rendering to the
 * browser's print engine instead of rasterizing the entire document to canvas.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function exportElementToPdf(
  element: HTMLElement,
  fileName: string,
): Promise<void> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.style.position = "fixed";
  iframe.style.left = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0";
  iframe.style.border = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const title = escapeHtml(fileName.replace(/\.pdf$/i, ""));
  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    iframe.remove();
    throw new Error("تعذر تجهيز مستند الطباعة");
  }

  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; direction: rtl; color: #111; background: #fff; }
    body {
      font-family: Arial, Tahoma, "Segoe UI", sans-serif;
      font-size: 10pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #capture-root { width: 100%; margin: 0 auto; }
    #capture-root > div { width: 100% !important; max-width: none !important; }
    table { width: 100%; border-collapse: collapse; table-layout: auto; margin: 0 0 12px; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr, img, #capture-root > div:last-child > div:first-child {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #222;
      padding: 5px 6px;
      vertical-align: middle;
      overflow-wrap: anywhere;
    }
    th { background: #e5e7eb !important; font-weight: 700; text-align: center; }
    img { max-width: 100%; object-fit: contain; }
    #capture-root > div:last-child {
      break-before: page;
      page-break-before: always;
      margin-top: 0 !important;
    }
    #capture-root > div:nth-last-child(2) {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 16mm;
      @bottom-center {
        content: "صفحة " counter(page) " من " counter(pages);
        font-family: Arial, Tahoma, sans-serif;
        font-size: 8pt;
        color: #555;
      }
    }
    @media screen {
      body { padding: 12px; }
      #capture-root { max-width: 190mm; }
    }
  </style>
</head>
<body>
  <main id="capture-root">${element.innerHTML}</main>
</body>
</html>`);
  iframeDoc.close();

  await Promise.all([
    iframeDoc.fonts?.ready ?? Promise.resolve(),
    ...Array.from(iframeDoc.images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }),
  ]);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const printWindow = iframe.contentWindow;
  if (!printWindow) {
    iframe.remove();
    throw new Error("تعذر فتح نافذة الطباعة");
  }

  await new Promise<void>((resolve) => {
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      window.setTimeout(() => iframe.remove(), 300);
      resolve();
    };

    printWindow.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(cleanup, 120_000);
    printWindow.focus();
    printWindow.print();
  });
}
