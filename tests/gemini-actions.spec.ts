import { test, expect, Page } from '@playwright/test';

// Helper: mock Gemini API with a specific response
async function mockGemini(page: Page, response: object) {
  await page.route('**/generativelanguage.googleapis.com/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify(response) }],
          },
        }],
      }),
    });
  });
}

// Helper: send a chat message (API key must already be set)
async function sendChat(page: Page, text: string) {
  const input = page.locator('input[placeholder="Ask AI..."]');
  await input.fill(text);
  await input.press('Enter');
}

// Helper: wait for AI response to appear (not "thinking...")
async function waitForResponse(page: Page) {
  // Wait for thinking to disappear
  await expect(page.locator('text=thinking...')).toBeHidden({ timeout: 15000 });
  // Small extra wait for action execution
  await page.waitForTimeout(500);
}

// Helper: get the last AI message text
async function getLastAiMessage(page: Page): Promise<string> {
  const messages = page.locator('.self-start .text-text-primary');
  const count = await messages.count();
  if (count === 0) return '';
  return (await messages.nth(count - 1).textContent()) ?? '';
}

// Helper: unlock audio context by clicking the overlay
async function unlockAudio(page: Page) {
  const overlay = page.locator('text=Click anywhere to start');
  if (await overlay.isVisible({ timeout: 2000 }).catch(() => false)) {
    await overlay.click();
    await page.waitForTimeout(300);
  }
}

