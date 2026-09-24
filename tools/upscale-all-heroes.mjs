import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = await mkdtemp(join(tmpdir(), "heroes-upscale-"));
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

// List of hero images to upscale and optimize:
const jobs = [
  {
    name: "Home Hero (User Uploaded Media)",
    inputPath: "C:/Users/HP/.gemini/antigravity/brain/5c4e922c-d731-4fd2-89f7-102329c27e7c/.user_uploaded/media_1790254050414.jpg",
    targetWidth: 1920,
    targetHeight: 1080,
    sharpen: 0.35,
    outputs: [
      { path: "assets/images/hero-coffee-business.webp", type: "image/webp", quality: 0.92 },
      { path: "assets/images/hero-coffee-business.jpg", type: "image/jpeg", quality: 0.92 },
      { path: "assets/images/hero-coffee-business-960.webp", type: "image/webp", quality: 0.88, width: 960, height: 540 },
      { path: "assets/images/hero-coffee-business-960.jpg", type: "image/jpeg", quality: 0.88, width: 960, height: 540 }
    ]
  },
  {
    name: "JM 1500 Hero Machine",
    inputPath: "assets/images/jm-1500-red-black-roasters.jpg",
    targetWidth: 1024,
    targetHeight: 1502,
    sharpen: 0.4,
    outputs: [
      { path: "assets/images/jm-1500-red-black-roasters-hd.webp", type: "image/webp", quality: 0.92 },
      { path: "assets/images/jm-1500-red-black-roasters.jpg", type: "image/jpeg", quality: 0.92 }
    ]
  },
  {
    name: "Profect 4.0 Hero Machine",
    inputPath: "assets/images/roaster-profect-40-hd.webp",
    targetWidth: 1200,
    targetHeight: 1800,
    sharpen: 0.35,
    outputs: [
      { path: "assets/images/roaster-profect-40-hd.webp", type: "image/webp", quality: 0.92 },
      { path: "assets/images/roaster-profect-40.jpg", type: "image/jpeg", quality: 0.92 }
    ]
  },
  {
    name: "Roasters Chute Pouring Hero",
    inputPath: "assets/images/coffee-beans-pouring-chute-hd.webp",
    targetWidth: 1440,
    targetHeight: 1798,
    sharpen: 0.35,
    outputs: [
      { path: "assets/images/coffee-beans-pouring-chute-hd.webp", type: "image/webp", quality: 0.92 },
      { path: "assets/images/coffee-beans-pouring-chute.jpg", type: "image/jpeg", quality: 0.92 }
    ]
  },
  {
    name: "Coffee Page Hero",
    inputPath: "assets/images/coffee-hero-heart-hands-enhanced.png",
    targetWidth: 1920,
    targetHeight: 1280,
    sharpen: 0.35,
    outputs: [
      { path: "assets/images/coffee-hero-heart-hands-enhanced.webp", type: "image/webp", quality: 0.92 },
      { path: "assets/images/coffee-hero-heart-hands-enhanced.png", type: "image/png" }
    ]
  },
  {
    name: "Coffee Chronicles Hero",
    inputPath: "assets/images/chronicle-harvest-hands.jpg",
    targetWidth: 1920,
    targetHeight: 1280,
    sharpen: 0.35,
    outputs: [
      { path: "assets/images/chronicle-harvest-hands.webp", type: "image/webp", quality: 0.92 },
      { path: "assets/images/chronicle-harvest-hands.jpg", type: "image/jpeg", quality: 0.92 }
    ]
  },
  {
    name: "Success Stories Hero",
    inputPath: "assets/images/stories-hero-roasting-hands.jpg",
    targetWidth: 1920,
    targetHeight: 1280,
    sharpen: 0.35,
    outputs: [
      { path: "assets/images/stories-hero-roasting-hands.webp", type: "image/webp", quality: 0.92 },
      { path: "assets/images/stories-hero-roasting-hands.jpg", type: "image/jpeg", quality: 0.92 }
    ]
  },
  {
    name: "Success Story Detail Hero",
    inputPath: "assets/images/story-detail-hero.jpg",
    targetWidth: 1920,
    targetHeight: 1080,
    sharpen: 0.35,
    outputs: [
      { path: "assets/images/story-detail-hero.webp", type: "image/webp", quality: 0.92 },
      { path: "assets/images/story-detail-hero.jpg", type: "image/jpeg", quality: 0.92 }
    ]
  },
  {
    name: "About Jim Suddath Portrait",
    inputPath: "assets/images/about-jim-suddath.jpg",
    targetWidth: 1200,
    targetHeight: 1804,
    sharpen: 0.35,
    outputs: [
      { path: "assets/images/about-jim-suddath.webp", type: "image/webp", quality: 0.92 },
      { path: "assets/images/about-jim-suddath.jpg", type: "image/jpeg", quality: 0.92 },
      { path: "assets/images/about-jim-suddath-640.webp", type: "image/webp", quality: 0.88, width: 640, height: 962 },
      { path: "assets/images/about-jim-suddath-640.jpg", type: "image/jpeg", quality: 0.88, width: 640, height: 962 }
    ]
  },
  {
    name: "Contact Hero Banner",
    inputPath: "assets/images/roaster-planning-java-master.jpg",
    targetWidth: 1920,
    targetHeight: 1280,
    sharpen: 0.35,
    outputs: [
      { path: "assets/images/roaster-planning-java-master.webp", type: "image/webp", quality: 0.92 },
      { path: "assets/images/roaster-planning-java-master.jpg", type: "image/jpeg", quality: 0.92 }
    ]
  }
];

