import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = await mkdtemp(join(tmpdir(), "showcase-img-"));
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

// We will compose a stunning, clean showcase image from the commercial roaster and glowing beans
const roasterBuf = await readFile("assets/images/roaster-dual-cylinders.jpg");
const roasterBase64 = roasterBuf.toString("base64");

const html = `<!DOCTYPE html><html><body><canvas id="c"></canvas><script>
  const img = new Image();
  img.onload = () => {
    const w = 1200;
    const h = 900;
    const c = document.getElementById("c");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    
    // Crop the roaster image focused on the upper glass cylinder and vortex of roasting beans
    // Avoiding the lower sticker
    const srcX = Math.round(img.width * 0.05);
    const srcY = 0;
    const srcW = Math.round(img.width * 0.9);
    const srcH = Math.round(img.height * 0.82);
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, w, h);
    
    // Add a very subtle luxury gradient overlay at bottom
    const grad = ctx.createLinearGradient(0, h * 0.6, 0, h);
    grad.addColorStop(0, "rgba(18, 11, 7, 0)");
    grad.addColorStop(1, "rgba(18, 11, 7, 0.75)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    
    window.webpData = c.toDataURL("image/webp", 0.94);
    window.jpgData = c.toDataURL("image/jpeg", 0.94);
    window.done = true;
  };
  img.src = "data:image/jpeg;base64,${roasterBase64}";
</script></body></html>`;

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) });

let webpData = null, jpgData = null;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 200));
  const check = await send("Runtime.evaluate", { expression: "window.done ? 'yes' : ''" });
  if (check?.result?.value === 'yes') {
    const res1 = await send("Runtime.evaluate", { expression: "window.webpData" });
    const res2 = await send("Runtime.evaluate", { expression: "window.jpgData" });
    webpData = res1.result.value;
    jpgData = res2.result.value;
    break;
  }
}

const webpBuf = Buffer.from(webpData.replace(/^data:image\/webp;base64,/, ""), "base64");
const jpgBuf = Buffer.from(jpgData.replace(/^data:image\/jpeg;base64,/, ""), "base64");

await writeFile("assets/images/about-roasters-showcase.webp", webpBuf);
await writeFile("assets/images/about-roasters-showcase.jpg", jpgBuf);

console.log("Successfully created elegant about roasters showcase photo!");
chrome.kill();
