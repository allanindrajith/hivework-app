import fs from "node:fs";
import path from "node:path";

const baseDir = "src-tauri/resources/corpus-baseline";
const divFile = path.join(baseDir, "divisions.json");
const divData = JSON.parse(fs.readFileSync(divFile, "utf8")).divisions;

const categories = [];
const agents = [];

function collectMdFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out.sort();
}

for (const [slug, info] of Object.entries(divData)) {
  const dir = path.join(baseDir, slug);
  const files = collectMdFiles(dir);
  const count = files.length;
  for (const filePath of files) {
    const f = path.basename(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    const agentSlug = f.replace(/\.md$/, "");
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;
    let name = agentSlug;
    let description = "";
    let emoji = null;
    let color = info.color;
    let vibe = null;
    const lines = fmMatch[1].split("\n");
    for (const line of lines) {
      const colon = line.indexOf(":");
      if (colon > 0) {
        const k = line.slice(0, colon).trim();
        const v = line.slice(colon + 1).trim().replace(/^["'\s]+|["'\s]+$/g, "");
        if (k === "name") name = v;
        else if (k === "description") description = v;
        else if (k === "emoji") emoji = v;
        else if (k === "color") color = v;
        else if (k === "vibe") vibe = v;
      }
    }
    agents.push({
      slug: agentSlug,
      name,
      description,
      category: slug,
      emoji,
      color,
      vibe,
      body: content.slice(fmMatch[0].length).trim()
    });
  }
  categories.push({
    slug,
    label: info.label,
    icon: info.icon,
    color: info.color,
    count
  });
}

console.log(`Parsed ${agents.length} agents across ${categories.length} categories.`);
fs.writeFileSync("static/corpus-baseline.json", JSON.stringify({ agents, categories }, null, 2));
