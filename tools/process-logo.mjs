import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = await mkdtemp(join(tmpdir(), "logo-gen-"));
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
    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    const data = imgData.data;
    
    // Flood fill from corners to make background outside the oval transparent
    const w = c.width, h = c.height;
    const visited = new Uint8Array(w * h);
    const queue = [];
    
    function isWhite(x, y) {
      const idx = (y * w + x) * 4;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      return r > 230 && g > 230 && b > 230;
    }
    
    // Push outer edges
    for (let x = 0; x < w; x++) {
      if (isWhite(x, 0)) { queue.push(x, 0); visited[0 * w + x] = 1; }
      if (isWhite(x, h - 1)) { queue.push(x, h - 1); visited[(h - 1) * w + x] = 1; }
    }
    for (let y = 0; y < h; y++) {
      if (isWhite(0, y)) { queue.push(0, y); visited[y * w + 0] = 1; }
      if (isWhite(w - 1, y)) { queue.push(w - 1, y); visited[y * w + (w - 1)] = 1; }
    }
    
    let head = 0;
    while(head < queue.length) {
      const x = queue[head++];
      const y = queue[head++];
      const idx = (y * w + x) * 4;
      data[idx + 3] = 0; // Transparent
      
      const neighbors = [[x+1, y], [x-1, y], [x, y+1], [x, y-1]];
      for(const [nx, ny] of neighbors) {
        if(nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const npos = ny * w + nx;
          if(!visited[npos] && isWhite(nx, ny)) {
            visited[npos] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }
    
    ctx.putImageData(imgData, 0, 0);
    window.pngData = c.toDataURL("image/png");
    window.done = true;
  };
  img.src = "data:image/jpeg;base64,${imgBase64}";
</script></body></html>`;

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) });

let pngData = null;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 200));
  const check = await send("Runtime.evaluate", { expression: "window.pngData || ''" });
  if (check && check.result && check.result.value) {
    pngData = check.result.value;
    break;
  }
}

if (!pngData) {
  throw new Error("Failed to get pngData from canvas");
}

const pngBuffer = Buffer.from(pngData.replace(/^data:image\/png;base64,/, ""), "base64");
await writeFile("assets/images/java-master-logo-updated-600.png", pngBuffer);
await writeFile("assets/images/java-master-logo-updated.png", pngBuffer);
await writeFile("assets/images/java-master-logo-white-600.png", pngBuffer);
await writeFile("assets/images/java-master-logo-white.png", pngBuffer);
console.log("Saved transparent logo png successfully, bytes:", pngBuffer.length);

chrome.kill();
process.exit(0);
