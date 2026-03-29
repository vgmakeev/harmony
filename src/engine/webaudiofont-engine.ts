import { getAudioContext, getMasterGain } from './audio-engine';

interface Envelope {
  cancel: () => void;
}

let player: any = null;
const loadedInstruments = new Map<string, unknown>();
const activeEnvelopes = new Map<number, Envelope>();

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(script);
  });
}

async function ensurePlayer(): Promise<any> {
  if (player) return player;

  await loadScript('https://cdn.jsdelivr.net/npm/webaudiofont@3.0.4/npm/dist/WebAudioFontPlayer.js');

  if (!(window as any).WebAudioFontPlayer) {
    throw new Error('WebAudioFontPlayer not found after loading script');
  }
  player = new (window as any).WebAudioFontPlayer();
  return player;
}

export async function loadInstrument(instrumentName: string): Promise<void> {
  if (loadedInstruments.has(instrumentName)) return;

  const pl = await ensurePlayer();
  const ctx = getAudioContext();

  const varName = `_tone_${instrumentName}_sf2_file`;
  const url = `https://surikov.github.io/webaudiofontdata/sound/${instrumentName}_sf2_file.js`;

  await new Promise<void>((resolve) => {
    pl.loader.startLoad(ctx, url, varName);
    pl.loader.waitLoad(() => {
      const data = (window as any)[varName];
      if (data) {
        loadedInstruments.set(instrumentName, data);
      }
      resolve();
    });
  });
}

export function wafNoteOn(note: number, velocity: number, instrumentName: string, gain: number): void {
  if (!player) return;
  const instrument = loadedInstruments.get(instrumentName);
  if (!instrument) {
    console.warn(`Instrument not loaded: ${instrumentName}`);
    return;
  }

  const ctx = getAudioContext();
  const vol = (velocity / 127) * gain;
  const envelope = player.queueWaveTable(
    ctx, getMasterGain(), instrument,
    0, note, 9999, vol
  );
  if (envelope) {
    activeEnvelopes.set(note, envelope);
  }
}

export function wafNoteOff(note: number): void {
  const envelope = activeEnvelopes.get(note);
  if (envelope) {
    envelope.cancel();
    activeEnvelopes.delete(note);
  }
}

export function wafAllNotesOff(): void {
  for (const note of activeEnvelopes.keys()) {
    wafNoteOff(note);
  }
}
