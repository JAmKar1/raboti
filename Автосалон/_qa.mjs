export default async function run(page, ui) {
  await page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll('img')];
    return imgs.length > 0 && imgs.every(i => i.complete);
  }, { timeout: 15000 }).catch(() => {});
  const bad = await page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter(i => i.complete && (!i.naturalWidth || !i.naturalHeight))
      .map(i => i.getAttribute('src'))
  );
  const count = await page.evaluate(() => document.querySelectorAll('img').length);
  return { images: count, broken: bad };
}
