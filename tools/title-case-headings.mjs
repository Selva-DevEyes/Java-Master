import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = (await readdir(root)).filter((file) => file.endsWith(".html"));
const minorWords = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "nor", "of", "on", "or", "per", "the", "to", "via", "with", "yet"]);
const preserve = new Map([["lb", "lb"], ["&amp;", "&amp;"]]);

const capitalize = (word) => {
  if (!word || /^\d/.test(word) || /^[A-Z\d.]+$/.test(word)) return word;
  const match = word.match(/^([^\p{L}]*)([\p{L}])(.*)$/u);
  if (!match) return word;
  return `${match[1]}${match[2].toLocaleUpperCase()}${match[3]}`;
};

const formatWord = (word, index, words) => {
  const plain = word.replace(/^[^\p{L}&]+|[^\p{L};]+$/gu, "").toLocaleLowerCase();
  if (preserve.has(plain)) return word.replace(new RegExp(plain, "i"), preserve.get(plain));
  if (index > 0 && index < words.length - 1 && minorWords.has(plain)) return word.toLocaleLowerCase();
  return word.split("-").map(capitalize).join("-");
};

for (const file of files) {
  const path = join(root, file);
  let html = await readFile(path, "utf8");
  html = html.replace(/<(h[1-6])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (heading, tag, attributes = "", content) => {
    if (/<[^>]+>/.test(content)) return heading;
    const words = content.split(/(\s+)/);
    const visibleWords = words.filter((word) => !/^\s+$/.test(word));
    let index = 0;
    const formatted = words.map((word) => {
      if (/^\s+$/.test(word)) return word;
      const result = formatWord(word, index, visibleWords);
      index += 1;
      return result;
    }).join("");
    return `<${tag}${attributes}>${formatted}</${tag}>`;
  });
  await writeFile(path, html, "utf8");
}
