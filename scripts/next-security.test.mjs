// Guards against shipping Next.js versions affected by known critical advisories.
//
// GHSA-2464-fhr4-w9xw (critical, unauthenticated RCE in the Image Optimization API)
// and GHSA-p3m5-59mp-jv5r (high, App Router Server Actions DoS) affect every
// Next.js 15 release up to 15.5.27 and 16.x up to 16.4.0. The first patched
// releases are 15.5.28 and 16.4.1.
//
// Run with: node --test scripts/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIN_NEXT_15 = [15, 5, 28];
const MIN_NEXT_16 = [16, 4, 1];

function parse(version) {
  return version
    .replace(/^[^\d]*/, '')
    .split(/[.-]/)
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10));
}

const atLeast = (a, b) => {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
};

function isPatched(version) {
  const parsed = parse(version);
  if (parsed[0] === 15) return atLeast(parsed, MIN_NEXT_15);
  if (parsed[0] === 16) return atLeast(parsed, MIN_NEXT_16);
  return parsed[0] > 16;
}

const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

test('every Next.js package resolved in package-lock.json is patched', () => {
  const lock = readJson('package-lock.json');
  const nextPackages = Object.entries(lock.packages).filter(
    ([path]) => path === 'node_modules/next' || path.endsWith('/node_modules/next')
  );
  assert.ok(nextPackages.length > 0, 'expected next in package-lock.json');
  for (const [path, meta] of nextPackages) {
    assert.ok(isPatched(meta.version), `${path} resolves vulnerable next@${meta.version}`);
  }
});

test('every @next/swc binary pinned in the root package.json is patched', () => {
  const pkg = readJson('package.json');
  const swc = Object.entries(pkg.optionalDependencies ?? {}).filter(([name]) =>
    name.startsWith('@next/swc-')
  );
  assert.ok(swc.length > 0, 'expected @next/swc optional dependencies');
  for (const [name, range] of swc) {
    assert.ok(isPatched(range), `${name} pinned to vulnerable ${range}`);
  }
});

// The landing-site Dockerfiles run `npm install` without the workspace lockfile,
// so the declared range itself must exclude vulnerable releases.
for (const site of ['sites/landing-os', 'sites/landing-protocol']) {
  test(`${site} declares a patched Next.js floor`, () => {
    const { dependencies } = readJson(`${site}/package.json`);
    assert.ok(isPatched(dependencies.next), `${site} allows vulnerable next ${dependencies.next}`);
  });
}
