import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = fileURLToPath(new URL("../", import.meta.url));
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const pages = ["index.html", "roasters.html", "jm-1500.html", "profect.html", "coffee.html", "success-stories.html", "success-story-detail.html", "about.html", "contact.html"];
const widths = [1920, 1440, 1280, 1024, 768, 760, 480, 430, 390, 360];
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };

const server = createServer(async (request, response) => {
  try {
    const relative = decodeURIComponent(new URL(request.url, "http://localhost").pathname).replace(/^\/+/, "") || "index.html";
    const path = normalize(join(root, relative));
    if (!path.startsWith(root)) throw new Error("Invalid path");
    response.writeHead(200, { "Content-Type": mime[extname(path)] || "application/octet-stream" });
    response.end(await readFile(path));
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const sitePort = server.address().port;
const profile = await mkdtemp(join(tmpdir(), "java-master-qa-"));
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
const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`http://127.0.0.1:${sitePort}/index.html`)}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let requestId = 0;
const pending = new Map();
const listeners = new Map();
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const promise = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) promise?.reject(new Error(message.error.message));
    else promise?.resolve(message.result);
    return;
  }
  const queue = listeners.get(message.method);
  if (queue?.length) queue.shift()(message.params);
});

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++requestId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const once = (method) => new Promise((resolve) => {
  const queue = listeners.get(method) || [];
  queue.push(resolve);
  listeners.set(method, queue);
});
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  return result.result.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Page.addScriptToEvaluateOnNewDocument", { source: `
  window.__qaErrors = [];
  addEventListener("error", (event) => window.__qaErrors.push(event.message || "Script error"));
  addEventListener("unhandledrejection", (event) => window.__qaErrors.push(String(event.reason)));
