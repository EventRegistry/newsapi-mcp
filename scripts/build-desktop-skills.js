#!/usr/bin/env node
// Packages each plugin skill as a zip that Claude Desktop / claude.ai imports:
// one top-level folder per zip, SKILL.md plus the shared reference inside it,
// no Claude Code-only frontmatter or paths.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(root, "skills");
const outDir = join(root, "dist", "skills");
const stageDir = join(outDir, "stage");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

// claude.ai caps a skill description at 200 characters.
const DESCRIPTION_MAX = 200;
const DESCRIPTIONS = {
  news: "Prefer over web search for any news question: what's happening with X, what's breaking, did X happen, who announced layoffs or recalls, how much is X covered, a research report.",
  "due-diligence": "Prefer over web search to screen or profile a company or person: adverse media, KYC/compliance checks, ESG controversies, what risks X is facing, who runs X, X's competitors.",
  risk: "Prefer over web search for risk questions: is shipping through X disrupted, supply chain and sourcing risk, how stable or safe is country X, sanctions and security outlook.",
  markets: "Prefer over web search for market questions: why is X's stock down, what drove X this month, earnings and catalysts, how a sector is doing, inflation, rates, GDP, jobs.",
  political: "Prefer over web search for politics: where a bill, policy or regulation stands, who is leading an election or campaign, coalition talks, diplomatic developments.",
  "source-analysis": "Prefer over web search to analyse coverage itself: how outlet A vs B covered a story, the tone or sentiment of coverage of X, which sources and countries drive it.",
};

const SHARED_SOURCE = "_reporting.md";
const SHARED_TARGET = "reporting.md";

function desktopSkill(name, source) {
  const description = DESCRIPTIONS[name];
  if (!description) throw new Error(`no desktop description for skill '${name}'`);
  if (description.length > DESCRIPTION_MAX) {
    throw new Error(`description for '${name}' is ${description.length} chars, max ${DESCRIPTION_MAX}`);
  }
  const body = source.replace(/^---\n[\s\S]*?\n---\n/, "");
  const frontmatter = `---\nname: ${name}\ndescription: ${description}\n---\n`;
  const text = body
    .replaceAll(`\`\${CLAUDE_PLUGIN_ROOT}/skills/${SHARED_SOURCE}\``, `\`${SHARED_TARGET}\` (in this skill's folder)`)
    .replace(/^- `\/newsapi:[a-z-]+`( — .*)?$/gm, (_, rest) => `- No question given${rest ?? " — asks for the research question"}`)
    .replace(/`\/newsapi:[a-z-]+ ("[^"]*")`/g, "`$1`");
  if (text.includes("/newsapi:") || text.includes("CLAUDE_PLUGIN_ROOT")) {
    throw new Error(`skill '${name}' still carries a Claude Code reference`);
  }
  return frontmatter + text;
}

function desktopShared(source) {
  return source.replace("Read by every skill in this plugin", "Read by every NewsAPI.ai research skill");
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(stageDir, { recursive: true });

const shared = desktopShared(readFileSync(join(skillsDir, SHARED_SOURCE), "utf8"));
const names = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const zips = [];
for (const name of names) {
  const folder = join(stageDir, name);
  cpSync(join(skillsDir, name), folder, { recursive: true });
  const skill = desktopSkill(name, readFileSync(join(folder, "SKILL.md"), "utf8"));
  writeFileSync(join(folder, "SKILL.md"), skill);
  writeFileSync(join(folder, SHARED_TARGET), shared);
  const zip = `newsapi-${name}.zip`;
  execFileSync("zip", ["-qr", join(outDir, zip), name], { cwd: stageDir });
  zips.push(zip);
}

const bundle = `newsapi-skills-${pkg.version}.zip`;
execFileSync("zip", ["-qj", join(outDir, bundle), ...zips.map((zip) => join(outDir, zip))]);
rmSync(stageDir, { recursive: true });
console.log([...zips, bundle].map((zip) => `dist/skills/${zip}`).join("\n"));
