import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sourcePath = "assets/images/hero-coffee-business-v2-source.png";
const outputs = [
  { path: "assets/images/hero-coffee-business-v2.webp", width: 2560, height: 1440, mime: "image/webp", quality: 0.92 },
  { path: "assets/images/hero-coffee-business-v2.jpg", width: 2560, height: 1440, mime: "image/jpeg", quality: 0.92 },
  { path: "assets/images/hero-coffee-business-v2-1280.webp", width: 1280, height: 720, mime: "image/webp", quality: 0.9 },
  { path: "assets/images/hero-coffee-business-v2-1280.jpg", width: 1280, height: 720, mime: "image/jpeg", quality: 0.9 }
];

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profilePath = await mkdtemp(join(tmpdir(), "home-hero-v2-"));
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-debugging-port=0",
  `--user-data-dir=${profilePath}`,
  "about:blank"
], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });

try {
  const browserWs = await new Promise((resolve, reject) => {
    let stderr = "";
    const timeout = setTimeout(() => reject(new Error("Chrome DevTools timeout")), 15000);
    chrome.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
    chrome.once("exit", (code) => reject(new Error(`Chrome exited with ${code}`)));
  });

  const debugPort = new URL(browserWs).port;
  const target = await fetch(`http://127.0.0.1:${debugPort}/json/new`, { method: "PUT" }).then((response) => response.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let requestId = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send("Runtime.enable");
  const source = await readFile(sourcePath);
  const sourceUrl = `data:image/png;base64,${source.toString("base64")}`;

  for (const output of outputs) {
    const expression = `(async () => {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = ${JSON.stringify(sourceUrl)};
      });
      const canvas = document.createElement("canvas");
      canvas.width = ${output.width};
      canvas.height = ${output.height};
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      const sourceRatio = image.naturalWidth / image.naturalHeight;
      const targetRatio = canvas.width / canvas.height;
      let sx = 0;
      let sy = 0;
      let sw = image.naturalWidth;
      let sh = image.naturalHeight;
      if (sourceRatio > targetRatio) {
        sw = Math.round(sh * targetRatio);
        sx = Math.round((image.naturalWidth - sw) / 2);
      } else {
        sh = Math.round(sw / targetRatio);
        sy = Math.round((image.naturalHeight - sh) / 2);
      }
      context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL(${JSON.stringify(output.mime)}, ${output.quality});
    })()`;
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    const encoded = result.result.value.replace(/^data:[^;]+;base64,/, "");
    await writeFile(output.path, Buffer.from(encoded, "base64"));
    const metadata = await stat(output.path);
    console.log(`${output.path}: ${output.width}x${output.height}, ${Math.round(metadata.size / 1024)} KB`);
  }

  socket.close();
} finally {
  chrome.kill();
  try {
    await rm(profilePath, { recursive: true, force: true });
  } catch {
    // Chrome can briefly retain its Windows profile lock after shutdown.
  }
}
