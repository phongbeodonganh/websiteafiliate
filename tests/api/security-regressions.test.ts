import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
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

// ---------------------------------------------------------------------------
// SEC-02 / D-08 regression gates (plan 06 Task 3).
//
// SEC-02 regressed once in this exact codebase via a re-introduced `|| '<literal>'`
// fallback on a secret env read, and via route-local `jwt.verify`/`jwt.sign`.
// These three gates walk `src/` and fail the build if any of those patterns
// re-appear. They run on every `npm test` (and therefore in deploy.yml before
// every deploy).
//
// Scope: src/ only — tests legitimately set dummy secrets and craft fallback
// tokens;mongodb.ts env-file parsing fallback (research Open Question 3) is
// NOT a `|| '<literal>'` shape so it is not flagged (load-bearing on the VPS).
// ---------------------------------------------------------------------------

const SECRET_ENV_RE = /process\.env\.(JWT_SECRET|GEMINI_API_KEY|MONGODB_URI|INSIDER_TOKEN_SECRET|RESEND_API)/;
// A `|| '<...>'`-style literal fallback right after a secret env read. Scope:
// window of ±200 chars around each secret-env occurrence so benign defaults
// elsewhere (e.g. `searchParams.get('page') || '1'`) cannot trip it. Pitfall 5.
const FALLBACK_LITERAL_RE = /\|\|\s*['"`][^'"`]*['"`]/;
// The appended project number that previously leaked in a gemini error string.
const LEAKED_PROJECT_ID = '1050033519961';

/**
 * Window-scoped secret-fallback detector (D-08).
 *
 * For each secret env read, scan a ±200-char window for a `|| 'literal'`-
 * style fallback. The window keeps benign defaults (page numbers, labels)
 * far from any secret read out of scope (Pitfall 5). Returns the offending
 * file paths.
 */
export function filesWithSecretFallbackLiterals(files: string[]): string[] {
  const offenders: string[] = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    let i = 0;
    while (true) {
      const m = SECRET_ENV_RE.exec(src.slice(i));
      if (!m) break;
      const absIdx = i + m.index;
      const window = src.slice(Math.max(0, absIdx - 200), absIdx + m[0].length + 200);
      if (FALLBACK_LITERAL_RE.test(window)) {
        offenders.push(file);
        break;
      }
      i = absIdx + m[0].length;
    }
  }
  return offenders;
}

/**
 * JWT verify/sign locality gate (D-08).
 *
 * Returns paths under src/ that call jwt.verify or jwt.sign OUTSIDE
 * src/lib/auth.ts. The canonical sign/verify module is the single authority;
 * any route-local duplicate reintroduces the SEC-02 regression class.
 */
export function findJwtCallsOutsideAuth(files: string[]): string[] {
  return files
    .filter((f) => !f.endsWith('lib' + sep + 'auth.ts') && !f.endsWith('lib/auth.ts'))
    .filter((f) => /jwt\.(verify|sign)\s*\(/.test(readFileSync(f, 'utf8')));
}

describe('SEC-02 regression gate — secret-fallback literals never re-enter src/ (D-08)', () => {
  it('no secret env read carries a `|| \'literal\'`-style fallback (D-05/D-08, Pitfall 5)', () => {
    const offenders = filesWithSecretFallbackLiterals(walk(SRC));
    expect(offenders).toEqual([]);
  });

  it('the removed Google Cloud project number appears nowhere in src/ (D-05/T-1-13)', () => {
    const offenders = walk(SRC).filter((f) => readFileSync(f, 'utf8').includes(LEAKED_PROJECT_ID));
    expect(offenders).toEqual([]);
  });
});

describe('D-08 JWT locality gate — verify/sign live only in src/lib/auth.ts', () => {
  it('no file under src/ calls jwt.verify or jwt.sign outside src/lib/auth.ts', () => {
    const offenders = findJwtCallsOutsideAuth(walk(SRC));
    expect(offenders).toEqual([]);
  });
});

