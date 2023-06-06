import { test, expect } from '@playwright/test';

test('can execute @thencc/algonautjs within browser', async function ({ page }) {
	page.on('pageerror', async (e) => {
		throw new Error(e.message);
	});

	const port = 5512;
	await page.goto(`http://localhost:${port}`);

	await new Promise((resolve) => setTimeout(resolve, 1000));

	// Expect a title "to contain" a substring.
	await expect(page).toHaveTitle(/init/);
});
