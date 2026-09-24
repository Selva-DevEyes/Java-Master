import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = await mkdtemp(join(tmpdir(), "img-banners-"));
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

const basePath = "C:/Users/HP/.gemini/antigravity/brain/5c4e922c-d731-4fd2-89f7-102329c27e7c/.user_uploaded/";

const items = [
  {
    id: "successStories",
    file: "media_1790273164002.jpg",
    targets: ["assets/images/stories-hero-roasting-hands.webp", "assets/images/stories-hero-roasting-hands.jpg"]
  },
  {
    id: "coffeeChronicles",
    file: "uploaded_media_0_1790273339909.jpg",
    targets: ["assets/images/chronicle-harvest-hands.webp", "assets/images/chronicle-harvest-hands.jpg"]
  },
  {
    id: "roasters",
    file: "uploaded_media_1_1790273339909.jpg",
    targets: ["assets/images/coffee-beans-pouring-chute-hd.webp", "assets/images/coffee-beans-pouring-chute.jpg"]
  },
  {
    id: "contact",
    file: "uploaded_media_2_1790273339909.jpg",
    targets: ["assets/images/contact-hero-banner.webp", "assets/images/contact-hero-banner.jpg"]
  },
  {
    id: "coffee",
    file: "media_1790273197257.jpg",
    targets: ["assets/images/coffee-hero-heart-hands-enhanced.webp", "assets/images/coffee-hero-heart-hands-enhanced.png", "assets/images/coffee-hero-heart-hands-enhanced.jpg"]
  }
];

const loadedData = {};
for (const item of items) {
  const buf = await readFile(join(basePath, item.file));
  loadedData[item.id] = buf.toString("base64");
}

const html = `<!DOCTYPE html><html><body>
<script>
  window.results = {};
  const items = ${JSON.stringify(items.map(i => ({ id: i.id })))};
  const data = ${JSON.stringify(loadedData)};

  function sharpenCanvas(ctx, w, h, amount = 0.2) {
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

  let remaining = items.length;

  items.forEach(item => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      // Scale up if image is less than 1920w for crisp high-DPI
      const targetW = Math.max(img.width, 1920);
      const targetH = Math.round((targetW / img.width) * img.height);
      c.width = targetW;
      c.height = targetH;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetW, targetH);
      sharpenCanvas(ctx, targetW, targetH, 0.2);

      window.results[item.id] = {
        webp: c.toDataURL("image/webp", 0.94),
        jpg: c.toDataURL("image/jpeg", 0.93),
        png: c.toDataURL("image/png")
      };

      remaining--;
      if (remaining === 0) {
        window.done = true;
      }
    };
    img.src = "data:image/jpeg;base64," + data[item.id];
  });
</script>
</body></html>`;

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) });

let results = null;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 250));
  const check = await send("Runtime.evaluate", { expression: "window.done ? window.results : null", returnByValue: true });
  if (check?.result?.value) {
    results = check.result.value;
    break;
  }
}

if (!results) {
  throw new Error("Failed to process banner images");
}

for (const item of items) {
  const res = results[item.id];
  for (const targetPath of item.targets) {
    let dataUri = res.jpg;
    if (targetPath.endsWith(".webp")) dataUri = res.webp;
    else if (targetPath.endsWith(".png")) dataUri = res.png;

    const base64 = dataUri.replace(/^data:image\/[a-z]+;base64,/, "");
    const buf = Buffer.from(base64, "base64");
    await writeFile(targetPath, buf);
    console.log(`Saved ${targetPath} (${buf.length} bytes)`);
  }
}

chrome.kill();
process.exit(0);
