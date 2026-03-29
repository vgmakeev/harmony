import type { Preset } from '../types';

// User presets from localStorage
const USER_PRESETS_KEY = 'harmonia_user_presets';
const FAVORITES_KEY = 'harmonia_favorites';
const RECENT_KEY = 'harmonia_recent';
const MAX_RECENT = 10;

function loadUserPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(USER_PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUserPresets(): void {
  localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(userPresets));
}

export const userPresets: Preset[] = loadUserPresets();
const favorites: string[] = loadStringArray(FAVORITES_KEY);
const recentIds: string[] = loadStringArray(RECENT_KEY);

export function addUserPreset(preset: Preset): void {
  const idx = userPresets.findIndex(p => p.id === preset.id);
  if (idx >= 0) userPresets.splice(idx, 1);
  userPresets.push(preset);
  saveUserPresets();
}

export function deleteUserPreset(id: string): void {
  const idx = userPresets.findIndex(p => p.id === id);
  if (idx >= 0) {
    userPresets.splice(idx, 1);
    saveUserPresets();
  }
}

export function getAllPresets(): Preset[] {
  return [...PRESETS, ...userPresets];
}

export function validatePreset(obj: unknown): obj is Preset {
  if (typeof obj !== 'object' || obj === null) return false;
  const p = obj as Record<string, unknown>;
  return typeof p.id === 'string' && typeof p.name === 'string'
    && typeof p.engine === 'string' && typeof p.params === 'object';
}

// Favorites
export function isFavorite(id: string): boolean {
  return favorites.includes(id);
}

