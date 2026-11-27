import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  readSkillSources,
  selfContainedSkills,
} from "../scripts/skill-transform.js";
import { SKILL_FILES } from "../src/skills/content.js";

// Runs the Desktop zip build and reads its zips back. Needs the `zip` and
// `unzip` binaries; the suite skips where they are missing (Windows).
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ZIP_DIR = fileURLToPath(new URL("../dist/skills", import.meta.url));
const DESCRIPTION_MAX = 200;

const hasZipTools = ["zip", "unzip"].every(
  (tool) => spawnSync(tool, ["-v"], { stdio: "ignore" }).status !== null,
);

if (!hasZipTools) {
  console.warn("zip tests skipped: the zip and unzip binaries are missing");
}

/** The skill names the transform builds from src/skills. */
function skillNames(): string[] {
  return Object.keys(selfContainedSkills(readSkillSources()));
}

function unzipPaths(zip: string): string[] {
  return execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" })
    .split("\n")
    .filter((path) => path !== "" && !path.endsWith("/"));
}

describe.skipIf(!hasZipTools)("Desktop skill zips", () => {
  beforeAll(() => {
    execFileSync(process.execPath, ["scripts/build-desktop-skills.js"], {
      cwd: ROOT,
      stdio: "ignore",
    });
  });

  it("writes one zip for each skill", () => {
    const zips = readdirSync(ZIP_DIR)
      .filter((file) => /^newsapi-.+\.zip$/.test(file))
      .filter((file) => !file.startsWith("newsapi-skills-"));

    expect(zips.sort()).toEqual(
      skillNames().map((name) => `newsapi-${name}.zip`).sort(),
    );
  });

  it("holds one top-level folder with SKILL.md, reporting.md and the references", () => {
    for (const name of skillNames()) {
      const expected = Object.keys(SKILL_FILES)
        .filter((key) => key.startsWith(`${name}/`))
        .sort();

      expect(unzipPaths(`${ZIP_DIR}/newsapi-${name}.zip`).sort(), name).toEqual(
        expected,
      );
    }
  });

  it("keeps the description at 200 characters or fewer", () => {
    for (const name of skillNames()) {
      const skill = execFileSync(
        "unzip",
        ["-p", `${ZIP_DIR}/newsapi-${name}.zip`, `${name}/SKILL.md`],
        { encoding: "utf8" },
      );
      // the whole value sits on one line: the next line is a key or the end
      const match = skill.match(/^description: (.+)\n(?:[\w-]+:|---)/m);
      const description = match?.[1];

      expect(description, name).toBeDefined();
      expect(description, name).not.toMatch(/^[>|]/);
      expect(description!.length, name).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });
});
