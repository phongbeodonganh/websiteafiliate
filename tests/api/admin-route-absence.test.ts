import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// CMS-05 / D-02 regression gate — the two orphaned editor pages stay deleted.
//
// D-01 makes `src/app/admin/page.tsx` the single canonical create/edit/publish
// surface; D-02 deletes `src/app/admin/articles/create/page.tsx` and
// `src/app/admin/articles/edit/[id]/page.tsx`. This file is the permanent
// tripwire that fails `npm test` if either route is restored, AND that proves
// the deleted paths are unreachable by construction — no `.ts`/`.tsx` under
// `src/` may reference them.
//
// Follows the filesystem-walk conventions of tests/api/security-regressions.test.ts.
// ---------------------------------------------------------------------------

const PROJECT_ROOT = process.cwd();
const SRC = join(PROJECT_ROOT, 'src');
const CREATE_PAGE = join(SRC, 'app', 'admin', 'articles', 'create', 'page.tsx');
const EDIT_PAGE = join(SRC, 'app', 'admin', 'articles', 'edit', '[id]', 'page.tsx');

// The substrings a restored link/redirect/import would have to contain. The grep
// is deliberately a plain substring check (no trailing-slash requirement) so any
// reference — a `<Link href>`, a `router.push`, a comment, a string literal —
// trips it.
const FORBIDDEN_REFERENCES = ['/admin/articles/create', '/admin/articles/edit'];

/** Recursively list .ts/.tsx files under `dir`. */
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

describe('CMS-05 regression gate — orphaned admin editor routes stay deleted (D-02)', () => {
  it('the /admin/articles/create page file does not exist on disk', () => {
    expect(() => statSync(CREATE_PAGE)).toThrow();
  });

  it('the /admin/articles/edit/[id] page file does not exist on disk', () => {
    expect(() => statSync(EDIT_PAGE)).toThrow();
  });

  it('no .ts/.tsx file under src/ references either deleted admin route path', () => {
    const files = walk(SRC);
    expect(files.length).toBeGreaterThan(0);
    const offenders = files
      .map((file) => {
        const source = readFileSync(file, 'utf8');
        const hits = FORBIDDEN_REFERENCES.filter((needle) => source.includes(needle));
        return { file, hits };
      })
      .filter((entry) => entry.hits.length > 0);
    expect(offenders).toEqual([]);
  });
});
