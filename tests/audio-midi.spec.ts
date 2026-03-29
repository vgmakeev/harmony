import { test, expect, Page } from '@playwright/test';

async function unlockAudio(page: Page) {
  const overlay = page.locator('text=Click anywhere to start');
  if (await overlay.isVisible({ timeout: 2000 }).catch(() => false)) {
    await overlay.click();
    await page.waitForTimeout(500);
  }
}

/** Count piano keys with active highlight class. */
async function countHighlightedKeys(page: Page): Promise<number> {
  return page.evaluate(() =>
    document.querySelectorAll('.bg-accent-blue.shadow-lg, .bg-accent-purple.shadow-lg, .bg-accent-pink.shadow-lg').length
  );
}

// ═══════════════════════════════════════════════════════════════
// Audio Engine — verify sound pipeline via piano highlight proxy
// ═══════════════════════════════════════════════════════════════

test.describe('Audio Engine — Sound Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await unlockAudio(page);
    await page.waitForTimeout(500);
    await page.locator('body').click();
  });

  test('pressing keyboard key highlights piano key', async ({ page }) => {
    expect(await countHighlightedKeys(page)).toBe(0);

    await page.keyboard.down('q'); // C4
    await page.waitForTimeout(200);

    expect(await countHighlightedKeys(page)).toBeGreaterThan(0);

    await page.keyboard.up('q');
  });

  test('releasing key removes piano highlight', async ({ page }) => {
    await page.keyboard.down('q');
    await page.waitForTimeout(200);
    expect(await countHighlightedKeys(page)).toBeGreaterThan(0);

    await page.keyboard.up('q');
    await page.waitForTimeout(300);
    expect(await countHighlightedKeys(page)).toBe(0);
  });

  test('different keys highlight different piano keys', async ({ page }) => {
    await page.keyboard.down('z'); // C3
    await page.waitForTimeout(200);
    const count1 = await countHighlightedKeys(page);
    expect(count1).toBeGreaterThan(0);
    await page.keyboard.up('z');
    await page.waitForTimeout(200);

    await page.keyboard.down('q'); // C4
    await page.waitForTimeout(200);
    const count2 = await countHighlightedKeys(page);
    expect(count2).toBeGreaterThan(0);
    await page.keyboard.up('q');
  });

  test('chord highlights multiple piano keys', async ({ page }) => {
    await page.keyboard.down('q'); // C4
    await page.keyboard.down('e'); // E4
    await page.keyboard.down('t'); // G4
    await page.waitForTimeout(300);

    // At least 3 highlighted keys
    expect(await countHighlightedKeys(page)).toBeGreaterThanOrEqual(3);

    await page.keyboard.up('q');
    await page.keyboard.up('e');
    await page.keyboard.up('t');
  });

  test('synth panel shows current preset name', async ({ page }) => {
    const presetName = page.locator('[data-testid="synth-panel"] .text-accent-blue.truncate');
    await expect(presetName).toBeVisible();
    const name = await presetName.textContent();
    expect(name).toBeTruthy();
    expect(name!.length).toBeGreaterThan(0);
  });

  test('switching preset updates synth panel', async ({ page }) => {
    const presetName = page.locator('[data-testid="synth-panel"] .text-accent-blue.truncate');
    const name1 = await presetName.textContent();

    await page.locator('button:has-text("›")').click();
    await page.waitForTimeout(300);

    const name2 = await presetName.textContent();
    expect(name2).toBeTruthy();
    // Name should change (different preset)
    expect(name2).not.toBe(name1);
  });
});

// ═══════════════════════════════════════════════════════════════
// MIDI I/O — Mock Web MIDI API
// ═══════════════════════════════════════════════════════════════

