import { describe, it, expect } from "vitest";
import { SKILL_FILES } from "../src/skills/content.js";
import { flatSkillFiles } from "../scripts/generate-skill-content.js";
import { readSkillSources, selfContainedSkills } from "../scripts/skill-transform.js";

describe("embedded skill content", () => {
  it("matches the skill sources in src/skills (else run npm run build:skill-content)", () => {
    expect(SKILL_FILES).toEqual(flatSkillFiles(selfContainedSkills(readSkillSources())));
  });
});
