import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

test('manually choose, save, reopen, change and filter article tags', async ({ page, request }) => {
  const credentials = JSON.parse(readFileSync('.local/credentials.json', 'utf8'));
  const login = await request.post('/api/v1/auth/login', {
    data: { username: credentials.username, password: credentials.password },
  });
  expect(login.ok()).toBeTruthy();
  const { token } = await login.json();
  const headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript((token) => localStorage.setItem('token', token), token);
  const prefix = `Tag browser ${Date.now()}`;
  const createdIds: string[] = [];
  try {
    // Include legacy content in the same list to prove filtering handles it.
    for (const contentType of ['review', 'case_study', undefined]) {
      const response = await request.post('/api/v1/cms/articles', {
        headers, data: { title: `${prefix} ${contentType || 'legacy'}`, content: '<p>Test</p>', status: 'draft', contentType },
      });
      expect(response.status()).toBe(201);
      createdIds.push((await response.json()).data.id);
    }
    await page.goto('/admin?tab=articles&edit=new');
    const tag = page.getByLabel('Content Tag', { exact: false });
    await expect(tag).toHaveValue('');
    await expect(tag.locator('option:not([disabled])')).toHaveText(['Review', 'Case Study', 'Guide']);
    await page.getByPlaceholder('Enter article title...').fill(`${prefix} guide`);
    await page.locator('[contenteditable="true"]').fill('Product instructions for the browser test.');
    const category = page.getByText('Primary Category (Level 1)', { exact: true }).locator('..').locator('select');
    await expect(category.locator('option')).not.toHaveCount(1);
    await category.selectOption({ index: 1 });
    await page.getByText('Publishing Status', { exact: true }).locator('..').locator('select').selectOption('draft');
    const save = page.getByRole('button', { name: 'Save Article' });
    await save.click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Choose a content tag');
    await tag.selectOption('guide');
    await save.click();
    await expect(page.getByRole('heading', { name: 'Article Management' })).toBeVisible();
    const list = (await (await request.get('/api/v1/cms/articles', { headers })).json()).data;
    const created = list.find((article: { title: string }) => article.title === `${prefix} guide`);
    expect(created.contentType).toBe('guide');
    createdIds.push(created.id);
    const filter = page.getByLabel('Filter by Content Tag');
    for (const [value, title] of [['review', 'review'], ['case_study', 'case_study'], ['guide', 'guide'], ['untagged', 'legacy']]) {
      await filter.selectOption(value);
      const rows = page.locator('tbody tr').filter({ hasText: prefix });
      await expect(rows).toHaveCount(1);
      await expect(rows).toContainText(`${prefix} ${title}`);
    }
    await filter.selectOption('guide');
    await page.locator('tr').filter({ hasText: `${prefix} guide` }).getByTitle('Edit Article', { exact: true }).click();
    await expect(tag).toHaveValue('guide');
    await tag.selectOption('case_study');
    await save.click();
    await expect(page.getByRole('heading', { name: 'Article Management' })).toBeVisible();
    await filter.selectOption('case_study');
    await expect(page.locator('tbody tr').filter({ hasText: prefix })).toHaveCount(2);
    const updated = (await (await request.get(`/api/v1/cms/articles/${created.id}`, { headers })).json()).data;
    expect(updated.contentType).toBe('case_study');
  } finally {
    for (const id of createdIds) await request.delete(`/api/v1/cms/articles/${id}`, { headers });
  }
});
