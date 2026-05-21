import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    page.on('console', msg => {
      console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    page.on('pageerror', err => {
      console.log(`[PAGE ERROR] ${err.toString()}`);
    });

    page.on('error', err => {
      console.log(`[ERROR] ${err.toString()}`);
    });

    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    console.log('--- Scanning Tickets 1-20 ---');
    for (let i = 1; i <= 20; i++) {
      console.log(`Selecting ticket #${i}...`);
      await page.evaluate((id) => {
        const buttons = Array.from(document.querySelectorAll('aside button'));
        const btn = buttons.find(b => {
          const badge = b.querySelector('span');
          return badge && badge.textContent.trim() === String(id);
        });
        if (btn) btn.click();
      }, i);
      await new Promise(r => setTimeout(r, 300));
    }

    console.log('--- Switching to Challenges ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tasksModeBtn = buttons.find(b => b.textContent.includes('Задачи'));
      if (tasksModeBtn) tasksModeBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    browser.close();
  }
}

run();
