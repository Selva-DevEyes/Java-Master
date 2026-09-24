import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = await mkdtemp(join(tmpdir(), "logo-fix-"));
const chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });

const browserWs = await new Promise((resolve, reject) => {
  let buffer = "";
  const timer = setTimeout(() => reject(new Error("Chrome DevTools timeout")), 15000);
  chrome.stderr.on("data", (chunk) => {
    buffer += chunk.toString();
    const match = buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) {
      clearTimeout(timer);
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
  if (message.id) {
    const promise = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) promise?.reject(new Error(message.error.message));
    else promise?.resolve(message.result);
  }
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

const sourcePath = "C:/Users/HP/.gemini/antigravity/brain/5c4e922c-d731-4fd2-89f7-102329c27e7c/.user_uploaded/media_1790251079001.jpg";
const imgBase64 = (await readFile(sourcePath)).toString("base64");

// Script to analyze image and generate ultra-crisp logo with strong defined border
const html = `<!DOCTYPE html><html><body><canvas id="c"></canvas><script>
  const img = new Image();
  img.onload = () => {
    console.log("Original logo dimensions:", img.width, img.height);
    
    // We will create a high-res master canvas (e.g. 1200px height or 2x)
    const scale = 2;
    const w = img.width * scale;
    const h = img.height * scale;
    
    const c = document.getElementById("c");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    
    // Draw original image scaled up with high quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    
    // First, let's find the exact oval bounds from the original image
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tctx = tempCanvas.getContext("2d");
    tctx.drawImage(img, 0, 0);
    const idata = tctx.getImageData(0, 0, img.width, img.height);
    const d = idata.data;
    
    // Find min/max non-white bounds
    let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const idx = (y * img.width + x) * 4;
        const r = d[idx], g = d[idx+1], b = d[idx+2];
        // If not background white
        if (r < 235 || g < 235 || b < 235) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    
    window.bounds = { minX, maxX, minY, maxY, origW: img.width, origH: img.height };
    window.done = true;
  };
  img.src = "data:image/jpeg;base64,${imgBase64}";
</script></body></html>`;

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) });

let bounds = null;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 200));
  const check = await send("Runtime.evaluate", { expression: "window.bounds ? JSON.stringify(window.bounds) : ''" });
  if (check && check.result && check.result.value) {
    bounds = JSON.parse(check.result.value);
    break;
  }
}

console.log("Detected bounds:", bounds);
chrome.kill();
