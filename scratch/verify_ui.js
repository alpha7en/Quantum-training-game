import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = '/Users/alpha7en/.gemini/antigravity-cli/brain/88110c6a-259b-4bd3-8107-5a993318958e';

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1300 });

    console.log('Navigating to http://localhost:3001/...');
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000)); // wait for KaTeX to render

    // ── PART 1: EXAM MODE ──
    console.log('Capturing Step 1: MIPT Exam Theory Tab...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'step1_theory.png') });

    // Switch to "Схема Билета" tab
    console.log('Switching to "Схема Билета" tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const simButton = buttons.find(b => b.textContent.includes('Схема Билета'));
      if (simButton) simButton.click();
      else throw new Error('Could not find "Схема Билета" tab button');
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'step2_simulator_before.png') });

    // Click "⚡ Запустить схему" inside Simulator Tab
    console.log('Clicking "⚡ Запустить схему" on Simulator tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const runBtn = buttons.find(b => b.textContent.includes('Запустить схему'));
      if (runBtn) runBtn.click();
      else throw new Error('Could not find "⚡ Запустить схему" button');
    });

    // Wait for simulation to finish and auto-redirect to results tab
    console.log('Waiting 3.5s for simulation to complete...');
    await new Promise(r => setTimeout(r, 3500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'step3_results.png') });

    // Click "Конструктор Схем"
    console.log('Switching to "Конструктор Схем" tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const constructorBtn = buttons.find(b => b.textContent.includes('Конструктор Схем'));
      if (constructorBtn) constructorBtn.click();
      else throw new Error('Could not find "Конструктор Схем" tab button');
    });
    await new Promise(r => setTimeout(r, 1000));

    // Click "⚡ Запустить схему" in Constructor
    console.log('Clicking "⚡ Запустить схему" in Constructor...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const runBtn = buttons.find(b => b.textContent.includes('Запустить схему') && b.style.opacity !== '0.7');
      if (runBtn) runBtn.click();
      else throw new Error('Could not find Constructor "⚡ Запустить схему" button');
    });

    // Wait 1.5s for constructor simulation
    console.log('Waiting 1.5s for constructor simulation...');
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'step4_constructor_results.png') });


    // ── PART 2: CHALLENGES MODE ──
    console.log('Switching to "🎮 Задачи" mode via Sidebar...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tasksModeBtn = buttons.find(b => b.textContent.includes('Задачи'));
      if (tasksModeBtn) tasksModeBtn.click();
      else throw new Error('Could not find "Задачи" mode toggle in Sidebar');
    });
    await new Promise(r => setTimeout(r, 1000));

    // Verify challenges list is loaded in Sidebar
    const challengesSidebarList = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('aside button'));
      return buttons.map(b => b.textContent.trim()).filter(text => !text.includes('Экзамен') && !text.includes('Задачи'));
    });
    console.log('Sidebar Challenges loaded:', challengesSidebarList);

    // Select the "Алгоритм Дойча-Джозы" challenge
    console.log('Selecting "Алгоритм Дойча-Джозы" challenge...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('aside button'));
      const djBtn = buttons.find(b => b.textContent.includes('Алгоритм Дойча-Джозы'));
      if (djBtn) djBtn.click();
      else throw new Error('Could not find "Алгоритм Дойча-Джозы" challenge button');
    });
    await new Promise(r => setTimeout(r, 1000));

    // View "Описание Задачи" / "Теория Алгоритма" tab
    console.log('Switching to challenge theory tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const theoryBtn = buttons.find(b => b.textContent.includes('Описание Задачи') || b.textContent.includes('Теория'));
      if (theoryBtn) theoryBtn.click();
      else throw new Error('Could not find challenge theory/description tab button');
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'step5_challenges_theory.png') });

    // Switch back to "Конструктор"
    console.log('Switching back to challenge constructor...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const constructorBtn = buttons.find(b => b.textContent.includes('Конструктор') && !b.textContent.includes('Схем'));
      if (constructorBtn) constructorBtn.click();
      else throw new Error('Could not find challenge "Конструктор" tab button');
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'step6_challenges_constructor.png') });

    // Click "Проверить решение" in the Verification Panel below the builder canvas
    console.log('Clicking "Проверить решение" in the Verification Panel...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const verifyBtn = buttons.find(b => b.textContent.includes('Проверить решение'));
      if (verifyBtn) verifyBtn.click();
      else throw new Error('Could not find "Проверить решение" button');
    });

    // Wait 2s for verification processing (1s simulated execution delay)
    console.log('Waiting 2s for verification...');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'step7_verification_result.png') });

    console.log('Automation successfully finished!');
  } catch (err) {
    console.error('Error during browser automation:', err);
  } finally {
    await browser.close();
  }
}

run();
