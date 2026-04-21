import { skillFrontmatterSchema, type SkillFrontmatter } from './types';

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  body: string;
}

const FRONTMATTER_RE = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/;

export function parseSkillFile(text: string): ParsedSkill {
  const match = FRONTMATTER_RE.exec(text);
  if (!match) {
    throw new Error('SKILL.md is missing YAML frontmatter (--- ... ---)');
  }
  const [, yaml, body] = match;
  const raw = parseYaml(yaml);
  const frontmatter = skillFrontmatterSchema.parse(raw);
  return { frontmatter, body: body.trim() };
}

type YamlValue = string | number | boolean | null | YamlValue[] | { [k: string]: YamlValue };

/**
 * Minimal YAML subset sufficient for SKILL.md frontmatter:
 *  - scalar strings, numbers, booleans, null
 *  - `>-` folded scalars (joined with single spaces, newlines collapsed)
 *  - arrays of scalars (`- foo`)
 *  - arrays of objects (`- key: value` with sibling indented fields)
 *  - `#` comments, blank lines
 * Anything outside this subset throws so authors don't ship broken skills.
 */
export function parseYaml(input: string): Record<string, YamlValue> {
  const lines = input.split(/\r?\n/).map((l) => l.replace(/\t/g, '  '));
  const { value } = parseBlock(lines, 0, 0);
  if (typeof value !== 'object' || Array.isArray(value) || value === null) {
    throw new Error('SKILL.md frontmatter must be a YAML mapping at the top level');
  }
  return value as Record<string, YamlValue>;
}

function parseBlock(
  lines: string[],
  start: number,
  indent: number,
): { value: YamlValue; end: number } {
  const obj: Record<string, YamlValue> = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }
    const lineIndent = leadingSpaces(line);
    if (lineIndent < indent) break;
    if (lineIndent > indent) {
      throw new Error(`Unexpected indent at line ${i + 1}: "${line}"`);
    }
    const trimmed = line.slice(lineIndent);
    if (trimmed.startsWith('- ')) {
      throw new Error(`Unexpected list item at mapping scope (line ${i + 1})`);
    }
    const colonIdx = findColon(trimmed);
    if (colonIdx === -1) {
      throw new Error(`Expected "key: value" at line ${i + 1}: "${line}"`);
    }
    const key = trimmed.slice(0, colonIdx).trim();
    const rest = trimmed.slice(colonIdx + 1).trim();

    if (rest === '' || rest === '>-' || rest === '>' || rest === '|') {
      const childIndent = nextContentIndent(lines, i + 1);
      if (childIndent === null || childIndent <= indent) {
        obj[key] = rest === '' ? null : '';
        i++;
        continue;
      }
      if (rest === '>-' || rest === '>' || rest === '|') {
        const folded = collectFolded(lines, i + 1, childIndent, rest);
        obj[key] = folded.value;
        i = folded.end;
        continue;
      }
      if (looksLikeList(lines, i + 1, childIndent)) {
        const list = parseList(lines, i + 1, childIndent);
        obj[key] = list.value;
        i = list.end;
        continue;
      }
      const nested = parseBlock(lines, i + 1, childIndent);
      obj[key] = nested.value;
      i = nested.end;
      continue;
    }
    obj[key] = parseScalar(rest);
    i++;
  }
  return { value: obj, end: i };
}

function parseList(
  lines: string[],
  start: number,
  indent: number,
): { value: YamlValue[]; end: number } {
  const out: YamlValue[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }
    const lineIndent = leadingSpaces(line);
    if (lineIndent < indent) break;
    if (lineIndent > indent) {
      throw new Error(`Unexpected indent inside list at line ${i + 1}`);
    }
    const trimmed = line.slice(lineIndent);
    if (!trimmed.startsWith('- ') && trimmed !== '-') {
      break;
    }
    const itemText = trimmed === '-' ? '' : trimmed.slice(2);
    if (itemText === '') {
      const nested = parseBlock(lines, i + 1, indent + 2);
      out.push(nested.value);
      i = nested.end;
      continue;
    }
    const colonIdx = findColon(itemText);
    if (colonIdx !== -1 && !isQuoted(itemText)) {
      const firstKey = itemText.slice(0, colonIdx).trim();
      const firstRest = itemText.slice(colonIdx + 1).trim();
      const itemObj: Record<string, YamlValue> = {
        [firstKey]: firstRest === '' ? null : parseScalar(firstRest),
      };
      let j = i + 1;
      while (j < lines.length) {
        const nl = lines[j];
        if (isBlank(nl)) {
          j++;
          continue;
        }
        const nlIndent = leadingSpaces(nl);
        if (nlIndent <= indent) break;
        if (nlIndent !== indent + 2) {
          throw new Error(`Unexpected indent in list-object at line ${j + 1}`);
        }
        const nested = parseBlock([nl], 0, indent + 2);
        Object.assign(itemObj, nested.value as Record<string, YamlValue>);
        j++;
      }
      out.push(itemObj);
      i = j;
      continue;
    }
    out.push(parseScalar(itemText));
    i++;
  }
  return { value: out, end: i };
}

function collectFolded(
  lines: string[],
  start: number,
  indent: number,
  style: string,
): { value: string; end: number } {
  const parts: string[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      parts.push('');
      i++;
      continue;
    }
    const lineIndent = leadingSpaces(line);
    if (lineIndent < indent) break;
    parts.push(line.slice(indent));
    i++;
  }
  while (parts.length && parts[parts.length - 1] === '') parts.pop();
  let value: string;
  if (style === '|') {
    value = parts.join('\n');
  } else {
    value = parts
      .reduce<string[]>((acc, p) => {
        if (p === '') acc.push('\n');
        else if (acc.length && acc[acc.length - 1] !== '\n') acc.push(' ' + p);
        else acc.push(p);
        return acc;
      }, [])
      .join('')
      .trim();
  }
  return { value, end: i };
}

function parseScalar(raw: string): YamlValue {
  const t = raw.trim();
  if (t === '' || t === '~' || t.toLowerCase() === 'null') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === '[]') return [];
  if (t === '{}') return {};
  if (/^-?\d+$/.test(t)) return Number(t);
  if (/^-?\d*\.\d+$/.test(t)) return Number(t);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function isBlank(line: string): boolean {
  const s = line.trim();
  return s === '' || s.startsWith('#');
}

function leadingSpaces(line: string): number {
  const m = /^(\s*)/.exec(line);
  return m ? m[1].length : 0;
}

function nextContentIndent(lines: string[], from: number): number | null {
  for (let i = from; i < lines.length; i++) {
    if (!isBlank(lines[i])) return leadingSpaces(lines[i]);
  }
  return null;
}

function looksLikeList(lines: string[], from: number, indent: number): boolean {
  for (let i = from; i < lines.length; i++) {
    if (isBlank(lines[i])) continue;
    if (leadingSpaces(lines[i]) !== indent) return false;
    const t = lines[i].slice(indent);
    return t.startsWith('- ') || t === '-';
  }
  return false;
}

function findColon(s: string): number {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === ':' && !inSingle && !inDouble) {
      if (i + 1 === s.length || s[i + 1] === ' ' || s[i + 1] === '\t') return i;
    }
  }
  return -1;
}

function isQuoted(s: string): boolean {
  const t = s.trim();
  return (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"));
}
