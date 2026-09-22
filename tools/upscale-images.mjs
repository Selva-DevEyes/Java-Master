import { spawn } from "node:child_process";
import { readFile, writeFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = join(tmpdir(), "chrome-upscale-" + Date.now());

async function run() {
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank"
  ], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });

  let wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    chrome.stderr.on("data", d => {
      buf += d.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) resolve(m[1]);
    });
    setTimeout(() => reject(new Error("timeout")), 10000);
  });

  const debugPort = new URL(wsUrl).port;
  const target = await fetch(`http://127.0.0.1:${debugPort}/json/new`, { method: "PUT" }).then(r => r.json());
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener("open", r, { once: true }));

  let reqId = 0;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++reqId;
      const handler = ({ data }) => {
        const msg = JSON.parse(data);
        if (msg.id === id) {
          ws.removeEventListener("message", handler);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      };
      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function upscaleImage(inputPath, outputPath, scale = 2) {
    const raw = await readFile(inputPath);
    const mime = inputPath.endsWith(".png") ? "image/png" : inputPath.endsWith(".webp") ? "image/webp" : "image/jpeg";
    const dataUrl = `data:${mime};base64,${raw.toString("base64")}`;
    
    const expr = `(async () => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = "${dataUrl}"; });
      const w = Math.round(img.naturalWidth * ${scale});
      const h = Math.round(img.naturalHeight * ${scale});
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.filter = "contrast(1.06) brightness(1.02) saturate(1.06)";
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL("image/webp", 0.95);
    })()`;

    const res = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    const b64 = res.result.value.split(",")[1];
    await writeFile(outputPath, Buffer.from(b64, "base64"));
    const s = await stat(outputPath);
    console.log(`Upscaled ${inputPath} -> ${outputPath} (${(s.size / 1024).toFixed(1)} KB)`);
  }

  await upscaleImage("assets/images/roaster-dual-cylinders.jpg", "assets/images/roaster-dual-cylinders-hd.webp", 2);
  await upscaleImage("assets/images/roaster-cylinder-close.webp", "assets/images/roaster-cylinder-close-hd.webp", 2);
  await upscaleImage("assets/images/roaster-profect-40.webp", "assets/images/roaster-profect-40-hd.webp", 2);
  await upscaleImage("assets/images/roaster-cooling-tray-paddle.jpg", "assets/images/roaster-cooling-tray-paddle-hd.webp", 2);
  await upscaleImage("assets/images/coffee-beans-pouring-chute.jpg", "assets/images/coffee-beans-pouring-chute-hd.webp", 2);
  await upscaleImage("assets/images/coffee-beans-heart-hands.jpg", "assets/images/coffee-beans-heart-hands-hd.webp", 2);

  ws.close();
  chrome.kill();
  try {
    await rm(profile, { recursive: true, force: true });
  } catch {}
}

run().catch(e => { console.error(e); process.exit(1); });
