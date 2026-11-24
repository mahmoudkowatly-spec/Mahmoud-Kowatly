const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

const isDev = !app.isPackaged;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:3000");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), "dist", "index.html"));
  }
}

async function buildPrintDocument(html) {
  let bundledStyles = "";
  try {
    const assetsDir = path.join(app.getAppPath(), "dist", "assets");
    const files = await fs.readdir(assetsDir);
    const cssFiles = files.filter((file) => file.endsWith(".css"));
    const css = await Promise.all(cssFiles.map((file) => fs.readFile(path.join(assetsDir, file), "utf8")));
    bundledStyles = css.map((content) => `<style>${content}</style>`).join("\\n");
  } catch {
    // Development mode may not have a production CSS bundle.
  }

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BOQ Pro</title>
${bundledStyles}
<style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;direction:rtl;color:#111;background:#fff}
body{font-family:Arial,Tahoma,"Segoe UI",sans-serif;font-size:10pt;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
#capture-root{width:100%;margin:0 auto}
#capture-root>div{width:100%!important;max-width:none!important}
table{width:100%;border-collapse:collapse;table-layout:auto;margin:0 0 12px}
thead{display:table-header-group}
tr,img{break-inside:avoid;page-break-inside:avoid}
th,td{border:1px solid #222;padding:5px 6px;vertical-align:middle;overflow-wrap:anywhere}
th{background:#e5e7eb!important;font-weight:700;text-align:center}
img{max-width:100%;object-fit:contain}
#capture-root>div>div:last-child{break-before:page;page-break-before:always;margin-top:0!important}
@page{size:A4 portrait;margin:12mm 10mm 16mm}
</style>
</head>
<body><main id="capture-root">${html}</main></body>
</html>`;
}

ipcMain.handle("boq:get-items", async () => {
  const itemsPath = app.isPackaged
    ? path.join(app.getAppPath(), "dist", "data", "items.json")
    : path.join(__dirname, "..", "public", "data", "items.json");
  const raw = await fs.readFile(itemsPath, "utf8");
  const items = JSON.parse(raw);
  if (!Array.isArray(items)) throw new Error("قاعدة الأسعار غير صالحة");
  return items;
});

ipcMain.handle("boq:export-pdf", async (_event, payload) => {
  if (!payload || typeof payload.html !== "string" || typeof payload.fileName !== "string") {
    throw new Error("بيانات ملف PDF غير صالحة");
  }
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "حفظ المقايسة بصيغة PDF",
    defaultPath: payload.fileName.toLowerCase().endsWith(".pdf") ? payload.fileName : payload.fileName + ".pdf",
    filters: [{ name: "PDF", extensions: ["pdf"] }]
  });
  if (canceled || !filePath) return { canceled: true };

  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  try {
    await pdfWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(await buildPrintDocument(payload.html)));
    await pdfWindow.webContents.executeJavaScript("document.fonts.ready");
    const buffer = await pdfWindow.webContents.printToPDF({
      pageSize: "A4",
      printBackground: true,
      margins: { top: 0.47, bottom: 0.63, left: 0.39, right: 0.39 },
      preferCSSPageSize: true
    });
    await fs.writeFile(filePath, buffer);
    return { canceled: false, filePath };
  } finally {
    if (!pdfWindow.isDestroyed()) pdfWindow.destroy();
  }
});

ipcMain.handle("boq:print", async (_event, payload) => {
  if (!payload || typeof payload.html !== "string") throw new Error("محتوى الطباعة غير صالح");
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  await printWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(await buildPrintDocument(payload.html)));
  return new Promise((resolve, reject) => {
    printWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
      if (!printWindow.isDestroyed()) printWindow.destroy();
      if (success) resolve({ success: true });
      else reject(new Error(failureReason || "تعذرت الطباعة"));
    });
  });
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