export function toggleFavorite(id: string): boolean {
  const idx = favorites.indexOf(id);
  if (idx >= 0) {
    favorites.splice(idx, 1);
  } else {
    favorites.push(id);
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return idx < 0; // true if now favorite
}

export function getFavoriteIds(): string[] {
  return [...favorites];
}

// Recent presets
export function pushRecent(id: string): void {
  const idx = recentIds.indexOf(id);
  if (idx >= 0) recentIds.splice(idx, 1);
  recentIds.unshift(id);
  if (recentIds.length > MAX_RECENT) recentIds.length = MAX_RECENT;
  localStorage.setItem(RECENT_KEY, JSON.stringify(recentIds));
}

export function getRecentIds(): string[] {
  return [...recentIds];
}

export const PRESETS: Preset[] = [
  // === KEYS (5) ===
  {
    id: 'grand-piano', name: 'Grand Piano', category: 'keys',
    tags: ['piano', 'acoustic', 'realistic'],
    engine: 'webaudiofont',
    params: { instrument: '0000_FluidR3_GM', gain: 0.8 },
  },
  {
    id: 'electric-piano', name: 'Electric Piano', category: 'keys',
    tags: ['rhodes', 'electric', 'warm'],
    engine: 'webaudiofont',
    params: { instrument: '0040_FluidR3_GM', gain: 0.8 },
  },
  {
    id: 'dx7-epiano', name: 'DX7 E.Piano', category: 'keys',
    tags: ['fm', 'digital', 'bell'],
    engine: 'synth',
    params: {
      waveform: 'sine', attack: 0.005, decay: 1.2, sustain: 0.2, release: 0.4,
      cutoff: 8000, resonance: 1, detune: 0, voices: 1, gain: 0.7,
      fm: 6, fmRatio: 3.5, fmDecay: 0.8,
    },
  },
  {
    id: 'clavinet', name: 'Clavinet', category: 'keys',
    tags: ['funky', 'percussive'],
    engine: 'synth',
    params: {
      waveform: 'square', attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.1,
      cutoff: 2000, resonance: 4, detune: 0, voices: 1, gain: 0.6,
    },
  },
  {
    id: 'organ', name: 'Organ', category: 'keys',
    tags: ['organ', 'drawbar', 'classic'],
    engine: 'webaudiofont',
    params: { instrument: '0160_FluidR3_GM', gain: 0.7 },
  },

  // === BASS (4) ===
  {
    id: 'acid-303', name: 'Acid Bass 303', category: 'bass',
    tags: ['acid', 'squelchy', 'electronic'],
    engine: 'synth',
    params: {
      waveform: 'sawtooth', attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.05,
      cutoff: 400, resonance: 15, detune: 0, voices: 1, gain: 0.7,
      distortion: 0.3,
    },
  },
  {
    id: 'deep-sub', name: 'Deep Sub Bass', category: 'bass',
    tags: ['sub', 'deep', 'clean'],
    engine: 'synth',
    params: {
      waveform: 'sine', attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.3,
      cutoff: 2000, resonance: 1, detune: 0, voices: 1, gain: 0.9,
    },
  },
  {
    id: 'fat-saw-bass', name: 'Fat Saw Bass', category: 'bass',
    tags: ['saw', 'fat', 'unison'],
    engine: 'synth',
    params: {
      waveform: 'sawtooth', attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.1,
      cutoff: 600, resonance: 3, detune: 15, voices: 3, gain: 0.6,
    },
  },
  {
    id: 'finger-bass', name: 'Finger Bass', category: 'bass',
    tags: ['bass', 'fingered', 'acoustic'],
    engine: 'webaudiofont',
    params: { instrument: '0330_FluidR3_GM', gain: 0.9 },
  },

  // === PADS (4) ===
  {
    id: 'warm-pad', name: 'Warm Analog Pad', category: 'pad',
    tags: ['warm', 'analog', 'lush'],
    engine: 'synth',
    params: {
      waveform: 'sawtooth', attack: 0.8, decay: 0.5, sustain: 0.7, release: 1.5,
      cutoff: 1200, resonance: 2, detune: 20, voices: 4, gain: 0.5,
    },
  },
  {
    id: 'string-pad', name: 'String Ensemble', category: 'pad',
    tags: ['strings', 'orchestral', 'ensemble'],
    engine: 'webaudiofont',
    params: { instrument: '0480_FluidR3_GM', gain: 0.7 },
  },
  {
    id: 'dark-pad', name: 'Dark Pad', category: 'pad',
    tags: ['dark', 'moody', 'cinematic'],
    engine: 'synth',
    params: {
      waveform: 'square', attack: 1.0, decay: 1.0, sustain: 0.6, release: 2.0,
      cutoff: 500, resonance: 5, detune: 10, voices: 2, gain: 0.5,
    },
  },
  {
    id: 'choir', name: 'Choir Aahs', category: 'pad',
    tags: ['choir', 'vocal', 'ethereal'],
    engine: 'webaudiofont',
    params: { instrument: '0520_FluidR3_GM', gain: 0.7 },
  },

  // === LEAD (4) ===
  {
    id: 'screaming-saw', name: 'Screaming Saw', category: 'lead',
    tags: ['saw', 'aggressive', 'bright'],
    engine: 'synth',
    params: {
      waveform: 'sawtooth', attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.2,
      cutoff: 3000, resonance: 6, detune: 0, voices: 1, gain: 0.6,
      distortion: 0.15,
    },
  },
  {
    id: 'fm-bell', name: 'FM Bell', category: 'lead',
    tags: ['fm', 'bell', 'metallic'],
    engine: 'synth',
    params: {
      waveform: 'sine', attack: 0.001, decay: 2.0, sustain: 0.0, release: 0.5,
      cutoff: 8000, resonance: 1, detune: 0, voices: 1, gain: 0.6,
      fm: 8, fmRatio: 5.0, fmDecay: 1.5,
    },
  },
  {
    id: 'sync-lead', name: 'Sync Lead', category: 'lead',
    tags: ['sync', 'edgy', 'unison'],
    engine: 'synth',
    params: {
      waveform: 'sawtooth', attack: 0.005, decay: 0.2, sustain: 0.6, release: 0.15,
      cutoff: 4000, resonance: 3, detune: 7, voices: 2, gain: 0.6,
    },
  },
  {
    id: 'flute', name: 'Flute', category: 'lead',
    tags: ['flute', 'woodwind', 'acoustic'],
    engine: 'webaudiofont',
    params: { instrument: '0730_FluidR3_GM', gain: 0.8 },
  },

  // === FX / OTHER (3) ===
  {
    id: 'pluck', name: 'Pluck', category: 'fx',
    tags: ['pluck', 'short', 'percussive'],
    engine: 'synth',
    params: {
      waveform: 'triangle', attack: 0.001, decay: 0.4, sustain: 0.0, release: 0.3,
      cutoff: 2500, resonance: 2, detune: 0, voices: 1, gain: 0.7,
    },
  },
  {
    id: 'brass-stab', name: 'Brass Stab', category: 'fx',
    tags: ['brass', 'stab', 'punchy'],
    engine: 'synth',
    params: {
      waveform: 'sawtooth', attack: 0.05, decay: 0.15, sustain: 0.5, release: 0.2,
      cutoff: 1500, resonance: 4, detune: 8, voices: 3, gain: 0.6,
    },
  },
  {
    id: 'vibraphone', name: 'Vibraphone', category: 'fx',
    tags: ['vibes', 'mallet', 'acoustic'],
    engine: 'webaudiofont',
    params: { instrument: '0110_FluidR3_GM', gain: 0.8 },
  },

  // === KEYS +3 ===
  {
    id: 'wurlitzer', name: 'Wurlitzer', category: 'keys',
    tags: ['wurli', 'electric', 'vintage'],
    engine: 'synth',
    params: {
      waveform: 'sine', attack: 0.005, decay: 0.8, sustain: 0.3, release: 0.3,
      cutoff: 3000, resonance: 2, detune: 0, voices: 1, gain: 0.65,
      fm: 3, fmRatio: 1, fmDecay: 0.4,
    },
  },
  {
    id: 'music-box', name: 'Music Box', category: 'keys',
    tags: ['celesta', 'bell', 'delicate'],
    engine: 'synth',
    params: {
      waveform: 'sine', attack: 0.001, decay: 1.5, sustain: 0.0, release: 0.8,
      cutoff: 12000, resonance: 0.5, detune: 0, voices: 1, gain: 0.5,
      fm: 12, fmRatio: 5.07, fmDecay: 0.6,
    },
  },
  {
    id: 'harpsichord', name: 'Harpsichord', category: 'keys',
    tags: ['baroque', 'plucked', 'bright'],
    engine: 'webaudiofont',
    params: { instrument: '0060_FluidR3_GM', gain: 0.8 },
  },

  // === BASS +4 ===
  {
    id: 'reese-bass', name: 'Reese Bass', category: 'bass',
    tags: ['reese', 'detuned', 'dnb'],
    engine: 'synth',
    params: {
      waveform: 'sawtooth', attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.15,
      cutoff: 300, resonance: 2, detune: 25, voices: 2, gain: 0.7,
    },
  },
  {
    id: 'wobble-bass', name: 'Wobble Bass', category: 'bass',
    tags: ['wobble', 'dubstep', 'filtered'],
    engine: 'synth',
    params: {
      waveform: 'sawtooth', attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.1,
      cutoff: 800, resonance: 18, detune: 5, voices: 1, gain: 0.7,
      distortion: 0.2,
    },
  },
  {
    id: 'slap-bass', name: 'Slap Bass', category: 'bass',
    tags: ['slap', 'funky', 'acoustic'],
    engine: 'webaudiofont',
    params: { instrument: '0360_FluidR3_GM', gain: 0.9 },
  },
  {
    id: 'square-bass', name: 'Square Bass', category: 'bass',
    tags: ['square', '8bit', 'retro'],
    engine: 'synth',
    params: {
      waveform: 'square', attack: 0.005, decay: 0.15, sustain: 0.5, release: 0.08,
      cutoff: 1000, resonance: 3, detune: 0, voices: 1, gain: 0.6,
    },
  },

  // === PAD +5 ===
  {
    id: 'glass-pad', name: 'Glass Pad', category: 'pad',
    tags: ['glass', 'fm', 'shimmering'],
    engine: 'synth',
    params: {
      waveform: 'sine', attack: 1.0, decay: 1.0, sustain: 0.6, release: 2.0,
      cutoff: 6000, resonance: 1, detune: 0, voices: 2, gain: 0.45,
      fm: 4, fmRatio: 3, fmDecay: 2.0,
    },
  },
  {
    id: 'pwm-pad', name: 'PWM Pad', category: 'pad',
    tags: ['pwm', 'classic', 'analog'],
    engine: 'synth',
    params: {
      waveform: 'square', attack: 0.6, decay: 0.8, sustain: 0.7, release: 1.5,
      cutoff: 2000, resonance: 3, detune: 15, voices: 3, gain: 0.45,
    },
  },
  {
    id: 'shimmer-pad', name: 'Shimmer Pad', category: 'pad',
    tags: ['shimmer', 'bright', 'ethereal'],
    engine: 'synth',
    params: {
      waveform: 'sine', attack: 1.2, decay: 0.5, sustain: 0.8, release: 2.5,
      cutoff: 10000, resonance: 1, detune: 8, voices: 4, gain: 0.4,
      fm: 6, fmRatio: 7, fmDecay: 3.0,
    },
  },
  {
    id: 'ambient-pad', name: 'Ambient Pad', category: 'pad',
    tags: ['ambient', 'soft', 'airy'],
    engine: 'synth',
    params: {
      waveform: 'triangle', attack: 1.5, decay: 1.0, sustain: 0.6, release: 3.0,
      cutoff: 3000, resonance: 1, detune: 12, voices: 4, gain: 0.4,
    },
  },
  {
    id: 'space-pad', name: 'Space Pad', category: 'pad',
    tags: ['space', 'wide', 'cinematic'],
    engine: 'synth',
    params: {
      waveform: 'sawtooth', attack: 1.0, decay: 1.5, sustain: 0.5, release: 2.5,
      cutoff: 800, resonance: 4, detune: 25, voices: 4, gain: 0.4,
    },
  },

  // === LEAD +5 ===
  {
    id: 'theremin', name: 'Theremin', category: 'lead',
    tags: ['theremin', 'smooth', 'eerie'],
    engine: 'synth',
    params: {
      waveform: 'sine', attack: 0.15, decay: 0.1, sustain: 0.9, release: 0.3,
      cutoff: 5000, resonance: 1, detune: 0, voices: 1, gain: 0.6,
    },
  },
  {
    id: 'whistle', name: 'Whistle', category: 'lead',
    tags: ['whistle', 'pure', 'high'],
    engine: 'synth',
    params: {
      waveform: 'sine', attack: 0.08, decay: 0.05, sustain: 0.85, release: 0.15,
      cutoff: 8000, resonance: 0.5, detune: 0, voices: 1, gain: 0.5,
    },
  },
  {
    id: 'square-lead', name: 'Square Lead', category: 'lead',
    tags: ['square', 'retro', 'thick'],
    engine: 'synth',
    params: {
      waveform: 'square', attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.15,
      cutoff: 2500, resonance: 4, detune: 0, voices: 1, gain: 0.55,
    },
  },
  {
    id: 'chip-lead', name: 'Chip Lead', category: 'lead',
    tags: ['chiptune', '8bit', 'game'],
    engine: 'synth',
    params: {
      waveform: 'square', attack: 0.001, decay: 0.1, sustain: 0.4, release: 0.05,
      cutoff: 6000, resonance: 1, detune: 0, voices: 1, gain: 0.5,
    },
  },
  {
    id: 'trance-lead', name: 'Trance Lead', category: 'lead',
    tags: ['trance', 'supersaw', 'euphoric'],
    engine: 'synth',
    params: {
      waveform: 'sawtooth', attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.2,
      cutoff: 5000, resonance: 5, detune: 20, voices: 5, gain: 0.5,
    },
  },

  // === FX +5 ===
  {
    id: 'laser', name: 'Laser', category: 'fx',
    tags: ['laser', 'zap', 'sfx'],
    engine: 'synth',
    params: {
      waveform: 'sawtooth', attack: 0.001, decay: 0.3, sustain: 0.0, release: 0.1,
      cutoff: 8000, resonance: 2, detune: 0, voices: 1, gain: 0.6,
      fm: 20, fmRatio: 8, fmDecay: 0.15,
    },
  },
  {
    id: 'noise-hit', name: 'Noise Hit', category: 'fx',
    tags: ['noise', 'hit', 'percussive'],
    engine: 'synth',
    params: {
      waveform: 'sawtooth', attack: 0.001, decay: 0.08, sustain: 0.0, release: 0.05,
      cutoff: 12000, resonance: 0, detune: 50, voices: 8, gain: 0.4,
    },
  },
  {
    id: 'dial-tone', name: 'Dial Tone', category: 'fx',
    tags: ['telephone', 'dtmf', 'retro'],
    engine: 'synth',
    params: {
      waveform: 'sine', attack: 0.001, decay: 0.01, sustain: 1.0, release: 0.02,
      cutoff: 15000, resonance: 0, detune: 0, voices: 1, gain: 0.4,
      fm: 5, fmRatio: 2.5, fmDecay: 0,
    },
  },
  {
    id: 'glitch', name: 'Glitch', category: 'fx',
    tags: ['glitch', 'digital', 'harsh'],
    engine: 'synth',
    params: {
      waveform: 'square', attack: 0.001, decay: 0.15, sustain: 0.0, release: 0.05,
      cutoff: 4000, resonance: 10, detune: 0, voices: 1, gain: 0.5,
      fm: 50, fmRatio: 13.37, fmDecay: 0.08,
    },
  },
  {
    id: 'sweep', name: 'Sweep', category: 'fx',
    tags: ['sweep', 'riser', 'filter'],
    engine: 'synth',
    params: {
      waveform: 'sawtooth', attack: 2.0, decay: 0.5, sustain: 0.0, release: 0.5,
      cutoff: 200, resonance: 12, detune: 10, voices: 2, gain: 0.5,
    },
  },

  // === ORCHESTRAL (5) ===
  {
    id: 'violin', name: 'Violin', category: 'orch',
    tags: ['violin', 'strings', 'solo'],
    engine: 'webaudiofont',
    params: { instrument: '0400_FluidR3_GM', gain: 0.8 },
  },
  {
    id: 'cello', name: 'Cello', category: 'orch',
    tags: ['cello', 'strings', 'deep'],
    engine: 'webaudiofont',
    params: { instrument: '0420_FluidR3_GM', gain: 0.8 },
  },
  {
    id: 'trumpet', name: 'Trumpet', category: 'orch',
    tags: ['trumpet', 'brass', 'bright'],
    engine: 'webaudiofont',
    params: { instrument: '0560_FluidR3_GM', gain: 0.8 },
  },
  {
    id: 'alto-sax', name: 'Alto Sax', category: 'orch',
    tags: ['saxophone', 'jazz', 'woodwind'],
    engine: 'webaudiofont',
    params: { instrument: '0650_FluidR3_GM', gain: 0.8 },
  },
  {
    id: 'acoustic-guitar', name: 'Acoustic Guitar', category: 'orch',
    tags: ['guitar', 'nylon', 'acoustic'],
    engine: 'webaudiofont',
    params: { instrument: '0250_FluidR3_GM', gain: 0.8 },
  },

  // === DRUMS / SYNTH PERC (3) ===
  {
    id: 'kick-synth', name: 'Kick Synth', category: 'fx',
    tags: ['kick', 'drum', 'bass'],
    engine: 'synth',
    params: {
      waveform: 'sine', attack: 0.001, decay: 0.25, sustain: 0.0, release: 0.1,
      cutoff: 2000, resonance: 0, detune: 0, voices: 1, gain: 0.9,
      fm: 15, fmRatio: 1.5, fmDecay: 0.06,
    },
  },
  {
    id: 'snare-synth', name: 'Snare Synth', category: 'fx',
    tags: ['snare', 'drum', 'noise'],
    engine: 'synth',
    params: {
      waveform: 'triangle', attack: 0.001, decay: 0.12, sustain: 0.0, release: 0.08,
      cutoff: 8000, resonance: 1, detune: 50, voices: 6, gain: 0.6,
    },
  },
  {
    id: 'hihat-synth', name: 'Hi-Hat Synth', category: 'fx',
    tags: ['hihat', 'drum', 'metallic'],
    engine: 'synth',
    params: {
      waveform: 'square', attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.03,
      cutoff: 12000, resonance: 2, detune: 40, voices: 4, gain: 0.4,
      fm: 30, fmRatio: 11.13, fmDecay: 0.02,
    },
  },

  // === SUPERDOUGH ===
  {
    id: 'sd-supersaw', name: 'SD SuperSaw', category: 'lead',
    tags: ['supersaw', 'trance', 'unison', 'superdough'],
    engine: 'superdough',
    params: { s: 'supersaw', gain: 0.7, cutoff: 4000, resonance: 2, attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.4, unison: 7, spread: 0.8, detune: 0.2 },
  },
  {
    id: 'sd-saw-bass', name: 'SD Saw Bass', category: 'bass',
    tags: ['bass', 'sawtooth', 'superdough'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.8, cutoff: 800, resonance: 8, attack: 0.005, decay: 0.2, sustain: 0.3, release: 0.1, distort: 0.3 },
  },
  {
    id: 'sd-square-lead', name: 'SD Square Lead', category: 'lead',
    tags: ['square', 'lead', 'superdough'],
    engine: 'superdough',
    params: { s: 'square', gain: 0.6, cutoff: 3000, resonance: 4, attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.2, delay: 0.3, delaytime: 0.15, delayfeedback: 0.3 },
  },
  {
    id: 'sd-sine-pad', name: 'SD Sine Pad', category: 'pad',
    tags: ['sine', 'pad', 'ambient', 'superdough'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.6, attack: 0.5, decay: 0.5, sustain: 0.8, release: 1.5, room: 0.6, roomsize: 4 },
  },
  {
    id: 'sd-pulse-bass', name: 'SD Pulse Bass', category: 'bass',
    tags: ['pulse', 'bass', 'superdough'],
    engine: 'superdough',
    params: { s: 'pulse', gain: 0.7, pw: 0.3, cutoff: 600, resonance: 12, attack: 0.005, decay: 0.25, sustain: 0.4, release: 0.1 },
  },
  {
    id: 'sd-supersaw-pad', name: 'SD SuperSaw Pad', category: 'pad',
    tags: ['supersaw', 'pad', 'lush', 'superdough'],
    engine: 'superdough',
    params: { s: 'supersaw', gain: 0.5, cutoff: 2500, resonance: 1, attack: 0.8, decay: 0.5, sustain: 0.7, release: 2, unison: 5, spread: 0.6, detune: 0.15, room: 0.4, roomsize: 3, delay: 0.2, delaytime: 0.2, delayfeedback: 0.25 },
  },
  {
    id: 'sd-acid', name: 'SD Acid', category: 'bass',
    tags: ['acid', '303', 'superdough'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.7, cutoff: 500, resonance: 20, attack: 0.005, decay: 0.15, sustain: 0.1, release: 0.05, distort: 0.5 },
  },
  {
    id: 'sd-triangle-sub', name: 'SD Sub Bass', category: 'bass',
    tags: ['triangle', 'sub', 'superdough'],
    engine: 'superdough',
    params: { s: 'triangle', gain: 0.8, cutoff: 400, resonance: 0, attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.15 },
  },
  {
    id: 'sd-noise-perc', name: 'SD Noise Perc', category: 'fx',
    tags: ['noise', 'percussion', 'superdough'],
    engine: 'superdough',
    params: { s: 'white', gain: 0.4, cutoff: 5000, resonance: 5, attack: 0.001, decay: 0.08, sustain: 0, release: 0.03 },
  },
  {
    id: 'sd-vowel-pad', name: 'SD Vowel Pad', category: 'pad',
    tags: ['vowel', 'formant', 'superdough'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.6, vowel: 'o', attack: 0.4, decay: 0.3, sustain: 0.7, release: 1, room: 0.3 },
  },
];
