import fs from "node:fs";
import path from "node:path";

const baseDir = "src-tauri/resources/corpus-baseline";
const divFile = path.join(baseDir, "divisions.json");
const divData = JSON.parse(fs.readFileSync(divFile, "utf8")).divisions;

const categories = [];
const agents = [];

for (const [slug, info] of Object.entries(divData)) {
  const dir = path.join(baseDir, slug);
  let count = 0;
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".md"));
    count = files.length;
    for (const f of files) {
      const content = fs.readFileSync(path.join(dir, f), "utf8");
      const agentSlug = f.replace(/\.md$/, "");
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      let name = agentSlug;
      let description = "";
      let emoji = null;
      let color = info.color;
      let vibe = null;
      if (fmMatch) {
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
      }
      agents.push({
        slug: agentSlug,
        name,
        description,
        category: slug,
        emoji,
        color,
        vibe,
        body: content.slice(fmMatch ? fmMatch[0].length : 0).trim()
      });
    }
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
