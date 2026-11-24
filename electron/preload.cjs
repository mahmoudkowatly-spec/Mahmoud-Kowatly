const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("boqDesktop", {
  getItems: () => ipcRenderer.invoke("boq:get-items"),
  exportPdf: (payload) => ipcRenderer.invoke("boq:export-pdf", payload),
  printHtml: (payload) => ipcRenderer.invoke("boq:print", payload)
});
