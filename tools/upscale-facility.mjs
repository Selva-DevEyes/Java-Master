import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = await mkdtemp(join(tmpdir(), "img-upscale-"));
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

const sourcePath = "C:/Users/HP/.gemini/antigravity/brain/5c4e922c-d731-4fd2-89f7-102329c27e7c/.user_uploaded/media_1790253853433.webp";
const imgBase64 = (await readFile(sourcePath)).toString("base64");

const html = `<!DOCTYPE html><html><body><canvas id="c"></canvas><script>
  const img = new Image();
  img.onload = () => {
    const scale = 2.0; // 2x upscale with image smoothing and sharpening
    const c = document.getElementById("c");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, c.width, c.height);
    
    // Light unsharp sharpening mask
    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    const d = imgData.data;
    const w = c.width, h = c.height;
    const copy = new Uint8ClampedArray(d);
    
    // 3x3 sharpening kernel
    const kernel = [
      0, -0.3, 0,
      -0.3, 2.2, -0.3,
      0, -0.3, 0
    ];
    
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let cIdx = 0; cIdx < 3; cIdx++) {
          let val = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pIdx = ((y + ky) * w + (x + kx)) * 4 + cIdx;
              val += copy[pIdx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const curIdx = (y * w + x) * 4 + cIdx;
          d[curIdx] = Math.min(255, Math.max(0, val));
        }
      }
    }
    
    ctx.putImageData(imgData, 0, 0);
    window.webpData = c.toDataURL("image/webp", 0.94);
    window.jpegData = c.toDataURL("image/jpeg", 0.94);
    window.done = true;
  };
  img.src = "data:image/webp;base64,${imgBase64}";
</script></body></html>`;

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) });

let webpData = null;
let jpegData = null;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 200));
  const check = await send("Runtime.evaluate", { expression: "window.done ? { webp: window.webpData, jpeg: window.jpegData } : null", returnByValue: true });
  if (check?.result?.value) {
    webpData = check.result.value.webp;
    jpegData = check.result.value.jpeg;
    break;
  }
}

if (!webpData || !jpegData) {
  throw new Error("Failed to upscale and encode image");
}

const webpBuffer = Buffer.from(webpData.replace(/^data:image\/webp;base64,/, ""), "base64");
const jpegBuffer = Buffer.from(jpegData.replace(/^data:image\/jpeg;base64,/, ""), "base64");

await writeFile("assets/images/jmi-facility-north-wilkesboro.webp", webpBuffer);
await writeFile("assets/images/jmi-facility-north-wilkesboro.jpg", jpegBuffer);
console.log("Saved upscaled facility image (webp & jpg), bytes:", webpBuffer.length, jpegBuffer.length);

chrome.kill();
process.exit(0);
