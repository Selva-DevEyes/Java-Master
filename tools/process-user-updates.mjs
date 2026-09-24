import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = await mkdtemp(join(tmpdir(), "img-process-"));
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

const heroSourcePath = "C:/Users/HP/.gemini/antigravity/brain/5c4e922c-d731-4fd2-89f7-102329c27e7c/.user_uploaded/media_1790270357945.png";
const facilitySourcePath = "C:/Users/HP/.gemini/antigravity/brain/5c4e922c-d731-4fd2-89f7-102329c27e7c/.user_uploaded/media_1790270357869.jpg";

const heroBase64 = (await readFile(heroSourcePath)).toString("base64");
const facilityBase64 = (await readFile(facilitySourcePath)).toString("base64");

const html = `<!DOCTYPE html><html><body>
<canvas id="cHeroFull"></canvas>
<canvas id="cHero960"></canvas>
<canvas id="cFacility"></canvas>
<script>
  window.results = {};

  function processImage(dataUri, callback) {
    const img = new Image();
    img.onload = () => callback(img);
    img.src = dataUri;
  }

  function sharpenCanvas(ctx, w, h, amount = 0.25) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const copy = new Uint8ClampedArray(d);
    const center = 1 + 4 * amount;
    const side = -amount;
    const kernel = [0, side, 0, side, center, side, 0, side, 0];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let val = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pIdx = ((y + ky) * w + (x + kx)) * 4 + c;
              val += copy[pIdx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const curIdx = (y * w + x) * 4 + c;
          d[curIdx] = Math.min(255, Math.max(0, val));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  let tasksRemaining = 2;
  function finishOne() {
    tasksRemaining--;
    if (tasksRemaining === 0) {
      window.done = true;
    }
  }

  // 1. Process Hero
  processImage("data:image/png;base64,${heroBase64}", (img) => {
    console.log("Hero original dimensions:", img.width, img.height);
    
    // Full hero (max width 2560 or keep native if clean)
    const targetW = Math.min(img.width, 2560);
    const targetH = Math.round((targetW / img.width) * img.height);
    
    const cFull = document.getElementById("cHeroFull");
    cFull.width = targetW;
    cFull.height = targetH;
    const ctxFull = cFull.getContext("2d");
    ctxFull.imageSmoothingEnabled = true;
    ctxFull.imageSmoothingQuality = "high";
    ctxFull.drawImage(img, 0, 0, targetW, targetH);
    sharpenCanvas(ctxFull, targetW, targetH, 0.15);

    window.results.heroWebp = cFull.toDataURL("image/webp", 0.94);
    window.results.heroJpg = cFull.toDataURL("image/jpeg", 0.92);

    // 960w hero
    const c960 = document.getElementById("cHero960");
    const w960 = 960;
    const h960 = Math.round((w960 / img.width) * img.height);
    c960.width = w960;
    c960.height = h960;
    const ctx960 = c960.getContext("2d");
    ctx960.imageSmoothingEnabled = true;
    ctx960.imageSmoothingQuality = "high";
    ctx960.drawImage(img, 0, 0, w960, h960);
    sharpenCanvas(ctx960, w960, h960, 0.2);

    window.results.hero960Webp = c960.toDataURL("image/webp", 0.94);
    window.results.hero960Jpg = c960.toDataURL("image/jpeg", 0.92);

    finishOne();
  });

  // 2. Process Facility
  processImage("data:image/jpeg;base64,${facilityBase64}", (img) => {
    console.log("Facility original dimensions:", img.width, img.height);
    const scale = img.width < 1600 ? 1.5 : 1.0;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    
    const cFac = document.getElementById("cFacility");
    cFac.width = w;
    cFac.height = h;
    const ctxFac = cFac.getContext("2d");
    ctxFac.imageSmoothingEnabled = true;
    ctxFac.imageSmoothingQuality = "high";
    ctxFac.drawImage(img, 0, 0, w, h);
    sharpenCanvas(ctxFac, w, h, 0.25);

    window.results.facWebp = cFac.toDataURL("image/webp", 0.94);
    window.results.facJpg = cFac.toDataURL("image/jpeg", 0.92);

    finishOne();
  });
</script>
</body></html>`;

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) });

let results = null;
for (let i = 0; i < 50; i++) {
  await new Promise((r) => setTimeout(r, 200));
  const check = await send("Runtime.evaluate", { expression: "window.done ? window.results : null", returnByValue: true });
  if (check?.result?.value) {
    results = check.result.value;
    break;
  }
}

if (!results) {
  throw new Error("Failed to process images");
}

const saveBase64 = async (dataUri, targetPath) => {
  const base64 = dataUri.replace(/^data:image\/[a-z]+;base64,/, "");
  const buf = Buffer.from(base64, "base64");
  await writeFile(targetPath, buf);
  console.log(`Saved ${targetPath} (${buf.length} bytes)`);
};

await saveBase64(results.heroWebp, "assets/images/hero-coffee-business.webp");
await saveBase64(results.heroJpg, "assets/images/hero-coffee-business.jpg");
await saveBase64(results.hero960Webp, "assets/images/hero-coffee-business-960.webp");
await saveBase64(results.hero960Jpg, "assets/images/hero-coffee-business-960.jpg");

await saveBase64(results.facWebp, "assets/images/jmi-facility-north-wilkesboro.webp");
await saveBase64(results.facJpg, "assets/images/jmi-facility-north-wilkesboro.jpg");

chrome.kill();
process.exit(0);
