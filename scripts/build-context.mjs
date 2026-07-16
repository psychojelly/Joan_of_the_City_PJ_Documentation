// Builds the knowledge base for the docs chat assistant (/api/chat).
// Strips every page's HTML down to readable text and writes api/_docs-context.json.
//
// Run after editing any page:  node scripts/build-context.mjs
// (Vercel also runs this automatically on deploy — see vercel.json buildCommand —
// but committing the regenerated file keeps local dev and diffs honest.)

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Very small HTML → text converter, good enough for prompt context. */
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(h[1-4])[^>]*>/gi, "\n\n## ")
    .replace(/<(li)[^>]*>/gi, "\n- ")
    .replace(/<(tr)[^>]*>/gi, "\n")
    .replace(/<(td|th)[^>]*>/gi, " | ")
    .replace(/<(p|div|section|br|pre)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const pages = readdirSync(root)
  .filter((f) => f.endsWith(".html"))
  .sort()
  .map((f) => {
    const html = readFileSync(join(root, f), "utf8");
    const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? f).trim();
    return { file: f, title, text: htmlToText(html) };
  });

const context = pages
  .map((p) => `\n\n===== PAGE: ${p.title} (${p.file}) =====\n\n${p.text}`)
  .join("");

mkdirSync(join(root, "api"), { recursive: true });
writeFileSync(
  join(root, "api", "_docs-context.json"),
  JSON.stringify({ generatedAt: null, pages: pages.length, context }, null, 0),
);

console.log(
  `Wrote api/_docs-context.json — ${pages.length} pages, ${context.length.toLocaleString()} chars`,
);
