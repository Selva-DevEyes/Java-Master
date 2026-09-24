import { readFile } from "node:fs/promises";

const pages = [
  "index.html",
  "roasters.html",
  "jm-1500.html",
  "profect.html",
  "coffee.html",
  "coffee-chronicles.html",
  "success-stories.html",
  "success-story-detail.html",
  "about.html",
  "contact.html"
];

for (const p of pages) {
  const content = await readFile(p, "utf-8");
  const mainIdx = content.indexOf("<main");
  const mainSlice = content.slice(mainIdx, mainIdx + 2000);
  console.log(`\n================== ${p} ==================`);
  const imgMatches = [...mainSlice.matchAll(/<(?:img|source)[^>]+(?:src|srcset)="([^"]+)"/gi)].map(m => m[1]);
  console.log("Images found in top of main:", imgMatches);
  const heroBlock = mainSlice.match(/<(?:section|header|div)[^>]*class="[^"]*(?:hero|story-brand)[^"]*"[\s\S]*?<\/(?:section|header|div)>/i);
  if (heroBlock) {
    console.log("Hero snippet:\n", heroBlock[0].slice(0, 400));
  }
}
