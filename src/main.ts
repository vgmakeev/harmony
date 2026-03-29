import './style.css';
import { initAudio } from './engine/audio-engine';
import { initSoundRouter } from './engine/sound-router';
import { initKeyboardInput } from './input/keyboard-input';
import { initMidiInput } from './input/midi-input';
import { initHarmonizer } from './music/harmonizer';
import { initArpeggiator } from './music/arpeggiator';
import { renderAppShell } from './ui/app-shell';
import { setPreset } from './core/state';
import { PRESETS } from './data/presets';
import { loadInstrument } from './engine/webaudiofont-engine';
import { initStrudel } from './strudel/strudel-engine';
import { initMidiCcMap } from './input/midi-cc-map';
import { initMidiOutput } from './output/midi-output';


// Wire up all modules
initSoundRouter();
initHarmonizer();
initArpeggiator();
initKeyboardInput();
initMidiInput();
initMidiCcMap();
initMidiOutput();

// Set default preset — use a SuperDough preset that works instantly (no CDN load)
const defaultPreset = PRESETS.find(p => p.id === 'sd-supersaw') ?? PRESETS[0];
setPreset(defaultPreset);

// Build UI
const app = document.getElementById('app')!;
renderAppShell(app);

// Audio init overlay — required for browser autoplay policy
const overlay = document.createElement('div');
overlay.id = 'audio-overlay';
overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-[#09090dee] backdrop-blur-sm cursor-pointer';
overlay.innerHTML = `
  <div class="text-center">
    <div class="text-4xl font-bold text-[#6ea8fe] mb-4">Harmonia</div>
    <div class="text-[#8888a0] text-sm">Click anywhere to start</div>
    <div class="mt-6 w-16 h-16 mx-auto rounded-full border-2 border-[#6ea8fe] flex items-center justify-center">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#6ea8fe"><polygon points="6,3 20,12 6,21"/></svg>
    </div>
  </div>
`;
document.body.appendChild(overlay);

async function handleStart(): Promise<void> {
  overlay.remove();
  document.removeEventListener('click', handleStart);
  document.removeEventListener('keydown', handleStart);
  document.removeEventListener('touchstart', handleStart);

  await initAudio();

  // Init Strudel live coding engine (shares our AudioContext)
  initStrudel().catch((err) => {
    console.warn('Failed to init Strudel:', err);
  });

  // Preload Grand Piano for WebAudioFont presets in background
  loadInstrument('0000_FluidR3_GM').catch(() => {
    console.warn('Failed to preload Grand Piano');
  });
}

document.addEventListener('click', handleStart);
document.addEventListener('keydown', handleStart);
document.addEventListener('touchstart', handleStart);
