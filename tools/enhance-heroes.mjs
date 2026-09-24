import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = await mkdtemp(join(tmpdir(), "enhance-single-"));
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

await send("Page.enable");
await send("Runtime.enable");

async function processImage(inputPath, targetW, targetH, sharpen, contrast, outputs) {
  console.log(`Processing ${inputPath} -> ${targetW}x${targetH}...`);
  const buf = await readFile(inputPath);
  const mime = inputPath.endsWith(".png") ? "image/png" : (inputPath.endsWith(".webp") ? "image/webp" : "image/jpeg");
  const b64 = buf.toString("base64");

  const html = `<!DOCTYPE html><html><body><canvas id="c"></canvas><script>
    const img = new Image();
    img.onload = () => {
      const c = document.getElementById("c");
      c.width = ${targetW};
      c.height = ${targetH};
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, ${targetW}, ${targetH});
      
      const imgData = ctx.getImageData(0, 0, ${targetW}, ${targetH});
      const d = imgData.data;
      const copy = new Uint8ClampedArray(d);
      const s = ${sharpen};
      const centerW = 1 + 4 * s;
      const contrastMult = ${contrast};
      
      for (let y = 1; y < ${targetH} - 1; y++) {
        for (let x = 1; x < ${targetW} - 1; x++) {
          const idx = (y * ${targetW} + x) * 4;
          for (let ch = 0; ch < 3; ch++) {
            const top = copy[((y - 1) * ${targetW} + x) * 4 + ch];
            const bottom = copy[((y + 1) * ${targetW} + x) * 4 + ch];
            const left = copy[(y * ${targetW} + (x - 1)) * 4 + ch];
            const right = copy[(y * ${targetW} + (x + 1)) * 4 + ch];
            const cur = copy[idx + ch];
            
            let val = cur * centerW - (top + bottom + left + right) * s;
            if (contrastMult !== 1.0) {
              val = (val - 128) * contrastMult + 128;
            }
            d[idx + ch] = Math.min(255, Math.max(0, val));
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
      
      window.results = {};
      ${outputs.map((out, idx) => `
        {
          const outW = ${out.width || targetW};
          const outH = ${out.height || targetH};
          let outCanvas = c;
          if (outW !== ${targetW} || outH !== ${targetH}) {
            outCanvas = document.createElement("canvas");
            outCanvas.width = outW;
            outCanvas.height = outH;
            const outCtx = outCanvas.getContext("2d");
            outCtx.imageSmoothingEnabled = true;
            outCtx.imageSmoothingQuality = "high";
            outCtx.drawImage(c, 0, 0, outW, outH);
          }
          window.results["out_${idx}"] = outCanvas.toDataURL("${out.type}", ${out.quality || 0.95});
        }
      `).join("\n")}
      window.done = true;
    };
    img.src = "data:${mime};base64,${b64}";
  </script></body></html>`;

  await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) });
  
  let done = false;
  for (let i = 0; i < 50; i++) {
    await new Promise(r => setTimeout(r, 200));
    const chk = await send("Runtime.evaluate", { expression: "window.done ? 'yes' : ''" });
    if (chk?.result?.value === 'yes') {
      done = true;
      break;
    }
  }

  if (!done) {
    throw new Error(`Timeout processing ${inputPath}`);
  }

  for (let idx = 0; idx < outputs.length; idx++) {
    const out = outputs[idx];
    const res = await send("Runtime.evaluate", { expression: `window.results["out_${idx}"]` });
    const dataUrl = res.result.value;
    const cleanBase64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    await writeFile(out.path, buffer);
    console.log(`  -> Saved ${out.path} (${buffer.length} bytes)`);
  }
}

// 1. Home Hero Super-Resolution & Enhancement
await processImage(
  "C:/Users/HP/.gemini/antigravity/brain/5c4e922c-d731-4fd2-89f7-102329c27e7c/.user_uploaded/media_1790254050414.jpg",
  2048,
  1152,
  0.5,
  1.04,
  [
    { path: "assets/images/hero-coffee-business.webp", type: "image/webp", quality: 0.96 },
    { path: "assets/images/hero-coffee-business.jpg", type: "image/jpeg", quality: 0.95 },
    { path: "assets/images/hero-coffee-business-960.webp", type: "image/webp", quality: 0.92, width: 1024, height: 576 },
    { path: "assets/images/hero-coffee-business-960.jpg", type: "image/jpeg", quality: 0.92, width: 1024, height: 576 }
  ]
);

// 2. Contact Page Banner Replacement (High-Res Roaster Planning & Consultation photo)
await processImage(
  "assets/images/roaster-planning-jm1500.jpg",
  1920,
  1080,
  0.4,
  1.03,
  [
    { path: "assets/images/contact-hero-banner.webp", type: "image/webp", quality: 0.95 },
    { path: "assets/images/contact-hero-banner.jpg", type: "image/jpeg", quality: 0.95 }
  ]
);

console.log("All hero images enhanced successfully!");
chrome.kill();
