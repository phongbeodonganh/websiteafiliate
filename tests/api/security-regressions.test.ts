import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// SEC-01 regression gate (D-01/D-02/D-03) — "dọn dẹp triệt để" guard.
//
// The unauthenticated GET/POST /api/v1/seed route could once wipe every
// collection (UserModel.deleteMany({}) + admin/password123 upsert). The route,
// its lib implementation and the npm entry point were deleted in plan 01-02;
// this file is the permanent tripwire that fails `npm test` (and therefore the
// deploy.yml test step) if any of that surface is ever re-introduced.
//
// Note: tests/setup.ts still spins up MongoMemoryServer for this file — the
// suite-wide setup file runs for every test file; the fs gates below do not
// need the DB but the shared setup is harmless.
// ---------------------------------------------------------------------------

const PROJECT_ROOT = process.cwd();
const SRC = join(PROJECT_ROOT, 'src');
const API_DIR = join(SRC, 'app', 'api');
const SEED_ROUTE_DIR = join(SRC, 'app', 'api', 'v1', 'seed');

/**
 * Recursively list .ts/.tsx files under `dir`.
 */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Destructive-op scan (D-03).
 *
 * Flags `deleteMany(` calls whose filter argument is empty or absent — i.e. a
 * collection wipe — when the call is tied to the user/settings models:
 *   1. the receiver identifier looks like a User/Setting model
 *      (UserModel, SettingModel, User, Setting…), OR
 *   2. a `UserModel`/`SettingModel` identifier appears within ±200 chars of
 *      the call (covers aliased/destructured receivers and multi-model wipe
 *      loops like `for (const m of [UserModel, SettingModel]) m.deleteMany({})`).
 *
 * Carve-outs, documented intentionally:
 * - Filtered deletes are legitimate and never flagged
 *   (`deleteMany({ category_id: id })`, `deleteMany({ username })` …).
 * - `deleteMany(someFilterVariable)` is a static-analysis blind spot (the
 *   filter cannot be proven empty without type-level analysis); the gate
 *   targets the literal `{}`/no-arg wipe shape the seed surface used.
 * - Only `src/app/api/**` is walked: the deleted lib/ seed implementation
 *   (D-02) has no route call site anymore, and a helper that is not callable
 *   from any route cannot serve an HTTP attacker. Re-adding a destructive
 *   route is what this gate catches.
 * - `deleteOne`/`findOneAndDelete` are out of scope (single-document deletes,
 *   not bulk wipes).
 * - Tests (tests/**) are never scanned — suite teardown legitimately clears
 *   collections with `deleteMany({})`.
 */
export function findUnfilteredDestructiveDeletes(source: string): string[] {
  const offenders: string[] = [];
  // Empty-or-absent filter: `deleteMany()`, `deleteMany({})`, `deleteMany({}, opts)`.
  const callRe = /(?:([A-Za-z_$][\w$]*)\s*\.\s*)?deleteMany\s*\(\s*(?:\{\s*\}\s*)?[,)]/g;
  for (const match of source.matchAll(callRe)) {
    const receiver = match[1];
    const idx = match.index ?? 0;
    const window = source.slice(Math.max(0, idx - 200), idx + match[0].length + 200);
    const receiverIsUserish = receiver ? /^(user|setting)/i.test(receiver) : false;
    const nearUserOrSettingModel = /UserModel|SettingModel/.test(window);
    if (receiverIsUserish || nearUserOrSettingModel) {
      offenders.push(match[0].trim());
    }
  }
  return offenders;
}

describe('SEC-01 regression gate — seed surface stays deleted (D-01/D-02/D-03)', () => {
  it('the former /api/v1/seed route directory stays deleted (D-01)', () => {
    expect(() => statSync(SEED_ROUTE_DIR)).toThrow();
  });

  it('npm run seed no longer exists as a script (D-02 — Pitfall 1: no broken entry point)', () => {
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.seed).toBeUndefined();
  });

  it('no API route performs an unfiltered destructive delete on the user/settings models (D-03)', () => {
    const files = walk(API_DIR);
    expect(files.length).toBeGreaterThan(0);
    const offenders = files
      .map((file) => ({ file, hits: findUnfilteredDestructiveDeletes(readFileSync(file, 'utf8')) }))
      .filter((entry) => entry.hits.length > 0);
    expect(offenders).toEqual([]);
  });
});

describe('gate matcher sanity — counter-vacuity self-assertion (a too-loose tune fails here)', () => {
  // Synthetic offender built as an inline string ONLY — never written to src/.
  // If the matcher were tuned so loose that this passes, the whole gate above
  // would be vacuous.
  const SYNTHETIC_WIPE = [
    'import { connectToDatabase } from "@/lib/db/mongodb";',
    'import { UserModel, SettingModel } from "@/lib/db/models";',
    'export async function POST() {',
    '  await connectToDatabase();',
    '  await UserModel.deleteMany({});',
    '  await SettingModel.deleteMany({});',
    '  return Response.json({ status: "success" });',
    '}',
  ].join('\n');

  it('flags a deliberately-planted unfiltered wipe beside a UserModel reference', () => {
    const hits = findUnfilteredDestructiveDeletes(SYNTHETIC_WIPE);
    expect(hits.length).toBeGreaterThanOrEqual(2); // both wipes caught
  });

  it('does not flag legitimately-filtered deletes (real route pattern)', () => {
    const filtered = [
      'await SubCategoryModel.deleteMany({ category_id: id });',
      'await UserModel.deleteMany({ username: "expired-user" });',
      'await SettingModel.deleteMany({ updated_at: { $lt: cutoff } });',
    ].join('\n');
    expect(findUnfilteredDestructiveDeletes(filtered)).toEqual([]);
  });

  it('does not flag unfiltered deletes on unrelated models outside a user/settings context', () => {
    const unrelated = [
      'import { SessionModel } from "@/lib/db/models";',
      'await SessionModel.deleteMany({});',
    ].join('\n');
    expect(findUnfilteredDestructiveDeletes(unrelated)).toEqual([]);
  });
});
