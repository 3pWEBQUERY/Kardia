#!/usr/bin/env node
/**
 * Kardia UI – harte Regeln (PRD 8.1), im CI erzwungen:
 *  - keine Schatten, Verläufe, backdrop-filter (CSS und Tailwind-Utilities)
 *  - Farben nur über Tokens: keine Hex-Werte ausserhalb der Token-Dateien,
 *    keine Tailwind-Standardpalette (sie ist aus dem Theme entfernt und würde still ignoriert)
 *  - keine Emoji in der UI (Quelltexte und Übersetzungen)
 * Stylelint prüft CSS zusätzlich mit declaration-property-value-disallowed-list.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SCAN = ['apps/web/src', 'apps/web/messages', 'packages/ui/src', 'packages/ui/stories'];
const EXT = /\.(tsx?|css|json|mdx?)$/;
const TOKEN_FILES = new Set([
  'packages/ui/tokens.json',
  'packages/ui/src/tokens.css',
  'packages/ui/src/tokens.generated.ts',
]);
const IGNORE_DIRS = new Set(['node_modules', '.next', 'generated', 'storybook-static']);

const RULES = [
  { name: 'box-shadow/text-shadow', re: /\b(box|text)-shadow\s*:/ },
  { name: 'Verlauf', re: /\b(linear|radial|conic|repeating-linear|repeating-radial)-gradient\s*\(/ },
  { name: 'backdrop-filter', re: /\bbackdrop-filter\s*:/ },
  {
    name: 'Tailwind-Schatten/-Verlauf/-Blur',
    re: /(?<![\w-])(shadow|drop-shadow|inset-shadow|text-shadow)(-[\w[\]/.#()%-]+)?(?![\w-])(?=[^"'`]*["'`])|(?<![\w-])bg-(gradient|linear|radial|conic)-[\w[\]-]+|(?<![\w-])backdrop-[\w-]+/,
    onlyIn: /\.tsx?$/,
  },
  {
    name: 'Tailwind-Standardpalette',
    re: /(?<![\w-])(bg|text|border|ring|outline|fill|stroke|divide|accent|caret|decoration|placeholder)-(red|blue|green|gray|slate|zinc|neutral|stone|orange|amber|yellow|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose|black|white)(-\d{2,3})?(?![\w-])/,
    onlyIn: /\.tsx?$/,
  },
  { name: 'Hex-Farbe ausserhalb der Tokens', re: /(?<![\w&/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/, skipTokens: true },
  { name: 'Emoji', re: /\p{Extended_Pictographic}/u },
];

function walk(dir) {
  let out = [];
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (IGNORE_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (EXT.test(name)) out.push(full);
  }
  return out;
}

const files = [...SCAN.flatMap((d) => walk(join(root, d))), join(root, 'packages/ui/tokens.json')];
const problems = [];
for (const file of files) {
  const rel = relative(root, file).split('\\').join('/');
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes('design-rules-ignore')) return;
    for (const rule of RULES) {
      if (rule.onlyIn && !rule.onlyIn.test(rel)) continue;
      if (rule.skipTokens && TOKEN_FILES.has(rel)) continue;
      if (rule.name.startsWith('Hex') && /^\s*(\/\/|\*|\/\*)/.test(line)) continue;
      if (rule.name === 'Emoji' && TOKEN_FILES.has(rel)) continue;
      const m = line.match(rule.re);
      if (m) problems.push(`${rel}:${i + 1}  ${rule.name}: "${m[0]}"`);
    }
  });
}

if (problems.length) {
  console.error(`Designregeln verletzt (PRD 8.1):\n${problems.join('\n')}`);
  process.exit(1);
}
console.warn(`Designregeln eingehalten (${files.length} Dateien geprüft).`);
