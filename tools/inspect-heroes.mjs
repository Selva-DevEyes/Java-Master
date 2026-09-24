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
  const heroMatch = content.match(/<(?:section|header|div)[^>]*class="[^"]*hero[^"]*"[\s\S]*?<\/(?:section|header|div)>/i);
  if (heroMatch) {
    const imgTags = [...heroMatch[0].matchAll(/<(?:img|source)[^>]+(?:src|srcset)="([^"]+)"/gi)].map(m => m[1]);
    console.log(`=== ${p} ===`);
    console.log(imgTags);
  } else {
    console.log(`=== ${p} (no hero match) ===`);
  }
}
