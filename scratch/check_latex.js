import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000)); // wait for KaTeX render

    // Check console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });

    // Extract raw markdown/katex HTML structure
    const results = await page.evaluate(() => {
      // Find all markdown paragraphs or headers containing $ or $$
      const elements = Array.from(document.querySelectorAll('.markdown-body *'));
      return elements
        .filter(el => el.textContent && (el.textContent.includes('$') || el.textContent.includes('\\')))
        .map(el => {
          return {
            tagName: el.tagName,
            class: el.className,
            text: el.textContent.trim(),
            html: el.innerHTML.trim().slice(0, 300) // snippet
          };
        });
    });

    console.log('Found LaTeX-like elements:');
    results.slice(0, 15).forEach((r, i) => {
      console.log(`\n--- Element ${i + 1} (${r.tagName}, class="${r.class}") ---`);
      console.log('Text:', r.text);
      console.log('HTML snippet:', r.html);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

run();
