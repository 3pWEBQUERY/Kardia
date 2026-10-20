import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

const index = JSON.parse(
  readFileSync(fileURLToPath(new URL('../storybook-static/index.json', import.meta.url)), 'utf8'),
) as { entries: Record<string, { id: string; type: string }> };

for (const entry of Object.values(index.entries).filter((e) => e.type === 'story')) {
  test(entry.id, async ({ page }, info) => {
    const theme = info.project.name;
    await page.goto(`/iframe.html?id=${entry.id}&viewMode=story&globals=theme:${theme}`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(`${entry.id}-${theme}.png`, { fullPage: true });
  });
}
