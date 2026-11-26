// Turns the skill sources under src/skills into self-contained skills: the
// shared rules and reference files copied into each skill, no slash commands.
// The sources name shared files by a Claude Code plugin path
// (${CLAUDE_PLUGIN_ROOT}/skills/...), a placeholder this rewrites to the
// relative path. It drops allowed-tools from the frontmatter; user-invocable
// stays. Used by the Desktop zip build and by the generator of the served skills.
//
//   import { readSkillSources, selfContainedSkills } from "./skill-transform.js";
//   const skills = selfContainedSkills(readSkillSources());
//   skills.news["references/filters.md"]  // file text
import { readdirSync, readFileSync, statSync } from "fs";
import { dirname, join, sep } from "path";
import { fileURLToPath } from "url";

export const SKILLS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "skills");

// the shared files live in their own folder, which is not a skill
const SHARED_DIR = "_shared";
export const SKILL_FILE = "SKILL.md";
const SHARED_FILE = "reporting.md";
const REFERENCES_DIR = "references";
// the plugin paths by which the skill sources name the shared files
const SHARED_PLUGIN_PATH = "${CLAUDE_PLUGIN_ROOT}/skills/_reporting.md";
const REFERENCES_PLUGIN_PATH = "${CLAUDE_PLUGIN_ROOT}/skills/references/";
// hosts ignore it for skills that do not come from a plugin
const PLUGIN_ONLY_KEY = "allowed-tools:";
export const FRONTMATTER = /^---\n([\s\S]*?\n)---\n/;

/**
 * Reads every file under the skills folder, skipping dotfiles.
 * @param {string} [dir] the skills folder, src/skills by default
 * @returns {Record<string, string>} file text by "/"-separated path under dir,
 *   with line endings normalised to "\n"
 */
export function readSkillSources(dir = SKILLS_DIR) {
  const paths = readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => !path.split(sep).some((part) => part.startsWith(".")))
    .filter((path) => statSync(join(dir, path)).isFile())
    .sort();
  return Object.fromEntries(
    paths.map((path) => [path.split(sep).join("/"), readFileSync(join(dir, path), "utf8").replaceAll("\r\n", "\n")]),
  );
}

/**
 * Builds one self-contained skill per skill folder. Files at the top level of
 * the sources are not part of any skill and are left out.
 * @param {Record<string, string>} sources file text by path, as readSkillSources returns
 * @returns {Record<string, Record<string, string>>} per skill name, file text by
 *   path under the skill's folder ("SKILL.md", "reporting.md", "references/...")
 * @throws {Error} when a skill folder has no SKILL.md, a skill file clashes with
 *   a shared one, or a file still names a Claude Code path or command
 */
export function selfContainedSkills(sources) {
  // split the sources into the shared files and each skill's own files
  const shared = {};
  const own = {};
  for (const [path, text] of Object.entries(sources)) {
    const slash = path.indexOf("/");
    if (slash < 0) continue;
    const folder = path.slice(0, slash);
    const rest = path.slice(slash + 1);
    if (folder === SHARED_DIR) shared[rest] = text;
    else (own[folder] ??= {})[rest] = text;
  }

  return Object.fromEntries(
    Object.keys(own)
      .sort()
      .map((name) => [name, selfContainedSkill(name, own[name], shared)]),
  );
}

function selfContainedSkill(name, own, shared) {
  if (!(SKILL_FILE in own)) throw new Error(`skill folder '${name}' has no ${SKILL_FILE}`);
  const clash = Object.keys(shared).find((path) => path in own);
  if (clash) throw new Error(`skill '${name}' has its own '${clash}', which clashes with the shared one`);

  const files = { ...shared, ...own };
  return Object.fromEntries(
    Object.keys(files)
      .sort()
      .map((path) => [path, selfContainedFile(name, path, files[path])]),
  );
}

function selfContainedFile(name, path, source) {
  const text = path === SKILL_FILE ? withoutPluginKeys(source) : source;
  const result = text
    .replace("Read by every skill in this plugin", "Read by every NewsAPI.ai research skill")
    .replaceAll(`\`${SHARED_PLUGIN_PATH}\``, `\`${SHARED_FILE}\` (in this skill's folder)`)
    .replaceAll(`\`${REFERENCES_PLUGIN_PATH}`, `\`${REFERENCES_DIR}/`)
    .replace(/^- `\/newsapi:[a-z-]+`( — .*)?$/gm, (_, rest) => `- No question given${rest ?? " — asks for the research question"}`)
    .replace(/`\/newsapi:[a-z-]+ ("[^"]*")`/g, "`$1`");
  if (result.includes("/newsapi:") || result.includes("CLAUDE_PLUGIN_ROOT")) {
    throw new Error(`skill '${name}' file '${path}' still carries a Claude Code reference`);
  }
  return result;
}

function withoutPluginKeys(source) {
  return source.replace(FRONTMATTER, (_, fields) => {
    const kept = fields.split("\n").filter((line) => !line.startsWith(PLUGIN_ONLY_KEY));
    return `---\n${kept.join("\n")}---\n`;
  });
}
