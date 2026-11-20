const { chromium } = require('playwright');
const ART = require(process.argv[2]);
const out = process.argv[3];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 1000 } });
  for (const [day, [name, svg]] of Object.entries(ART)) {
    await p.setContent(`<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">${svg}</svg></body></html>`);
    await p.screenshot({ path: `${out}/${day}.png`, omitBackground: true });
  }
  await b.close();
})();
