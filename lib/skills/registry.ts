import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseSkillFile } from './parser';
import type { Skill, SkillContext } from './types';

const SKILLS_DIR = join(process.cwd(), 'skills');

let builtinCache: Skill[] | null = null;

/**
 * Scan the filesystem `/skills` directory once per process and return the
 * built-in skills. Results are cached in-memory; in dev, restart to pick up
 * edits. Throws on invalid SKILL.md so broken skills fail fast at boot.
 */
export function loadBuiltinSkills(): Skill[] {
  if (builtinCache) return builtinCache;
  const out: Skill[] = [];
  let entries: string[];
  try {
    entries = readdirSync(SKILLS_DIR);
  } catch {
    builtinCache = [];
    return builtinCache;
  }
  for (const entry of entries) {
    const dir = join(SKILLS_DIR, entry);
    let isDir = false;
    try {
      isDir = statSync(dir).isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;
    const skillPath = join(dir, 'SKILL.md');
    let text: string;
    try {
      text = readFileSync(skillPath, 'utf8');
    } catch {
      continue;
    }
    try {
      const { frontmatter, body } = parseSkillFile(text);
      if (frontmatter.name !== entry) {
        throw new Error(
          `SKILL.md frontmatter name "${frontmatter.name}" does not match directory "${entry}"`,
        );
      }
      out.push({
        id: `builtin:${frontmatter.name}`,
        slug: frontmatter.name,
        scope: 'builtin',
        orgId: null,
        brandId: null,
        userId: null,
        frontmatter,
        body,
        sourcePath: dir,
        isBuiltin: true,
      });
    } catch (err) {
      throw new Error(
        `Failed to load skill "${entry}": ${(err as Error).message ?? String(err)}`,
      );
    }
  }
  out.sort((a, b) => a.slug.localeCompare(b.slug));
  builtinCache = out;
  return builtinCache;
}

/** Exposed for tests only. */
export function __resetBuiltinCacheForTests(): void {
  builtinCache = null;
}

/**
 * Resolve the full skill set available to a request, honoring scope precedence:
 * user > brand > org > global > builtin. When a custom scope defines a skill
 * with the same slug as a builtin, the custom one wins.
 */
export function mergeSkills(builtins: Skill[], custom: Skill[]): Skill[] {
  const winner = new Map<string, Skill>();
  const priority = (s: Skill): number => {
    switch (s.scope) {
      case 'user':
        return 5;
      case 'brand':
        return 4;
      case 'org':
        return 3;
      case 'global':
        return 2;
      case 'builtin':
        return 1;
    }
  };
  for (const s of [...builtins, ...custom]) {
    const existing = winner.get(s.slug);
    if (!existing || priority(s) > priority(existing)) {
      winner.set(s.slug, s);
    }
  }
  return Array.from(winner.values()).sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Load all skills visible to the given context. Custom rows come from the
 * `skills` table scoped by the (userId, brandId, orgId) triple; pass them in
 * as `customRows` — this function stays pure so it's trivial to test.
 */
export function resolveSkills(_ctx: SkillContext, customRows: Skill[]): Skill[] {
  return mergeSkills(loadBuiltinSkills(), customRows);
}
