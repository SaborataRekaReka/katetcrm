import fs from 'node:fs';
import path from 'node:path';

const roots = process.argv.slice(2);
if (roots.length === 0) {
  console.error('Usage: node check-no-skips.mjs <folder> [folder2 ...]');
  process.exit(2);
}

const forbidden = [
  { label: 'test.skip', regex: /\btest\.skip\s*\(/g },
  { label: 'test.fixme', regex: /\btest\.fixme\s*\(/g },
  { label: 'describe.skip', regex: /\bdescribe\.skip\s*\(/g },
  { label: '.only', regex: /\b(?:test|it|describe)\.only\s*\(/g },
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, out);
      continue;
    }
    if (!/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) continue;
    out.push(abs);
  }
  return out;
}

const findings = [];
for (const root of roots) {
  for (const file of walk(path.resolve(root))) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');

    for (const rule of forbidden) {
      const matches = text.match(rule.regex);
      if (!matches) continue;
      findings.push(`${rel}: found ${matches.length} occurrence(s) of ${rule.label}`);
    }
  }
}

if (findings.length > 0) {
  console.error('No-skip guard failed. Remove skipped/fixme/only markers:');
  for (const msg of findings) console.error(`- ${msg}`);
  process.exit(1);
}

console.log('No-skip guard passed.');
