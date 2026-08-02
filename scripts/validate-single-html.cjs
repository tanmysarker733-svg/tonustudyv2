const fs = require("node:fs");

const file = process.argv[2];
if (!file) throw new Error("Usage: node scripts/validate-single-html.cjs <file.html>");

const source = fs.readFileSync(file, "utf8");
const scripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((code) => code.trim());

for (const code of scripts) new Function(code);

console.log(JSON.stringify({
  file,
  inlineScriptsParsed: scripts.length,
  replacementCharacters: (source.match(/\uFFFD/g) || []).length,
}, null, 2));
