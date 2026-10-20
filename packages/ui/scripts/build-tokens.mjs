import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import StyleDictionary from 'style-dictionary';

/**
 * Erzeugt aus tokens.json (einzige Quelle, PRD 13.4) die CSS-Variablen für Hell und
 * Dunkel sowie ein TS-Modul. Später kommen Swift/SwiftUI-Ausgaben dazu.
 * `--check` schlägt fehl, wenn die eingecheckten Dateien veraltet sind (CI).
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');
const EXT = 'ch.kardia';

const sd = new StyleDictionary({
  source: [`${root}tokens.json`],
  usesDtcg: true,
  log: { verbosity: 'silent' },
  platforms: {
    css: { transformGroup: 'css', files: [{ destination: 'tokens.css', format: 'kardia/css' }] },
    ts: { transformGroup: 'js', files: [{ destination: 'tokens.generated.ts', format: 'kardia/ts' }] },
  },
});

const name = (token) => token.path.join('-');
const dark = (token) => token.original.$extensions?.[EXT]?.dark;
const value = (token) => {
  const v = token.original.$value;
  if (token.$type === 'cubicBezier') return `cubic-bezier(${v.join(', ')})`;
  return v;
};

StyleDictionary.registerFormat({
  name: 'kardia/css',
  format: ({ dictionary }) => {
    const light = [];
    const darkVars = [];
    for (const token of dictionary.allTokens) {
      light.push(`  --k-${name(token)}: ${value(token)};`);
      const ext = token.original.$extensions?.[EXT];
      if (ext?.['line-height']) light.push(`  --k-${name(token)}--line-height: ${ext['line-height']};`);
      if (ext?.weight) light.push(`  --k-${name(token)}--weight: ${ext.weight};`);
      if (dark(token)) darkVars.push(`  --k-${name(token)}: ${dark(token)};`);
    }
    return [
      '/* Generiert aus tokens.json – nicht von Hand bearbeiten (pnpm --filter @kardia/ui tokens). */',
      ':root {',
      '  color-scheme: light;',
      ...light,
      '}',
      '',
      '@media (prefers-color-scheme: dark) {',
      '  :root:not([data-theme="light"]) {',
      '    color-scheme: dark;',
      ...darkVars.map((l) => `  ${l}`),
      '  }',
      '}',
      '',
      ':root[data-theme="dark"] {',
      '  color-scheme: dark;',
      ...darkVars,
      '}',
      '',
      '@media (prefers-reduced-motion: reduce) {',
      '  :root {',
      '    --k-motion-fast: 0ms;',
      '    --k-motion-base: 0ms;',
      '  }',
      '}',
      '',
    ].join('\n');
  },
});

StyleDictionary.registerFormat({
  name: 'kardia/ts',
  format: ({ dictionary }) => {
    const colors = {};
    for (const token of dictionary.allTokens.filter((t) => t.path[0] === 'color')) {
      colors[token.path[1]] = { light: value(token), dark: dark(token) ?? value(token) };
    }
    return [
      '// Generiert aus tokens.json – nicht von Hand bearbeiten.',
      `export const colors = ${JSON.stringify(colors, null, 2)} as const;`,
      '',
      'export type ColorToken = keyof typeof colors;',
      '',
    ].join('\n');
  },
});

const outputs = await sd.formatPlatform('css');
const ts = await sd.formatPlatform('ts');

let stale = false;
for (const { destination, output } of [...outputs, ...ts]) {
  const file = `${root}src/${destination}`;
  if (check) {
    let current = '';
    try {
      current = readFileSync(file, 'utf8');
    } catch {
      current = '';
    }
    if (current !== output) {
      console.error(`Veraltet: src/${destination} – bitte "pnpm --filter @kardia/ui tokens" ausführen.`);
      stale = true;
    }
  } else {
    writeFileSync(file, output);
  }
}
if (stale) process.exit(1);