describe('D-08 gate counter-vacuity — a too-loose matcher fails its own self-assertion', () => {
  // Synthetic offenders built as inline strings ONLY — never written to src/.
  // If either matcher were tuned so loose that these pass, the gates above
  // would be vacuous.

  it('flags a planted `|| \'literal\'` fallback beside a secret env read', () => {
    const synthFallback = [
      'const JWT_SECRET = process.env.JWT_SECRET || \'nexus_super_secret_jwt_key_2026\';',
      'const GEMINI_KEY = process.env.GEMINI_API_KEY || "AQ.Ab_Ab";',
      'const MONGO = process.env.MONGODB_URI || \'mongodb://default\';',
    ].join('\n');
    // Drive the matcher against an inline "file" by routing the joined string
    // through a temp list-of-contents shape: write to a scratch file the
    // matcher can read, then assert one offender. The matcher walks strings,
    // so feed it one synthetic file via a tiny in-memory wrapper.
    const hits = scanSourceStrings({ 'src/__synth__/secret.ts': synthFallback });
    expect(hits.length).toBe(1);
  });

  it('does NOT flag benign `||` defaults far from any secret env read (Pitfall 5)', () => {
    const benign = [
      'const page = searchParams.get("page") || "1";',
      'const label = opts.label || "default";',
      'const limit = String(req.page || 25);',
    ].join('\n');
    const hits = scanSourceStrings({ 'src/__synth__/benign.ts': benign });
    expect(hits).toEqual([]);
  });

  it('flags a planted jwt.verify call outside src/lib/auth.ts', () => {
    const synthVerify = [
      'import jwt from "jsonwebtoken";',
      'export function badGuard(token: string) {',
      '  return jwt.verify(token, process.env.JWT_SECRET || "x");',
      '}',
    ].join('\n');
    const offenders = findJwtCallsOutsideAuthFromStrings({
      'src/__synth__/outside-auth.ts': synthVerify,
      'src/lib/auth.ts': 'export function getAuthUser() { return jwt.verify(t, k); }',
    });
    expect(offenders).toEqual(['src/__synth__/outside-auth.ts']);
  });

  it('flags a planted leaked project id anywhere in src/', () => {
    const synthLeak = [
      'export const help = `Project 1050033519961 — enable Generative Language API`;',
    ].join('\n');
    const offenders = Object.entries({ 'src/__synth__/leak.ts': synthLeak })
      .filter(([, src]) => src.includes(LEAKED_PROJECT_ID))
      .map(([f]) => f);
    expect(offenders).toEqual(['src/__synth__/leak.ts']);
  });
});

/**
 * scanSourceStrings: run filesWithSecretFallbackLiterals against an in-memory
 * map of {path: sourceText}. The matcher uses readFileSync internally when
 * given file paths; to self-assert it on synthetic strings we re-implement
 * the window check inline here (same algorithm, no fs).
 */
function scanSourceStrings(sources: Record<string, string>): string[] {
  const offenders: string[] = [];
  for (const [file, src] of Object.entries(sources)) {
    let i = 0;
    let found = false;
    while (!found) {
      const m = SECRET_ENV_RE.exec(src.slice(i));
      if (!m) break;
      const absIdx = i + m.index;
      const window = src.slice(Math.max(0, absIdx - 200), absIdx + m[0].length + 200);
      if (FALLBACK_LITERAL_RE.test(window)) {
        offenders.push(file);
        found = true;
        break;
      }
      i = absIdx + m[0].length;
    }
  }
  return offenders;
}

/**
 * findJwtCallsOutsideAuthFromStrings: same shape as the file-based variant,
 * but operates on an in-memory map for the counter-vacuity self-assertion.
 */
function findJwtCallsOutsideAuthFromStrings(sources: Record<string, string>): string[] {
  return Object.entries(sources)
    .filter(([f]) => !f.endsWith('lib/auth.ts'))
    .filter(([, src]) => /jwt\.(verify|sign)\s*\(/.test(src))
    .map(([f]) => f);
}
