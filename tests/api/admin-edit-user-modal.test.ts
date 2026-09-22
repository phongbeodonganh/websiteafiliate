/**
 * CR-02 — source-contract ensuring the Edit-user modal is co-located inside
 * `UsersView`.
 *
 * Before this fix the modal JSX (`{showEditUserModal && editingUser && (`) lived
 * inside `BlacklistView` while its only trigger (`openEditUserModal(u)`) lived in
 * `UsersView`. Since `renderContent` mounts exactly one view per tab, clicking
 * Edit on the Users tab set state on an unmounted component — nothing rendered.
 *
 * This suite reads the admin page source and asserts:
 *   1. The modal block sits *after* the `const UsersView = () => (` marker and
 *      *before* the `const ArticlesView = () => (` marker (i.e. it is hosted by
 *      the UsersView region).
 *   2. The modal block sits *before* the `const BlacklistView = () => {` marker
 *      (i.e. it has not been re-nested in BlacklistView).
 *   3. The trigger (`openEditUserModal(u)`) and the modal marker are both
 *      present in the source.
 *   4. The modal content still satisfies UI-SPEC D-14: the title
 *      "Edit team member" is present and there is no password input field.
 *
 * Mirrors the source-contract technique at
 * `tests/api/cms-rbac-affiliate-403.test.ts:209-238`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('CR-02 — Edit-user modal is co-located inside UsersView', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/app/admin/page.tsx'),
    'utf8',
  );

  it('the modal block exists exactly once in the source', () => {
    const first = source.indexOf('{showEditUserModal && editingUser && (');
    expect(first).toBeGreaterThan(-1);
    // Must be the only occurrence (not duplicated from the move).
    const second = source.indexOf('{showEditUserModal && editingUser && (', first + 1);
    expect(second).toBe(-1);
  });

  it('the modal sits inside the UsersView region (after UsersView marker, before ArticlesView marker)', () => {
    const usersStart = source.indexOf('const UsersView = () => (');
    expect(usersStart).toBeGreaterThan(-1);
    const articlesStart = source.indexOf('const ArticlesView = () => (');
    expect(articlesStart).toBeGreaterThan(-1);
    const modalIdx = source.indexOf('{showEditUserModal && editingUser && (');
    expect(modalIdx).toBeGreaterThan(-1);

    expect(modalIdx, 'modal is after UsersView marker').toBeGreaterThan(usersStart);
    expect(modalIdx, 'modal is before ArticlesView marker').toBeLessThan(articlesStart);
  });

  it('the modal has not been re-nested inside BlacklistView', () => {
    const blacklistStart = source.indexOf('const BlacklistView = () => {');
    expect(blacklistStart).toBeGreaterThan(-1);
    const modalIdx = source.indexOf('{showEditUserModal && editingUser && (');
    expect(modalIdx).toBeGreaterThan(-1);

    expect(modalIdx, 'modal must appear before BlacklistView (not inside it)').toBeLessThan(blacklistStart);
  });

  it('the openEditUserModal trigger is present', () => {
    expect(source.indexOf('openEditUserModal(u)')).toBeGreaterThan(-1);
  });

  it('renders the UI-SPEC D-14 title "Edit team member" and contains no password input', () => {
    expect(source.indexOf('Edit team member')).toBeGreaterThan(-1);
    // The Add-user modal has a password *create* field; the Edit-user modal
    // must NOT. Verify the edit-modal region does not contain a password input.
    const modalIdx = source.indexOf('{showEditUserModal && editingUser && (');
    const modalEndMarker = 'Passwords are managed outside the CMS';
    const passwordNoteIdx = source.indexOf(modalEndMarker, modalIdx);
    expect(passwordNoteIdx, 'password note present in the edit modal').toBeGreaterThan(modalIdx);

    // Extract the edit-modal region and confirm it has no password input.
    const modalRegion = source.slice(modalIdx, passwordNoteIdx);
    expect(modalRegion).not.toContain('type="password"');
  });
});
