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
  return idx < 0;
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
  // ═══════════ KEYS ═══════════
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
    id: 'clavinet', name: 'Clavinet', category: 'keys',
    tags: ['funky', 'percussive'],
    engine: 'superdough',
    params: { s: 'square', gain: 0.6, attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.1, cutoff: 2000, resonance: 4 },
  },
  {
    id: 'organ', name: 'Organ', category: 'keys',
    tags: ['organ', 'drawbar', 'classic'],
    engine: 'webaudiofont',
    params: { instrument: '0160_FluidR3_GM', gain: 0.7 },
  },
  {
    id: 'harpsichord', name: 'Harpsichord', category: 'keys',
    tags: ['baroque', 'plucked', 'bright'],
    engine: 'webaudiofont',
    params: { instrument: '0060_FluidR3_GM', gain: 0.8 },
  },
  {
    id: 'music-box', name: 'Music Box', category: 'keys',
    tags: ['celesta', 'bell', 'delicate'],
    engine: 'webaudiofont',
    params: { instrument: '0100_FluidR3_GM', gain: 0.7 },
  },
  {
    id: 'celesta', name: 'Celesta', category: 'keys',
    tags: ['celesta', 'bright', 'sparkling'],
    engine: 'webaudiofont',
    params: { instrument: '0080_FluidR3_GM', gain: 0.7 },
  },

  // ═══════════ BASS ═══════════
  {
    id: 'sd-acid', name: 'Acid Bass 303', category: 'bass',
    tags: ['acid', '303', 'squelchy'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.7, cutoff: 500, resonance: 20, attack: 0.005, decay: 0.15, sustain: 0.1, release: 0.05, distort: 0.5 },
  },
  {
    id: 'sd-sub-bass', name: 'Deep Sub Bass', category: 'bass',
    tags: ['sub', 'deep', 'clean'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.9, attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.3, cutoff: 2000 },
  },
  {
    id: 'sd-saw-bass', name: 'Fat Saw Bass', category: 'bass',
    tags: ['saw', 'fat', 'unison'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.7, cutoff: 600, resonance: 3, attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.1, distort: 0.2 },
  },
  {
    id: 'finger-bass', name: 'Finger Bass', category: 'bass',
    tags: ['bass', 'fingered', 'acoustic'],
    engine: 'webaudiofont',
    params: { instrument: '0330_FluidR3_GM', gain: 0.9 },
  },
  {
    id: 'sd-reese', name: 'Reese Bass', category: 'bass',
    tags: ['reese', 'detuned', 'dnb'],
    engine: 'superdough',
    params: { s: 'supersaw', gain: 0.7, cutoff: 300, resonance: 2, attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.15, unison: 3, spread: 0.5, detune: 0.4 },
  },
  {
    id: 'sd-wobble', name: 'Wobble Bass', category: 'bass',
    tags: ['wobble', 'dubstep', 'filtered'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.7, cutoff: 800, resonance: 18, attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.1, distort: 0.3 },
  },
  {
    id: 'slap-bass', name: 'Slap Bass', category: 'bass',
    tags: ['slap', 'funky', 'acoustic'],
    engine: 'webaudiofont',
    params: { instrument: '0360_FluidR3_GM', gain: 0.9 },
  },
  {
    id: 'sd-square-bass', name: 'Square Bass', category: 'bass',
    tags: ['square', '8bit', 'retro'],
    engine: 'superdough',
    params: { s: 'square', gain: 0.6, cutoff: 1000, resonance: 3, attack: 0.005, decay: 0.15, sustain: 0.5, release: 0.08 },
  },
  {
    id: 'sd-pulse-bass', name: 'Pulse Bass', category: 'bass',
    tags: ['pulse', 'bass', 'analog'],
    engine: 'superdough',
    params: { s: 'pulse', gain: 0.7, pw: 0.3, cutoff: 600, resonance: 12, attack: 0.005, decay: 0.25, sustain: 0.4, release: 0.1 },
  },

  // ═══════════ PADS ═══════════
  {
    id: 'sd-warm-pad', name: 'Warm Pad', category: 'pad',
    tags: ['warm', 'analog', 'lush'],
    engine: 'superdough',
    params: { s: 'supersaw', gain: 0.5, cutoff: 1200, resonance: 2, attack: 0.8, decay: 0.5, sustain: 0.7, release: 1.5, unison: 5, spread: 0.4, detune: 0.15, room: 0.3 },
  },
  {
    id: 'string-pad', name: 'String Ensemble', category: 'pad',
    tags: ['strings', 'orchestral', 'ensemble'],
    engine: 'webaudiofont',
    params: { instrument: '0480_FluidR3_GM', gain: 0.7 },
  },
  {
    id: 'sd-dark-pad', name: 'Dark Pad', category: 'pad',
    tags: ['dark', 'moody', 'cinematic'],
    engine: 'superdough',
    params: { s: 'square', gain: 0.5, cutoff: 500, resonance: 5, attack: 1.0, decay: 1.0, sustain: 0.6, release: 2.0, room: 0.4, roomsize: 5 },
  },
  {
    id: 'choir', name: 'Choir Aahs', category: 'pad',
    tags: ['choir', 'vocal', 'ethereal'],
    engine: 'webaudiofont',
    params: { instrument: '0520_FluidR3_GM', gain: 0.7 },
  },
  {
    id: 'sd-sine-pad', name: 'Sine Pad', category: 'pad',
    tags: ['sine', 'ambient', 'soft'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.6, attack: 0.5, decay: 0.5, sustain: 0.8, release: 1.5, room: 0.6, roomsize: 4 },
  },
  {
    id: 'sd-supersaw-pad', name: 'SuperSaw Pad', category: 'pad',
    tags: ['supersaw', 'lush', 'trance'],
    engine: 'superdough',
    params: { s: 'supersaw', gain: 0.5, cutoff: 2500, resonance: 1, attack: 0.8, decay: 0.5, sustain: 0.7, release: 2, unison: 5, spread: 0.6, detune: 0.15, room: 0.4, roomsize: 3, delay: 0.2, delaytime: 0.2, delayfeedback: 0.25 },
  },
  {
    id: 'sd-vowel-pad', name: 'Vowel Pad', category: 'pad',
    tags: ['vowel', 'formant', 'unique'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.6, vowel: 'o', attack: 0.4, decay: 0.3, sustain: 0.7, release: 1, room: 0.3 },
  },
  {
    id: 'sd-space-pad', name: 'Space Pad', category: 'pad',
    tags: ['space', 'wide', 'cinematic'],
    engine: 'superdough',
    params: { s: 'supersaw', gain: 0.4, cutoff: 800, resonance: 4, attack: 1.0, decay: 1.5, sustain: 0.5, release: 2.5, unison: 7, spread: 0.8, detune: 0.3, room: 0.5, roomsize: 6 },
  },

  // ═══════════ LEADS ═══════════
  {
    id: 'sd-supersaw', name: 'SuperSaw Lead', category: 'lead',
    tags: ['supersaw', 'trance', 'unison'],
    engine: 'superdough',
    params: { s: 'supersaw', gain: 0.7, cutoff: 4000, resonance: 2, attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.4, unison: 7, spread: 0.8, detune: 0.2 },
  },
  {
    id: 'sd-screaming-saw', name: 'Screaming Saw', category: 'lead',
    tags: ['saw', 'aggressive', 'bright'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.6, cutoff: 3000, resonance: 6, attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.2, distort: 0.2 },
  },
  {
    id: 'sd-square-lead', name: 'Square Lead', category: 'lead',
    tags: ['square', 'retro', 'thick'],
    engine: 'superdough',
    params: { s: 'square', gain: 0.6, cutoff: 3000, resonance: 4, attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.2, delay: 0.3, delaytime: 0.15, delayfeedback: 0.3 },
  },
  {
    id: 'sd-chip-lead', name: 'Chip Lead', category: 'lead',
    tags: ['chiptune', '8bit', 'game'],
    engine: 'superdough',
    params: { s: 'square', gain: 0.5, cutoff: 6000, resonance: 1, attack: 0.001, decay: 0.1, sustain: 0.4, release: 0.05 },
  },
  {
    id: 'sd-theremin', name: 'Theremin', category: 'lead',
    tags: ['theremin', 'smooth', 'eerie'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.6, attack: 0.15, decay: 0.1, sustain: 0.9, release: 0.3, cutoff: 5000, room: 0.3 },
  },
  {
    id: 'flute', name: 'Flute', category: 'lead',
    tags: ['flute', 'woodwind', 'acoustic'],
    engine: 'webaudiofont',
    params: { instrument: '0730_FluidR3_GM', gain: 0.8 },
  },

  // ═══════════ FX ═══════════
  {
    id: 'sd-pluck', name: 'Pluck', category: 'fx',
    tags: ['pluck', 'short', 'percussive'],
    engine: 'superdough',
    params: { s: 'triangle', gain: 0.7, attack: 0.001, decay: 0.4, sustain: 0, release: 0.3, cutoff: 2500, resonance: 2 },
  },
  {
    id: 'sd-noise-perc', name: 'Noise Perc', category: 'fx',
    tags: ['noise', 'percussion', 'hit'],
    engine: 'superdough',
    params: { s: 'white', gain: 0.4, cutoff: 5000, resonance: 5, attack: 0.001, decay: 0.08, sustain: 0, release: 0.03 },
  },
  {
    id: 'vibraphone', name: 'Vibraphone', category: 'fx',
    tags: ['vibes', 'mallet', 'acoustic'],
    engine: 'webaudiofont',
    params: { instrument: '0110_FluidR3_GM', gain: 0.8 },
  },
  {
    id: 'sd-glitch', name: 'Glitch', category: 'fx',
    tags: ['glitch', 'digital', 'harsh'],
    engine: 'superdough',
    params: { s: 'square', gain: 0.5, cutoff: 4000, resonance: 10, attack: 0.001, decay: 0.15, sustain: 0, release: 0.05, crush: 8, distort: 0.4 },
  },
  {
    id: 'sd-sweep', name: 'Sweep', category: 'fx',
    tags: ['sweep', 'riser', 'filter'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.5, cutoff: 200, resonance: 12, attack: 2.0, decay: 0.5, sustain: 0, release: 0.5 },
  },

  // ═══════════ ORCHESTRAL ═══════════
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
];