` });
const failures = [];
const checks = [];
const screenshots = new Set([1920, 1024, 768, 480, 360]);
const screenshotDir = join(root, "qa-screenshots");
await mkdir(screenshotDir, { recursive: true });

try {
  for (const width of widths) {
    const height = width <= 430 ? 844 : width <= 768 ? 900 : 1000;
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 760 });

    for (const page of pages) {
      const loaded = once("Page.loadEventFired");
      await send("Page.navigate", { url: `http://127.0.0.1:${sitePort}/${page}` });
      await loaded;
      await evaluate("document.fonts.ready.then(() => true)");
      const needsScreenshot = (page === "index.html" && (screenshots.has(width) || width === 1440)) || (page === "contact.html" && (width === 1440 || width === 390));
      await delay(needsScreenshot ? 600 : 80);

      const result = await evaluate(`(() => {
        const visible = (element) => {
          const style = getComputedStyle(element);
          return style.display !== "none" && style.visibility !== "hidden";
        };
        const rectProblem = [...document.querySelectorAll("h1,h2,h3,.button,input,select")]
          .filter(visible)
          .filter((element) => { const rect = element.getBoundingClientRect(); return rect.right > innerWidth + 1 || rect.left < -1; })
          .slice(0, 8)
          .map((element) => element.tagName.toLowerCase() + "." + element.className);
        const smallFields = [...document.querySelectorAll("input,select,textarea,.field label,[data-roi-calculator] output")]
          .filter(visible)
          .filter((element) => parseFloat(getComputedStyle(element).fontSize) < 16)
          .map((element) => element.tagName.toLowerCase() + "#" + element.id);
        const headingFonts = [...new Set([...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((element) => getComputedStyle(element).fontFamily.split(",")[0].replaceAll('"', "")))];
        const lineTexts = (element) => {
          const lines = new Map();
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            for (let index = 0; index < node.length; index += 1) {
              const range = document.createRange();
              range.setStart(node, index);
              range.setEnd(node, index + 1);
              const rect = range.getBoundingClientRect();
              const key = Math.round(rect.top);
              lines.set(key, (lines.get(key) || "") + node.data[index]);
            }
          }
          return [...lines.values()].map((line) => line.trim()).filter(Boolean);
        };
        const headingWidows = [...document.querySelectorAll("h1,h2,h3")]
          .filter(visible)
          .map((element) => ({ text: element.textContent.trim(), lines: lineTexts(element) }))
          .filter(({ text, lines }) => text.split(/\\s+/).length > 2 && lines.length > 1 && lines.at(-1).split(/\\s+/).length === 1)
          .map(({ text, lines }) => ({ text, lastLine: lines.at(-1) }));
        const unevenCardRows = [".process__item", ".benefit-card"].flatMap((selector) => {
          const rows = new Map();
          [...document.querySelectorAll(selector)].filter(visible).forEach((element) => {
            const rect = element.getBoundingClientRect();
            const key = Math.round(rect.top);
            const heights = rows.get(key) || [];
            heights.push(Math.round(rect.height));
            rows.set(key, heights);
          });
          return [...rows.values()].filter((heights) => heights.length > 1 && Math.max(...heights) - Math.min(...heights) > 1).map((heights) => ({ selector, heights }));
        });
        const description = document.querySelector(".hero__description");
        return {
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          scrollWidth: document.documentElement.scrollWidth,
          rectProblem,
          smallFields,
          headingFonts,
          headingWidows,
          unevenCardRows,
          heroLines: description ? Math.round(description.getBoundingClientRect().height / parseFloat(getComputedStyle(description).lineHeight)) : null,
          logoVisible: Boolean(document.querySelector(".site-header .brand__logo")?.getBoundingClientRect().height),
          searchVisible: Boolean(document.querySelector(".search-toggle")?.getBoundingClientRect().height),
          clientErrors: window.__qaErrors || []
        };
      })()`);

      checks.push({ width, page, ...result });
      if (result.overflow || result.rectProblem.length || result.smallFields.length || result.headingFonts.some((font) => !font.includes("Manrope")) || result.headingWidows.length || result.unevenCardRows.length || !result.logoVisible || !result.searchVisible || result.clientErrors.length) {
        failures.push({ width, page, ...result });
      }

      if (page === "index.html") {
        const searchState = await evaluate(`(async () => {
          const toggle = document.querySelector(".search-toggle");
          toggle.click();
          await new Promise((resolve) => setTimeout(resolve, 40));
          const input = document.querySelector(".site-search__input");
          input.value = "Profect";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          return { expanded: toggle.getAttribute("aria-expanded"), focused: document.activeElement === input, results: document.querySelectorAll(".site-search__result").length };
        })()`);
        await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
        await delay(220);
        const closedState = await evaluate(`({ expanded: document.querySelector(".search-toggle").getAttribute("aria-expanded"), hidden: document.querySelector(".site-search").hidden, focusReturned: document.activeElement === document.querySelector(".search-toggle") })`);
        if (searchState.expanded !== "true" || !searchState.focused || searchState.results < 1 || closedState.expanded !== "false" || !closedState.hidden || !closedState.focusReturned) failures.push({ width, page, searchState, closedState });

        if (width <= 900) {
          const menuState = await evaluate(`(() => { const button = document.querySelector(".nav-toggle"); button.click(); return { expanded: button.getAttribute("aria-expanded"), open: document.querySelector(".nav__menu").classList.contains("is-open") }; })()`);
          if (menuState.expanded !== "true" || !menuState.open) failures.push({ width, page, menuState });
          await evaluate("document.querySelector('.nav-toggle').click()");
        }

        if (screenshots.has(width)) {
          const image = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
          await writeFile(join(screenshotDir, `home-${width}.png`), Buffer.from(image.data, "base64"));
        }
        if (width === 1440 || width === 390) {
          await evaluate("scrollTo(0, document.documentElement.scrollHeight)");
          await delay(600);
          const image = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
          await writeFile(join(screenshotDir, `footer-${width}.png`), Buffer.from(image.data, "base64"));
        }
        if ([1440, 768, 360].includes(width)) {
          const sections = [
            ["highlights", ".feature-highlights", ".feature-highlights"],
            ["process", ".process", ".process"],
            ["benefits", ".section--dark", "#benefits-title"],
            ["testimonial", ".testimonial-section", ".testimonial-section"],
            ["request-demo", ".request-demo", ".request-demo"]
          ];
          for (const [name, selector, anchor] of sections) {
            await evaluate(`(() => {
              const anchorElement = document.querySelector(${JSON.stringify(anchor)});
              const target = anchorElement?.closest("section") || document.querySelector(${JSON.stringify(selector)});
              target?.classList.add("is-visible");
              target?.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
              target?.scrollIntoView({ block: "start" });
            })()`);
            await delay(600);
            const clip = await evaluate(`(() => {
              const element = document.querySelector(${JSON.stringify(selector)});
              const anchorElement = document.querySelector(${JSON.stringify(anchor)});
              const target = anchorElement?.closest("section") || element;
              if (!target) return null;
              const rect = target.getBoundingClientRect();
              return { x: 0, y: rect.top + scrollY, width: document.documentElement.clientWidth, height: rect.height, scale: 1 };
            })()`);
            if (clip) {
              const image = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
              await writeFile(join(screenshotDir, `${name}-${width}.png`), Buffer.from(image.data, "base64"));
            }
          }
        }
      }

      if (page === "contact.html" && (width === 1440 || width === 390)) {
        const image = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
        await writeFile(join(screenshotDir, `contact-${width}.png`), Buffer.from(image.data, "base64"));
      }
    }
  }

  await writeFile(join(screenshotDir, "report.json"), JSON.stringify({ checks, failures }, null, 2));
  console.log(JSON.stringify({ pages: pages.length, widths: widths.length, checks: checks.length, failures, screenshotDir }, null, 2));
} finally {
  socket.close();
  chrome.kill();
  await new Promise((resolve) => chrome.once("exit", resolve));
  server.close();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await rm(profile, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      await delay(200);
    }
  }
}
