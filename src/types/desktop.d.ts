export {};

declare global {
  interface Window {
    boqDesktop?: {
      exportPdf(payload: { html: string; fileName: string }): Promise<{ canceled: boolean; filePath?: string }>;
      printHtml(payload: { html: string }): Promise<{ success: boolean }>;
    };
  }
}
