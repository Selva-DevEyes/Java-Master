import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = await mkdtemp(join(tmpdir(), "logo-build-"));
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
    const origW = img.width;
    const origH = img.height;
    
    // Exact ellipse parameters of the logo badge
    // In the original 650x1024 image:
    const cx = origW / 2; // 325
    const cy = origH / 2; // 512
    const rx = 313; // Horizontal radius of outer border
    const ry = 496; // Vertical radius of outer border
    
    // Let's create a 2x master canvas for crispness (1300 x 2048)
    const scale = 2;
    const canvasW = Math.round((rx * 2 + 32) * scale);
    const canvasH = Math.round((ry * 2 + 32) * scale);
    
    const c = document.getElementById("c");
    c.width = canvasW;
    c.height = canvasH;
    const ctx = c.getContext("2d");
    
    const targetCx = canvasW / 2;
    const targetCy = canvasH / 2;
    const targetRx = rx * scale;
    const targetRy = ry * scale;
    
    // 1. First, create a clipping path for the oval badge
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(targetCx, targetCy, targetRx, targetRy, 0, 0, Math.PI * 2);
    ctx.clip();
    
    // Draw the image scaled to fit inside the ellipse
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const srcX = cx - rx;
    const srcY = cy - ry;
    const srcW = rx * 2;
    const srcH = ry * 2;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, targetCx - targetRx, targetCy - targetRy, targetRx * 2, targetRy * 2);
    
    ctx.restore();
    
    // 2. Unsharp mask / sharpening filter on the badge content
    const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
    const d = imgData.data;
    const copy = new Uint8ClampedArray(d);
    
    // Sharpen kernel
    const kernel = [
      0, -0.3, 0,
      -0.3, 2.2, -0.3,
      0, -0.3, 0
    ];
    
    for (let y = 1; y < canvasH - 1; y++) {
      for (let x = 1; x < canvasW - 1; x++) {
        const idx = (y * canvasW + x) * 4;
        if (copy[idx + 3] === 0) continue; // transparent pixel
        
        let rSum = 0, gSum = 0, bSum = 0;
        let k = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const pidx = ((y + dy) * canvasW + (x + dx)) * 4;
            const weight = kernel[k++];
            rSum += copy[pidx] * weight;
            gSum += copy[pidx + 1] * weight;
            bSum += copy[pidx + 2] * weight;
          }
        }
        d[idx] = Math.min(255, Math.max(0, rSum));
        d[idx + 1] = Math.min(255, Math.max(0, gSum));
        d[idx + 2] = Math.min(255, Math.max(0, bSum));
      }
    }
    ctx.putImageData(imgData, 0, 0);
    
    // 3. Now draw the STRONG, CRISP BORDER STROKES around the oval badge!
    // Outer subtle dark contour for pop on light backgrounds
    ctx.beginPath();
    ctx.ellipse(targetCx, targetCy, targetRx + 1 * scale, targetRy + 1 * scale, 0, 0, Math.PI * 2);
    ctx.lineWidth = 1.5 * scale;
    ctx.strokeStyle = "rgba(20, 12, 8, 0.6)";
    ctx.stroke();
    
    // Main Solid Warm Gold Metallic Border (Double stroke like original emblem)
    const goldGrad = ctx.createLinearGradient(targetCx - targetRx, targetCy - targetRy, targetCx + targetRx, targetCy + targetRy);
    goldGrad.addColorStop(0, "#e8bc78");
    goldGrad.addColorStop(0.3, "#f4d090");
    goldGrad.addColorStop(0.5, "#d99d45");
    goldGrad.addColorStop(0.7, "#f5d496");
    goldGrad.addColorStop(1, "#c68632");
    
    // Main primary border stroke (4px thick)
    ctx.beginPath();
    ctx.ellipse(targetCx, targetCy, targetRx - 1 * scale, targetRy - 1 * scale, 0, 0, Math.PI * 2);
    ctx.lineWidth = 3.5 * scale;
    ctx.strokeStyle = goldGrad;
    ctx.stroke();
    
    // Inner crisp accent ring
    ctx.beginPath();
    ctx.ellipse(targetCx, targetCy, targetRx - 4 * scale, targetRy - 4 * scale, 0, 0, Math.PI * 2);
    ctx.lineWidth = 1 * scale;
    ctx.strokeStyle = "rgba(255, 240, 200, 0.75)";
    ctx.stroke();
    
    // Inner dark separator ring
    ctx.beginPath();
    ctx.ellipse(targetCx, targetCy, targetRx - 5.5 * scale, targetRy - 5.5 * scale, 0, 0, Math.PI * 2);
    ctx.lineWidth = 1 * scale;
    ctx.strokeStyle = "rgba(25, 15, 10, 0.85)";
    ctx.stroke();
    
    window.pngData = c.toDataURL("image/png");
    
    // Also create 600px height version
    const c600 = document.createElement("canvas");
    const h600 = 600;
    const w600 = Math.round(canvasW * (h600 / canvasH));
    c600.width = w600;
    c600.height = h600;
    const ctx600 = c600.getContext("2d");
    ctx600.imageSmoothingEnabled = true;
    ctx600.imageSmoothingQuality = "high";
    ctx600.drawImage(c, 0, 0, w600, h600);
    window.pngData600 = c600.toDataURL("image/png");
    
    // Favicon version (128x128)
    const cfav = document.createElement("canvas");
    cfav.width = 128;
    cfav.height = 128;
    const ctxfav = cfav.getContext("2d");
    ctxfav.imageSmoothingEnabled = true;
    ctxfav.imageSmoothingQuality = "high";
    // Center the oval in 128x128 square
    const favH = 120;
    const favW = Math.round(canvasW * (favH / canvasH));
    ctxfav.drawImage(c, (128 - favW) / 2, (128 - favH) / 2, favW, favH);
    window.faviconData = cfav.toDataURL("image/png");
    
    window.done = true;
  };
  img.src = "data:image/jpeg;base64,${imgBase64}";
</script></body></html>`;

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) });

let pngData = null;
let pngData600 = null;
let faviconData = null;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 200));
  const check = await send("Runtime.evaluate", { expression: "window.done ? 'yes' : ''" });
  if (check && check.result && check.result.value === 'yes') {
    const res1 = await send("Runtime.evaluate", { expression: "window.pngData" });
    const res2 = await send("Runtime.evaluate", { expression: "window.pngData600" });
    const res3 = await send("Runtime.evaluate", { expression: "window.faviconData" });
    pngData = res1.result.value;
    pngData600 = res2.result.value;
    faviconData = res3.result.value;
    break;
  }
}

if (!pngData || !pngData600) {
  throw new Error("Failed to generate logo data");
}

const bufMaster = Buffer.from(pngData.replace(/^data:image\/png;base64,/, ""), "base64");
const buf600 = Buffer.from(pngData600.replace(/^data:image\/png;base64,/, ""), "base64");
const bufFav = Buffer.from(faviconData.replace(/^data:image\/png;base64,/, ""), "base64");

await writeFile("assets/images/java-master-logo-updated.png", bufMaster);
await writeFile("assets/images/java-master-logo-updated-600.png", buf600);
await writeFile("assets/images/java-master-logo-white.png", bufMaster);
await writeFile("assets/images/java-master-logo-white-600.png", buf600);
await writeFile("assets/images/java-master-favicon-updated.png", bufFav);

console.log("Successfully built crisp logo with strong border!");
console.log("Master PNG bytes:", bufMaster.length, "600px PNG bytes:", buf600.length);

chrome.kill();
