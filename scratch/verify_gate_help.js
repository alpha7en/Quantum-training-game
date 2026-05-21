import puppeteer from 'puppeteer';

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const errors = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      errors.push(err.toString());
    });

    console.log('Navigating to http://localhost:3001/...');
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Switch to Challenges mode
    console.log('Switching to Challenges mode...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Задачи'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Select first challenge (Bell Singlet)
    console.log('Selecting first challenge...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('aside button'));
      const challengeBtn = buttons.find(b => b.textContent.includes('Синглетное'));
      if (challengeBtn) challengeBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Switch to Constructor tab
    console.log('Switching to Constructor tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Конструктор'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Click the ⓘ info span for H gate
    console.log('Clicking ⓘ info span for H gate...');
    const clickedInfo = await page.evaluate(() => {
      // The ⓘ icons are <span> elements inside gate palette divs
      const infoSpans = Array.from(document.querySelectorAll('span'));
      const hInfoSpan = infoSpans.find(s => {
        if (s.textContent?.trim() !== 'ⓘ') return false;
        // Check sibling or parent contains H label
        const parent = s.parentElement;
        if (!parent) return false;
        const labelSpan = parent.querySelector('span');
        return labelSpan && labelSpan.textContent?.trim() === 'H';
      });
      if (hInfoSpan) {
        hInfoSpan.click();
        return 'clicked-H-info';
      }
      // Fallback: click any ⓘ span
      const anyInfo = infoSpans.find(s => s.textContent?.trim() === 'ⓘ');
      if (anyInfo) {
        anyInfo.click();
        return 'clicked-any-info';
      }
      return 'no-info-found';
    });
    console.log('Click result:', clickedInfo);
    await new Promise(r => setTimeout(r, 2000)); // Wait for KaTeX to render

    // Check if the modal is visible and rendered as a portal at body level
    const modalInfo = await page.evaluate(() => {
      // The portal should render directly in document.body
      const bodyChildren = Array.from(document.body.children);
      const overlay = bodyChildren.find(el => {
        const style = el.style;
        return style && style.position === 'fixed' && style.zIndex === '10000';
      }) || null;
      
      if (!overlay) return { found: false, reason: 'No portal overlay found at body level' };

      const modalText = overlay.textContent || '';
      
      // Check for KaTeX rendered elements
      const katexElements = overlay.querySelectorAll('.katex');
      
      // The main bug: "Создаетсуперпозициюизбазисныхсостояний" (no spaces)
      const noSpacesBug = modalText.includes('Создаетсуперпозициюизбазисныхсостояний');
      
      // Correct rendering should have spaces
      const hasCorrectSpaces = modalText.includes('Создает суперпозицию');
      
      // Check for "Описание работы" section header
      const hasDescHeader = modalText.includes('Описание работы');
      
      return {
        found: true,
        katexCount: katexElements.length,
        noSpacesBug,
        hasCorrectSpaces,
        hasDescHeader,
        textSample: modalText.substring(0, 500)
      };
    });
    
    console.log('\nModal info:', JSON.stringify(modalInfo, null, 2));

    if (modalInfo.found) {
      if (modalInfo.noSpacesBug) {
        console.error('\n❌ BUG STILL PRESENT: Text has no spaces');
      } else if (modalInfo.hasCorrectSpaces) {
        console.log('\n✅ Text renders correctly with spaces');
      } else {
        console.log('\n⚠️  Text found but could not verify spaces');
      }
      
      if (modalInfo.katexCount > 0) {
        console.log(`✅ KaTeX rendered ${modalInfo.katexCount} math expressions`);
      } else {
        console.error('❌ No KaTeX elements found');
      }
    } else {
      console.error('\n❌ Modal not found:', modalInfo.reason);
    }

    // Take a screenshot
    const screenshotPath = '/Users/alpha7en/.gemini/antigravity-cli/brain/88110c6a-259b-4bd3-8107-5a993318958e/gate_help_fixed.png';
    await page.screenshot({ path: screenshotPath });
    console.log('\nScreenshot saved to gate_help_fixed.png');

    if (errors.length > 0) {
      console.log('\n--- Console Errors ---');
      errors.forEach(e => console.log(`  [ERROR] ${e}`));
    } else {
      console.log('✅ No console errors');
    }

    console.log('\nVerification complete!');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

run();
