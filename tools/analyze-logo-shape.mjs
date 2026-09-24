import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = await mkdtemp(join(tmpdir(), "logo-analyze-"));
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

const html = `<!DOCTYPE html><html><body><canvas id="c"></canvas><script>
  const img = new Image();
  img.onload = () => {
    const c = document.getElementById("c");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const idata = ctx.getImageData(0, 0, img.width, img.height);
    const d = idata.data;
    
    // Sample along the center horizontal line and center vertical line to find the border edges and colors
    const cx = Math.floor(img.width / 2);
    const cy = Math.floor(img.height / 2);
    
    const hScan = [];
    for (let x = 0; x < img.width; x++) {
      const idx = (cy * img.width + x) * 4;
      hScan.push([x, d[idx], d[idx+1], d[idx+2]]);
    }
    
    const vScan = [];
    for (let y = 0; y < img.height; y++) {
      const idx = (y * img.width + cx) * 4;
      vScan.push([y, d[idx], d[idx+1], d[idx+2]]);
    }
    
    // Find where the non-white starts along 16 radial rays from center
    const radialR = [];
    for (let deg = 0; deg < 360; deg += 15) {
      const rad = deg * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      let foundR = 0;
      let edgeColor = null;
      for (let r = 500; r >= 10; r--) {
        const x = Math.round(cx + r * cos);
        const y = Math.round(cy + r * sin);
        if (x >= 0 && x < img.width && y >= 0 && y < img.height) {
          const idx = (y * img.width + x) * 4;
          const red = d[idx], green = d[idx+1], blue = d[idx+2];
          if (red < 235 || green < 235 || blue < 235) {
            foundR = r;
            edgeColor = [red, green, blue];
            break;
          }
        }
      }
      radialR.push({ deg, r: foundR, edgeColor });
    }
    
    window.result = { cx, cy, w: img.width, h: img.height, radialR };
    window.done = true;
  };
  img.src = "data:image/jpeg;base64,${imgBase64}";
</script></body></html>`;

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) });

let result = null;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 200));
  const check = await send("Runtime.evaluate", { expression: "window.result ? JSON.stringify(window.result) : ''" });
  if (check && check.result && check.result.value) {
    result = JSON.parse(check.result.value);
    break;
  }
}

console.log("Analysis:", result);
chrome.kill();