test.describe('Gemini Action Execution', () => {
  test.beforeEach(async ({ page }) => {
    // Set fake API key via localStorage before page loads
    await page.addInitScript(() => {
      localStorage.setItem('harmonia_gemini_key', 'fake-key-for-testing');
    });
    await page.goto('/');
    await unlockAudio(page);
  });

  // ─── FM SYNTH (engine: synth) ───

  test('synth preset — nested params', async ({ page }) => {
    await mockGemini(page, {
      message: 'Created FM bass',
      actions: [{
        type: 'preset',
        engine: 'synth',
        name: 'Test Bass',
        category: 'bass',
        params: {
          waveform: 'sawtooth', attack: 0.01, decay: 0.3, sustain: 0.5,
          release: 0.5, cutoff: 800, resonance: 10, detune: 15, voices: 3, gain: 0.7,
        },
      }],
    });
    await sendChat(page, 'make a bass');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Preset applied: Test Bass');
    // Verify synth panel shows the preset name
    await expect(page.locator('.text-accent-blue.truncate:has-text("Test Bass")')).toBeVisible();
  });

  test('synth preset — flat params (Gemini puts params at top level)', async ({ page }) => {
    await mockGemini(page, {
      message: 'Created flat bass',
      actions: [{
        type: 'preset',
        engine: 'synth',
        name: 'Flat Bass',
        category: 'bass',
        waveform: 'sawtooth', attack: 0.01, decay: 0.3, sustain: 0.5,
        release: 0.5, cutoff: 800, resonance: 10, detune: 15, voices: 3, gain: 0.7,
      }],
    });
    await sendChat(page, 'make a bass');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Preset applied: Flat Bass');
    expect(msg).not.toContain('Error');
  });

  test('synth preset — missing waveform gets default', async ({ page }) => {
    await mockGemini(page, {
      message: 'Created minimal preset',
      actions: [{
        type: 'preset',
        engine: 'synth',
        name: 'Minimal',
        category: 'lead',
        params: { cutoff: 2000, gain: 0.5 },
      }],
    });
    await sendChat(page, 'simple sound');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Preset applied: Minimal');
    expect(msg).not.toContain('Error');
  });

  test('synth preset — empty params gets all defaults', async ({ page }) => {
    await mockGemini(page, {
      message: 'Empty params test',
      actions: [{
        type: 'preset',
        engine: 'synth',
        name: 'Defaults Only',
        category: 'lead',
      }],
    });
    await sendChat(page, 'test');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Preset applied: Defaults Only');
    expect(msg).not.toContain('Error');
  });

  test('synth preset with delay and reverb', async ({ page }) => {
    await mockGemini(page, {
      message: 'Pad with FX',
      actions: [{
        type: 'preset',
        engine: 'synth',
        name: 'FX Pad',
        category: 'pad',
        params: {
          waveform: 'triangle', attack: 0.5, decay: 0.5, sustain: 0.7,
          release: 1.5, cutoff: 3000, resonance: 2, voices: 4, detune: 10, gain: 0.6,
          delayTime: 0.3, delayFeedback: 0.4, delayMix: 0.3, reverbMix: 0.5,
        },
      }],
    });
    await sendChat(page, 'pad with delay');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Preset applied: FX Pad');
    expect(msg).not.toContain('Error');
  });

  test('synth preset with FM params', async ({ page }) => {
    await mockGemini(page, {
      message: 'FM Bell',
      actions: [{
        type: 'preset',
        engine: 'synth',
        name: 'Bell',
        category: 'fx',
        params: {
          waveform: 'sine', attack: 0.001, decay: 1.5, sustain: 0, release: 1,
          cutoff: 8000, resonance: 1, voices: 1, detune: 0, gain: 0.6,
          fm: 500, fmRatio: 5.0, fmDecay: 1.2,
        },
      }],
    });
    await sendChat(page, 'bell');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Preset applied: Bell');
    expect(msg).not.toContain('Error');
  });

  // ─── SUPERDOUGH ───

  test('superdough preset — supersaw', async ({ page }) => {
    await mockGemini(page, {
      message: 'Trance lead',
      actions: [{
        type: 'preset',
        engine: 'superdough',
        name: 'Trance',
        category: 'lead',
        params: {
          s: 'supersaw', gain: 0.7, cutoff: 4000, resonance: 2,
          attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.4,
          unison: 7, spread: 0.8, detune: 0.2,
        },
      }],
    });
    await sendChat(page, 'trance lead');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Preset applied: Trance');
    await expect(page.locator('[data-testid="synth-panel"] button:has-text("SD")')).toBeVisible();
  });

  test('superdough preset — flat params', async ({ page }) => {
    await mockGemini(page, {
      message: 'Acid',
      actions: [{
        type: 'preset',
        engine: 'superdough',
        name: 'Acid Bass',
        category: 'bass',
        s: 'pulse', gain: 0.7, pw: 0.3, cutoff: 500, resonance: 20, distort: 0.5,
      }],
    });
    await sendChat(page, 'acid bass');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Preset applied: Acid Bass');
    expect(msg).not.toContain('Error');
  });

  test('superdough preset — empty params gets defaults', async ({ page }) => {
    await mockGemini(page, {
      message: 'Default SD',
      actions: [{
        type: 'preset',
        engine: 'superdough',
        name: 'SD Default',
        category: 'pad',
      }],
    });
    await sendChat(page, 'test sd');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Preset applied: SD Default');
    expect(msg).not.toContain('Error');
  });

  // ─── WAF INSTRUMENT ───

  test('wafInstrument — trumpet', async ({ page }) => {
    await mockGemini(page, {
      message: 'Trumpet!',
      actions: [{
        type: 'wafInstrument',
        code: '0560_FluidR3_GM',
        name: 'Trumpet',
        gain: 0.8,
      }],
    });
    await sendChat(page, 'trumpet');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('WAF instrument: Trumpet');
    await expect(page.locator('[data-testid="synth-panel"] button:has-text("WAF")')).toBeVisible();
  });

  test('wafInstrument — piano', async ({ page }) => {
    await mockGemini(page, {
      message: 'Piano set',
      actions: [{
        type: 'wafInstrument',
        code: '0000_FluidR3_GM',
        name: 'Grand Piano',
        gain: 0.8,
      }],
    });
    await sendChat(page, 'piano');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('WAF instrument: Grand Piano');
  });

  test('wafInstrument — missing gain gets default', async ({ page }) => {
    await mockGemini(page, {
      message: 'Violin',
      actions: [{
        type: 'wafInstrument',
        code: '0400_FluidR3_GM',
        name: 'Violin',
      }],
    });
    await sendChat(page, 'violin');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('WAF instrument: Violin');
    expect(msg).not.toContain('Error');
  });

  // ─── SWITCH PRESET ───

  test('switchPreset — existing preset', async ({ page }) => {
    await mockGemini(page, {
      message: 'Switched',
      actions: [{ type: 'switchPreset', id: 'grand-piano' }],
    });
    await sendChat(page, 'switch to piano');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Switched to: Grand Piano');
  });

  test('switchPreset — non-existent preset', async ({ page }) => {
    await mockGemini(page, {
      message: 'Try switch',
      actions: [{ type: 'switchPreset', id: 'nonexistent-preset' }],
    });
    await sendChat(page, 'switch');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Preset not found');
  });

  // ─── STRUDEL ───

  test('strudel — play pattern', async ({ page }) => {
    await mockGemini(page, {
      message: 'Playing bass line',
      actions: [{
        type: 'strudel',
        code: "note('c2 [~ c2] eb2 [~ g1]').sound('sawtooth').lpf(600)",
      }],
    });
    await sendChat(page, 'play bass');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Strudel playing');
    // Verify the code was synced to the textarea
    const textarea = page.locator('textarea');
    const val = await textarea.inputValue();
    expect(val).toContain('c2');
  });

  test('strudelStop', async ({ page }) => {
    await mockGemini(page, {
      message: 'Stopped',
      actions: [{ type: 'strudelStop' }],
    });
    await sendChat(page, 'stop');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Strudel stopped');
  });

  // ─── HARMONIZER ───

  test('harmonizer — change key and scale', async ({ page }) => {
    await mockGemini(page, {
      message: 'Changed to D minor',
      actions: [{ type: 'harmonizer', key: 'D', scale: 'minor' }],
    });
    await sendChat(page, 'D minor');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Harmonizer updated');
  });

  test('harmonizer — pentatonic scale', async ({ page }) => {
    await mockGemini(page, {
      message: 'Pentatonic',
      actions: [{ type: 'harmonizer', scale: 'pentatonic' }],
    });
    await sendChat(page, 'pentatonic');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Harmonizer updated');
    expect(msg).not.toContain('Error');
  });

  test('harmonizer — blues scale', async ({ page }) => {
    await mockGemini(page, {
      message: 'Blues',
      actions: [{ type: 'harmonizer', scale: 'blues' }],
    });
    await sendChat(page, 'blues');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Harmonizer updated');
    expect(msg).not.toContain('Error');
  });

  // ─── ARPEGGIATOR ───

  test('arp — enable with pattern', async ({ page }) => {
    await mockGemini(page, {
      message: 'Arp on',
      actions: [{ type: 'arp', enabled: true, pattern: 'up', subdivision: 2 }],
    });
    await sendChat(page, 'arp up');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Arpeggiator updated');
  });

  // ─── BPM ───

  test('bpm — change tempo', async ({ page }) => {
    await mockGemini(page, {
      message: 'Tempo set',
      actions: [{ type: 'bpm', value: 140 }],
    });
    await sendChat(page, 'bpm 140');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('BPM: 140');
  });

  // ─── MULTI-ACTION ───

  test('multi-action — preset + arp + bpm', async ({ page }) => {
    await mockGemini(page, {
      message: 'Full setup',
      actions: [
        {
          type: 'preset',
          engine: 'synth',
          name: 'Multi Test',
          category: 'lead',
          params: {
            waveform: 'sawtooth', attack: 0.01, decay: 0.3, sustain: 0.5,
            release: 0.5, cutoff: 4000, resonance: 5, detune: 10, voices: 3, gain: 0.7,
          },
        },
        { type: 'arp', enabled: true, pattern: 'up', subdivision: 4 },
        { type: 'bpm', value: 150 },
      ],
    });
    await sendChat(page, 'setup');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Preset applied: Multi Test');
    expect(msg).toContain('Arpeggiator updated');
    expect(msg).toContain('BPM: 150');
  });

  test('multi-action — wafInstrument + harmonizer + arp', async ({ page }) => {
    await mockGemini(page, {
      message: 'Jazz setup',
      actions: [
        { type: 'wafInstrument', code: '0650_FluidR3_GM', name: 'Alto Sax', gain: 0.8 },
        { type: 'harmonizer', key: 'D', scale: 'dorian' },
        { type: 'arp', enabled: true, pattern: 'swing', subdivision: 2 },
      ],
    });
    await sendChat(page, 'jazz');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('WAF instrument: Alto Sax');
    expect(msg).toContain('Harmonizer updated');
    expect(msg).toContain('Arpeggiator updated');
  });

  // ─── ERROR HANDLING ───

  test('unknown action type — graceful handling', async ({ page }) => {
    await mockGemini(page, {
      message: 'Unknown test',
      actions: [{ type: 'unknownAction', foo: 'bar' }],
    });
    await sendChat(page, 'test');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Unknown action: unknownAction');
  });

  test('no actions — just message', async ({ page }) => {
    await mockGemini(page, {
      message: 'Just chatting, no actions needed.',
      actions: [],
    });
    await sendChat(page, 'hello');
    await waitForResponse(page);

    const msg = await getLastAiMessage(page);
    expect(msg).toContain('Just chatting');
  });
});
