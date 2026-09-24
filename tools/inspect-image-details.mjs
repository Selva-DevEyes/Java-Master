import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = await mkdtemp(join(tmpdir(), "inspect-"));
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

const files = [
  { name: "media_1790254050414.jpg", path: "C:/Users/HP/.gemini/antigravity/brain/5c4e922c-d731-4fd2-89f7-102329c27e7c/.user_uploaded/media_1790254050414.jpg" },
  { name: "stock-coffee-shop-owners-2217186663.jpg", path: "assets/images/stock-coffee-shop-owners-2217186663.jpg" },
  { name: "stock-professional-coffee-roaster-1376337196.jpg", path: "assets/images/stock-professional-coffee-roaster-1376337196.jpg" },
  { name: "pexels-coffee-beans-cooling-20121334.jpg", path: "assets/images/pexels-coffee-beans-cooling-20121334.jpg" },
  { name: "about-engineering.jpg", path: "assets/images/about-engineering.jpg" },
  { name: "roaster-planning-java-master.jpg", path: "assets/images/roaster-planning-java-master.jpg" }
];

const results = [];
for (const f of files) {
  const buf = await readFile(f.path);
  const b64 = buf.toString("base64");
  const html = `<!DOCTYPE html><html><body><script>
    const img = new Image();
    img.onload = () => {
      window.info = { width: img.width, height: img.height };
      window.done = true;
    };
    img.src = "data:image/jpeg;base64,${b64}";
  </script></body></html>`;

  await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) });
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    const chk = await send("Runtime.evaluate", { expression: "window.done ? JSON.stringify(window.info) : ''" });
    if (chk?.result?.value) {
      results.push({ name: f.name, ...JSON.parse(chk.result.value), bytes: buf.length });
      break;
    }
  }
}

console.log("Image Details:", results);
chrome.kill();