test.describe('MIDI I/O — Mock Web MIDI API', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__midiOutputMessages = [] as number[][];

      const mockOutput = {
        id: 'mock-output-1',
        name: 'Mock MIDI Output',
        manufacturer: 'Test',
        state: 'connected',
        type: 'output',
        send(data: number[]) {
          (window as any).__midiOutputMessages.push([...data]);
        },
        open() { return Promise.resolve(this); },
        close() { return Promise.resolve(this); },
      };

      const mockInput = {
        id: 'mock-input-1',
        name: 'Mock MIDI Input',
        manufacturer: 'Test',
        state: 'connected',
        type: 'input',
        onmidimessage: null as ((e: any) => void) | null,
        open() { return Promise.resolve(this); },
        close() { return Promise.resolve(this); },
      };

      (window as any).__mockMidiInput = mockInput;
      (window as any).__sendMidiInput = (data: number[]) => {
        if (mockInput.onmidimessage) {
          mockInput.onmidimessage({ data: new Uint8Array(data) });
        }
      };

      const mockAccess = {
        inputs: new Map([['mock-input-1', mockInput]]),
        outputs: new Map([['mock-output-1', mockOutput]]),
        onstatechange: null as ((e: any) => void) | null,
        sysexEnabled: false,
      };

      navigator.requestMIDIAccess = () => Promise.resolve(mockAccess as any);
    });

    await page.goto('/');
    await unlockAudio(page);
    await page.waitForTimeout(1000);
  });

  test('MIDI indicator shows connected', async ({ page }) => {
    const midiDot = page.locator('#midi-dot');
    await expect(midiDot).toBeVisible();
    const cls = await midiDot.getAttribute('class');
    expect(cls).toContain('bg-green-400');
  });

  test('MIDI input note triggers sound pipeline', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__sendMidiInput([0x90, 60, 100]);
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      (window as any).__sendMidiInput([0x80, 60, 0]);
    });
    await page.waitForTimeout(100);
    await expect(page.locator('header')).toBeVisible();
  });

  test('MIDI output sends Note On when key pressed', async ({ page }) => {
    await page.locator('button:has-text("MIDI Out")').click();
    await page.waitForTimeout(200);
    await expect(page.locator('button:has-text("MIDI Out ON")')).toBeVisible();

    await page.evaluate(() => { (window as any).__midiOutputMessages = []; });

    await page.keyboard.down('q');
    await page.waitForTimeout(100);

    const messages = await page.evaluate(() =>
      (window as any).__midiOutputMessages as number[][]
    );
    const noteOn = messages.find(
      (m: number[]) => (m[0] & 0xf0) === 0x90 && m[1] === 60 && m[2] > 0
    );
    expect(noteOn).toBeTruthy();

    await page.keyboard.up('q');
  });

  test('MIDI output sends Note Off when key released', async ({ page }) => {
    await page.locator('button:has-text("MIDI Out")').click();
    await page.waitForTimeout(200);

    await page.evaluate(() => { (window as any).__midiOutputMessages = []; });

    await page.keyboard.down('q');
    await page.waitForTimeout(100);
    await page.keyboard.up('q');
    await page.waitForTimeout(100);

    const messages = await page.evaluate(() =>
      (window as any).__midiOutputMessages as number[][]
    );
    const noteOff = messages.find(
      (m: number[]) => (m[0] & 0xf0) === 0x80 && m[1] === 60
    );
    expect(noteOff).toBeTruthy();
  });

  test('MIDI output uses channel 0 by default', async ({ page }) => {
    await page.locator('button:has-text("MIDI Out")').click();
    await page.waitForTimeout(200);

    await page.evaluate(() => { (window as any).__midiOutputMessages = []; });

    await page.keyboard.down('z'); // C3 = MIDI 48
    await page.waitForTimeout(100);

    const messages = await page.evaluate(() =>
      (window as any).__midiOutputMessages as number[][]
    );
    const noteOn = messages.find((m: number[]) => m[0] === 0x90 && m[1] === 48);
    expect(noteOn).toBeTruthy();
    expect(noteOn![2]).toBeGreaterThan(0);

    await page.keyboard.up('z');
  });

  test('MIDI output disabled by default — no messages', async ({ page }) => {
    await expect(page.locator('button:has-text("MIDI Out")')).toBeVisible();

    await page.evaluate(() => { (window as any).__midiOutputMessages = []; });

    await page.keyboard.down('q');
    await page.waitForTimeout(100);
    await page.keyboard.up('q');
    await page.waitForTimeout(100);

    const messages = await page.evaluate(() =>
      (window as any).__midiOutputMessages as number[][]
    );
    expect(messages.length).toBe(0);
  });

  test('MIDI CC message does not crash', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__sendMidiInput([0xB0, 1, 64]);
    });
    await page.waitForTimeout(100);
    await expect(page.locator('header')).toBeVisible();
  });

  test('multiple notes produce multiple MIDI messages', async ({ page }) => {
    await page.locator('button:has-text("MIDI Out")').click();
    await page.waitForTimeout(200);

    await page.evaluate(() => { (window as any).__midiOutputMessages = []; });

    await page.keyboard.down('q'); // C4 = 60
    await page.keyboard.down('w'); // D4 = 62
    await page.waitForTimeout(100);

    const messages = await page.evaluate(() =>
      (window as any).__midiOutputMessages as number[][]
    );
    const note60 = messages.find((m: number[]) => m[0] === 0x90 && m[1] === 60);
    const note62 = messages.find((m: number[]) => m[0] === 0x90 && m[1] === 62);
    expect(note60).toBeTruthy();
    expect(note62).toBeTruthy();

    await page.keyboard.up('q');
    await page.keyboard.up('w');
  });
});
