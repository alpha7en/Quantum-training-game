import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1200 });
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    console.log('Scanning MIPT Exam Tickets (1-20)...');

    for (let ticketId = 1; ticketId <= 20; ticketId++) {
      // Find the sidebar button for this ticket
      await page.evaluate((id) => {
        const buttons = Array.from(document.querySelectorAll('aside button'));
        // Find button that contains the ticket number as its index badge
        const btn = buttons.find(b => {
          const badge = b.querySelector('span');
          return badge && badge.textContent.trim() === String(id);
        });
        if (btn) btn.click();
      }, ticketId);
      
      // Wait for React update and KaTeX render
      await new Promise(r => setTimeout(r, 200));

      // Scan for any element containing '$' that does NOT contain a '.katex' element
      const uncompiled = await page.evaluate(() => {
        const textElements = Array.from(document.querySelectorAll('.markdown-body p, .markdown-body li, .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body blockquote'));
        
        const issues = [];
        textElements.forEach(el => {
          const txt = el.textContent || '';
          
          // Check if there are raw $ signs or $$ signs that were not replaced
          // We can check if the element has '$' and does not contain a child with class 'katex'
          // OR if it contains '$' even in its text content in a way that suggests it was skipped.
          // Note that a fully rendered KaTeX element still contains the formula in mathml/annotations,
          // but if KaTeX failed or was not triggered, the raw $ delimiters will be visible in text.
          // Let's check if the innerHTML contains a raw '$' that is not inside an annotation or mathml
          // A simpler way: does the text content contain '$' symbols that are part of the visible text?
          // When KaTeX renders successfully, the raw '$' delimiters are hidden/removed from visible text,
          // and instead we get the formatted symbols. Let's see if the text has raw delimiters like '$$'
          if (txt.includes('$$') || (txt.includes('$') && !el.querySelector('.katex'))) {
            issues.push({
              text: txt.slice(0, 150),
              html: el.innerHTML.slice(0, 150)
            });
          }
        });
        return issues;
      });

      if (uncompiled.length > 0) {
        console.log(`\n=== Ticket #${ticketId} has potentially uncompiled math: ===`);
        uncompiled.forEach((iss, idx) => {
          console.log(`  Issue ${idx + 1}:`);
          console.log(`    Text: "${iss.text}"`);
          console.log(`    HTML: "${iss.html}"`);
        });
      }
    }

    console.log('\nScanning Challenges...');
    // Switch to challenges mode
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tasksModeBtn = buttons.find(b => b.textContent.includes('Задачи'));
      if (tasksModeBtn) tasksModeBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Get list of challenges buttons
    const challengeIds = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('aside button'));
      // Filter out mode switch buttons
      return buttons
        .map((b, idx) => ({ text: b.textContent.trim(), index: idx }))
        .filter(x => !x.text.includes('Экзамен') && !x.text.includes('Задачи'))
        .map(x => x.index);
    });

    for (let cIdx of challengeIds) {
      await page.evaluate((idx) => {
        const buttons = Array.from(document.querySelectorAll('aside button'));
        if (buttons[idx]) buttons[idx].click();
      }, cIdx);
      await new Promise(r => setTimeout(r, 200));

      // Click "Описание Задачи" tab
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const tab = buttons.find(b => b.textContent.includes('Описание Задачи') || b.textContent.includes('Теория'));
        if (tab) tab.click();
      });
      await new Promise(r => setTimeout(r, 200));

      const uncompiled = await page.evaluate(() => {
        const textElements = Array.from(document.querySelectorAll('.markdown-body p, .markdown-body li, .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body blockquote'));
        const issues = [];
        textElements.forEach(el => {
          const txt = el.textContent || '';
          if (txt.includes('$$') || (txt.includes('$') && !el.querySelector('.katex'))) {
            issues.push(txt.slice(0, 150));
          }
        });
        return issues;
      });

      if (uncompiled.length > 0) {
        console.log(`\n=== Challenge at index ${cIdx} has potentially uncompiled math: ===`);
        uncompiled.forEach((iss, idx) => {
          console.log(`  Issue ${idx + 1}: "${iss}"`);
        });
      }
    }

  } catch (err) {
    console.error('Error during scanning:', err);
  } finally {
    browser.close();
  }
}

run();