for (const job of jobs) {
  console.log(`Processing: ${job.name}...`);
  const buf = await readFile(job.inputPath);
  const mimeType = job.inputPath.endsWith(".png") ? "image/png" : (job.inputPath.endsWith(".webp") ? "image/webp" : "image/jpeg");
  const base64 = buf.toString("base64");
  
  const html = `<!DOCTYPE html><html><body><canvas id="c"></canvas><script>
    const img = new Image();
    img.onload = () => {
      const targetW = ${job.targetWidth};
      const targetH = ${job.targetHeight};
      const c = document.getElementById("c");
      c.width = targetW;
      c.height = targetH;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetW, targetH);
      
      // Unsharp mask sharpening kernel
      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const d = imgData.data;
      const copy = new Uint8ClampedArray(d);
      const s = ${job.sharpen};
      const centerW = 1 + 4 * s;
      
      for (let y = 1; y < targetH - 1; y++) {
        for (let x = 1; x < targetW - 1; x++) {
          const idx = (y * targetW + x) * 4;
          for (let c = 0; c < 3; c++) {
            const top = copy[((y - 1) * targetW + x) * 4 + c];
            const bottom = copy[((y + 1) * targetW + x) * 4 + c];
            const left = copy[(y * targetW + (x - 1)) * 4 + c];
            const right = copy[(y * targetW + (x + 1)) * 4 + c];
            const current = copy[idx + c];
            
            const sharpenedVal = current * centerW - (top + bottom + left + right) * s;
            d[idx + c] = Math.min(255, Math.max(0, sharpenedVal));
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
      
      window.results = {};
      ${job.outputs.map((out, idx) => `
        {
          const outW = ${out.width || job.targetWidth};
          const outH = ${out.height || job.targetHeight};
          let outCanvas = c;
          if (outW !== targetW || outH !== targetH) {
            outCanvas = document.createElement("canvas");
            outCanvas.width = outW;
            outCanvas.height = outH;
            const outCtx = outCanvas.getContext("2d");
            outCtx.imageSmoothingEnabled = true;
            outCtx.imageSmoothingQuality = "high";
            outCtx.drawImage(c, 0, 0, outW, outH);
          }
          window.results["out_${idx}"] = outCanvas.toDataURL("${out.type}", ${out.quality || 0.9});
        }
      `).join("\n")}
      window.done = true;
    };
    img.src = "data:${mimeType};base64,${base64}";
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
    console.error(`Timeout processing ${job.name}`);
    continue;
  }
  
  for (let idx = 0; idx < job.outputs.length; idx++) {
    const out = job.outputs[idx];
    const res = await send("Runtime.evaluate", { expression: `window.results["out_${idx}"]` });
    const dataUrl = res.result.value;
    const cleanBase64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    await writeFile(out.path, buffer);
    console.log(`  -> Wrote ${out.path} (${buffer.length} bytes)`);
  }
}

chrome.kill();
console.log("All hero banner images upscaled and improved successfully!");
