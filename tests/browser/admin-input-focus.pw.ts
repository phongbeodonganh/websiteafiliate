import { readFileSync } from 'node:fs';
import { test, expect, type Locator, type Page } from '@playwright/test';

// Run against `npm run dev:local`. Changes stay in unsaved forms.
test.beforeEach(async ({ page, request }) => {
  const credentials = JSON.parse(readFileSync('.local/credentials.json', 'utf8'));
  const response = await request.post('/api/v1/auth/login', {
    data: { username: credentials.username, password: credentials.password },
  });
  expect(response.ok()).toBeTruthy();
  const { token } = await response.json();
  await page.addInitScript((token) => localStorage.setItem('token', token), token);
});

async function typeContinuously(field: Locator) {
  await field.fill('');
  // A few settings intentionally display a default when cleared.
  await field.press('ControlOrMeta+A');
  const original = await field.elementHandle();
  await field.pressSequentially('Continuous typing 123', { delay: 15 });
  await expect(field).toHaveValue('Continuous typing 123');
  await expect(field).toBeFocused();
  await field.page().keyboard.insertText(' nội dung tiếng Việt');
  await expect(field).toHaveValue('Continuous typing 123 nội dung tiếng Việt');
  expect(await original!.evaluate((node) => node.isConnected && document.activeElement === node)).toBe(true);
}

async function checkVisibleFields(page: Page, scope = 'main') {
  const fields = page.locator(`${scope} input:visible, ${scope} textarea:visible`);
  let checked = 0;
  for (let i = 0; i < await fields.count(); i++) {
    const field = fields.nth(i);
    const type = await field.getAttribute('type');
    if (type && !['text', 'url', 'email', 'password'].includes(type)) continue;
    if (!(await field.isEditable())) continue;
    await typeContinuously(field);
    checked++;
  }
  expect(checked).toBeGreaterThan(0);
}

async function openTab(page: Page, tab: string) {
  await page.goto(`/admin?tab=${tab}`);
  await expect(page.getByRole('button', { name: 'Article Management', exact: true })).toBeVisible();
  await expect(page.locator('main h2')).toBeVisible();
}

test('campaign fields and AI generator keep focus while typing', async ({ page }) => {
  await openTab(page, 'links');
  await checkVisibleFields(page, 'main form');
  await page.getByRole('button', { name: 'Generate AI Article', exact: true }).click();
  await typeContinuously(page.getByPlaceholder('e.g. Scalenut Review: Features, Pricing, and Use Cases'));
});

test('team creation and editing keep focus while typing', async ({ page }) => {
  await openTab(page, 'users');
  await page.getByRole('button', { name: 'Add New Team Member' }).click();
  await checkVisibleFields(page, 'main form');
  await openTab(page, 'users');
  await page.getByRole('button', { name: 'Edit Local Admin', exact: true }).click();
  await checkVisibleFields(page, 'main form');
});

test('categories and subcategories keep focus while typing', async ({ page }) => {
  await openTab(page, 'categories');
  await page.getByRole('button', { name: 'Add Main Category (Level 1)' }).click();
  await checkVisibleFields(page, 'main form');
  await openTab(page, 'categories');
  await page.getByRole('button', { name: /Add Sub/ }).first().click();
  await checkVisibleFields(page, 'main form');
});

test('blacklist search and creation keep focus while typing', async ({ page }) => {
  await openTab(page, 'blacklist');
  await checkVisibleFields(page);
  await page.getByRole('button', { name: 'Add Blocked Domain', exact: true }).first().click();
  await checkVisibleFields(page, 'main form');
});

test('appearance and SEO settings keep focus while typing', async ({ page }) => {
  await openTab(page, 'settings');
  await expect(page.getByPlaceholder('https://example.com/favicon.ico')).toBeVisible();
  await checkVisibleFields(page, 'main form');
  await page.getByRole('button', { name: 'SEO and Structured Data' }).click();
  await checkVisibleFields(page, 'main form');
});

test('subscriber search keeps focus while typing', async ({ page }) => {
  await openTab(page, 'subscribers');
  await typeContinuously(page.getByPlaceholder('Search by email address...'));
});

test('article fields and rich text survive parent validation updates', async ({ page }) => {
  await page.goto('/admin?tab=articles&edit=new');
  const title = page.getByPlaceholder('Enter article title...');
  await expect(title).toBeVisible();
  await checkVisibleFields(page, 'main form');
  const editor = page.locator('[contenteditable="true"]');
  await editor.click();
  await editor.pressSequentially('Article content with continuous typing', { delay: 15 });
  await expect(editor).toBeFocused();
  const titleNode = await title.elementHandle();
  // Keep browser URL validation from intercepting the submit under test.
  for (const field of await page.locator('main form input[type="url"]').all()) {
    await field.fill('https://example.com/image.png');
  }
  // Missing category updates the parent toast. The editor must remain mounted.
  await page.getByRole('button', { name: 'Save Article' }).click();
  await expect(page.getByRole('status')).toContainText('Choose a primary category.');
  expect(await titleNode!.evaluate((node) => node.isConnected)).toBe(true);
  await expect(title).toHaveValue('Continuous typing 123 nội dung tiếng Việt');
  await expect(editor).toContainText('Article content with continuous typing');
  await typeContinuously(title);
});

test('an existing article finishes loading and preserves edits after validation', async ({ page }) => {
  const article = {
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa', title: 'Existing draft', slug: 'existing-draft',
    content: '<p>Saved content</p>', status: 'draft', authorName: 'Local Admin',
  };
  await page.route('**/api/v1/cms/articles**', async (route) => {
    const isList = new URL(route.request().url()).pathname === '/api/v1/cms/articles';
    await route.fulfill({ json: { status: 'success', data: isList ? [article] : article } });
  });
  await page.goto(`/admin?tab=articles&edit=${article.id}`);
  const title = page.getByPlaceholder('Enter article title...');
  await expect(title).toHaveValue(article.title);
  await typeContinuously(title);
  await page.getByRole('button', { name: 'Save Article' }).click();
  await expect(page.getByRole('status')).toContainText('Choose a primary category.');
  await expect(title).toHaveValue('Continuous typing 123 nội dung tiếng Việt');
  await expect(page.locator('[contenteditable="true"]')).toContainText('Saved content');
});
