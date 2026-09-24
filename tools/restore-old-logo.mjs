import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = await mkdtemp(join(tmpdir(), "logo-restore-"));
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

const sourcePath = "C:/Users/HP/.gemini/antigravity/brain/5c4e922c-d731-4fd2-89f7-102329c27e7c/.user_uploaded/media_1790255974899.png";
const imgBase64 = (await readFile(sourcePath)).toString("base64");

const html = `<!DOCTYPE html><html><body><canvas id="c"></canvas><script>
  const img = new Image();
  img.onload = () => {
    // 1. Find alpha bounds of the uploaded logo
    const temp = document.createElement("canvas");
    temp.width = img.width;
    temp.height = img.height;
    const tctx = temp.getContext("2d");
    tctx.drawImage(img, 0, 0);
    const idata = tctx.getImageData(0, 0, img.width, img.height);
    const d = idata.data;
    
    let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const a = d[(y * img.width + x) * 4 + 3];
        if (a > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    
    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    
    // Add small comfortable padding
    const pad = 12;
    const srcX = Math.max(0, minX - pad);
    const srcY = Math.max(0, minY - pad);
    const srcW = Math.min(img.width - srcX, cropW + pad * 2);
    const srcH = Math.min(img.height - srcY, cropH + pad * 2);
    
    // 2. Master Canvas (607 x 960)
    const cMaster = document.createElement("canvas");
    cMaster.width = 607;
    cMaster.height = 960;
    const ctxMaster = cMaster.getContext("2d");
    ctxMaster.imageSmoothingEnabled = true;
    ctxMaster.imageSmoothingQuality = "high";
    
    const scale = Math.min(607 / srcW, 960 / srcH);
    const dw = Math.round(srcW * scale);
    const dh = Math.round(srcH * scale);
    const dx = Math.round((607 - dw) / 2);
    const dy = Math.round((960 - dh) / 2);
    ctxMaster.drawImage(img, srcX, srcY, srcW, srcH, dx, dy, dw, dh);
    
    window.masterPng = cMaster.toDataURL("image/png");
    
    // 3. 600px Canvas (379 x 600)
    const c600 = document.createElement("canvas");
    c600.width = 379;
    c600.height = 600;
    const ctx600 = c600.getContext("2d");
    ctx600.imageSmoothingEnabled = true;
    ctx600.imageSmoothingQuality = "high";
    ctx600.drawImage(cMaster, 0, 0, 379, 600);
    window.png600 = c600.toDataURL("image/png");
    
    // 4. Favicon (128 x 128 square)
    const cfav = document.createElement("canvas");
    cfav.width = 128;
    cfav.height = 128;
    const ctxfav = cfav.getContext("2d");
    ctxfav.imageSmoothingEnabled = true;
    ctxfav.imageSmoothingQuality = "high";
    const favH = 120;
    const favW = Math.round(379 * (favH / 600));
    ctxfav.drawImage(c600, (128 - favW) / 2, (128 - favH) / 2, favW, favH);
    window.faviconPng = cfav.toDataURL("image/png");
    
    window.done = true;
  };
  img.src = "data:image/png;base64,${imgBase64}";
</script></body></html>`;

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) });

let masterData = null, data600 = null, favData = null;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 200));
  const check = await send("Runtime.evaluate", { expression: "window.done ? 'yes' : ''" });
  if (check?.result?.value === 'yes') {
    const res1 = await send("Runtime.evaluate", { expression: "window.masterPng" });
    const res2 = await send("Runtime.evaluate", { expression: "window.png600" });
    const res3 = await send("Runtime.evaluate", { expression: "window.faviconPng" });
    masterData = res1.result.value;
    data600 = res2.result.value;
    favData = res3.result.value;
    break;
  }
}

const masterBuf = Buffer.from(masterData.replace(/^data:image\/png;base64,/, ""), "base64");
const buf600 = Buffer.from(data600.replace(/^data:image\/png;base64,/, ""), "base64");
const favBuf = Buffer.from(favData.replace(/^data:image\/png;base64,/, ""), "base64");

await writeFile("assets/images/java-master-logo-updated.png", masterBuf);
await writeFile("assets/images/java-master-logo-updated-600.png", buf600);
await writeFile("assets/images/java-master-logo-white.png", masterBuf);
await writeFile("assets/images/java-master-logo-white-600.png", buf600);
await writeFile("assets/images/java-master-favicon-updated.png", favBuf);
await writeFile("assets/images/java-master-favicon.png", favBuf);

console.log("Restored old white line logo sitewide successfully!");
chrome.kill();
