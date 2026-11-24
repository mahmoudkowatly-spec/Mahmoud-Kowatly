const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const vite = spawn(npm, ["run", "dev", "--", "--host", "127.0.0.1"], { stdio: "inherit", shell: process.platform === "win32" });
let electron;

function waitForVite() {
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      const req = http.get("http://127.0.0.1:3000", (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - started > 60000) {
          console.error("Vite server did not start within 60 seconds.");
          process.exit(1);
        } else setTimeout(check, 500);
      });
    };
    check();
  });
}

waitForVite().then(() => {
  const electronCommand = path.join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");
  electron = spawn(electronCommand, ["."], {
    stdio: "inherit",
    env: { ...process.env, BOQ_DESKTOP_DEV: "1" },
    shell: process.platform === "win32"
  });
  electron.on("exit", (code) => {
    vite.kill();
    process.exit(code ?? 0);
  });
});

function shutdown() {
  vite.kill();
  if (electron) electron.kill();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
