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
    params: { s: 'square', gain: 0.6, attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.1, cutoff: 2000, resonance: 4, fenv: 3000, fdecay: 0.15 },
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
    params: { s: 'sawtooth', gain: 0.7, cutoff: 400, resonance: 22, attack: 0.005, decay: 0.15, sustain: 0.05, release: 0.05, fenv: 4000, fdecay: 0.12, distort: 0.5 },
  },
  {
    id: 'sd-sub-bass', name: 'Deep Sub Bass', category: 'bass',
    tags: ['sub', 'deep', 'clean'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.9, attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.3, cutoff: 2000, sub: 0.6 },
  },
  {
    id: 'sd-808-bass', name: '808 Bass', category: 'bass',
    tags: ['808', 'trap', 'hip-hop', 'pitch'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.9, penv: 12, pdecay: 0.15, attack: 0.005, decay: 0.8, sustain: 0.3, release: 0.4, cutoff: 500, sub: 0.4, distort: 0.1 },
  },
  {
    id: 'sd-saw-bass', name: 'Fat Saw Bass', category: 'bass',
    tags: ['saw', 'fat', 'unison'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.7, cutoff: 600, resonance: 3, attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.1, sub: 0.5, s2: 'sawtooth', osc2detune: 7, osc2mix: 0.4 },
  },
  {
    id: 'sd-moog-bass', name: 'Moog Bass', category: 'bass',
    tags: ['moog', 'analog', 'classic', 'fat'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.7, cutoff: 300, resonance: 8, attack: 0.005, decay: 0.25, sustain: 0.4, release: 0.08, fenv: 3000, fdecay: 0.2, sub: 0.7, distort: 0.15 },
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
    params: { s: 'sawtooth', gain: 0.7, cutoff: 300, resonance: 2, attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.15, s2: 'sawtooth', osc2detune: 30, osc2mix: 0.8, sub: 0.6 },
  },
  {
    id: 'sd-wobble', name: 'Wobble Bass', category: 'bass',
    tags: ['wobble', 'dubstep', 'filtered'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.7, cutoff: 800, resonance: 18, attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.1, distort: 0.3, lfo: 3, lfodepth: 2000, sub: 0.5 },
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
    params: { s: 'sawtooth', gain: 0.5, cutoff: 1200, resonance: 2, attack: 0.8, decay: 0.5, sustain: 0.7, release: 1.5, s2: 'sawtooth', osc2detune: 8, osc2mix: 0.7, sub: 0.3, room: 0.3 },
  },
  {
    id: 'sd-juno-pad', name: 'Juno Pad', category: 'pad',
    tags: ['juno', 'roland', 'analog', 'classic'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.5, cutoff: 1500, resonance: 3, attack: 0.6, decay: 0.8, sustain: 0.6, release: 2, s2: 'sawtooth', osc2detune: 6, osc2mix: 0.9, fenv: 800, fdecay: 0.8, chorus: 0.7, room: 0.3 },
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
    params: { s: 'square', gain: 0.5, cutoff: 500, resonance: 5, attack: 1.0, decay: 1.0, sustain: 0.6, release: 2.0, s2: 'sawtooth', osc2oct: -1, osc2mix: 0.4, lfo: 0.3, lfodepth: 200, room: 0.4, roomsize: 5 },
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

  {
    id: 'sd-glass-pad', name: 'Glass Pad', category: 'pad',
    tags: ['glass', 'crystalline', 'bright', 'melodic'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.5, s2: 'triangle', osc2oct: 1, osc2mix: 0.3, attack: 0.3, decay: 0.8, sustain: 0.5, release: 2.0, cutoff: 6000, chorus: 0.5, room: 0.5, roomsize: 4, delay: 0.3, delaytime: 0.25, delayfeedback: 0.3 },
  },
  {
    id: 'sd-dreamy-pad', name: 'Dreamy Pad', category: 'pad',
    tags: ['dream', 'ambient', 'ethereal', 'soft'],
    engine: 'superdough',
    params: { s: 'triangle', gain: 0.45, s2: 'sine', osc2oct: 1, osc2mix: 0.2, unison: 3, spread: 0.3, detune: 0.1, attack: 0.8, decay: 1.0, sustain: 0.7, release: 2.5, cutoff: 3000, chorus: 0.6, room: 0.6, roomsize: 5, vibrato: 3, delay: 0.4, delaytime: 0.3, delayfeedback: 0.35 },
  },
  {
    id: 'sd-lofi-keys', name: 'Lo-Fi Keys', category: 'pad',
    tags: ['lofi', 'chill', 'warm', 'mellow'],
    engine: 'superdough',
    params: { s: 'triangle', gain: 0.5, s2: 'sine', osc2mix: 0.3, osc2detune: 4, attack: 0.01, decay: 0.6, sustain: 0.3, release: 0.8, cutoff: 800, resonance: 2, crush: 6, room: 0.4, roomsize: 3 },
  },

  // ═══════════ LEADS ═══════════
  {
    id: 'sd-supersaw', name: 'SuperSaw Lead', category: 'lead',
    tags: ['supersaw', 'trance', 'unison'],
    engine: 'superdough',
    params: { s: 'supersaw', gain: 0.7, cutoff: 4000, resonance: 2, attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.4, unison: 7, spread: 0.8, detune: 0.2, s2: 'square', osc2oct: 1, osc2mix: 0.2 },
  },
  {
    id: 'sd-prophet', name: 'Prophet Lead', category: 'lead',
    tags: ['prophet', 'analog', 'classic', 'fat'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.65, cutoff: 2500, resonance: 4, attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3, s2: 'pulse', osc2detune: 5, osc2mix: 0.7, fenv: 2000, fdecay: 0.25 },
  },
  {
    id: 'sd-screaming-saw', name: 'Screaming Saw', category: 'lead',
    tags: ['saw', 'aggressive', 'bright'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.6, cutoff: 3000, resonance: 6, attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.2, s2: 'sawtooth', osc2detune: 12, osc2mix: 0.6, distort: 0.2 },
  },
  {
    id: 'sd-square-lead', name: 'Square Lead', category: 'lead',
    tags: ['square', 'retro', 'thick'],
    engine: 'superdough',
    params: { s: 'square', gain: 0.6, cutoff: 3000, resonance: 4, attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.2, s2: 'square', osc2oct: 1, osc2mix: 0.3, delay: 0.3, delaytime: 0.15, delayfeedback: 0.3 },
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
    params: { s: 'sine', gain: 0.6, attack: 0.15, decay: 0.1, sustain: 0.9, release: 0.3, cutoff: 5000, vibrato: 8, room: 0.3 },
  },
  {
    id: 'flute', name: 'Flute', category: 'lead',
    tags: ['flute', 'woodwind', 'acoustic'],
    engine: 'webaudiofont',
    params: { instrument: '0730_FluidR3_GM', gain: 0.8 },
  },

  {
    id: 'sd-bell', name: 'Bell Synth', category: 'lead',
    tags: ['bell', 'bright', 'melodic', 'crystalline'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.55, s2: 'sine', osc2oct: 2, osc2mix: 0.25, attack: 0.001, decay: 1.2, sustain: 0, release: 1.5, cutoff: 8000, room: 0.4, roomsize: 3, delay: 0.25, delaytime: 0.2, delayfeedback: 0.25 },
  },
  {
    id: 'sd-soft-lead', name: 'Soft Lead', category: 'lead',
    tags: ['soft', 'gentle', 'warm', 'melodic'],
    engine: 'superdough',
    params: { s: 'triangle', gain: 0.55, s2: 'sine', osc2mix: 0.4, osc2detune: 3, attack: 0.05, decay: 0.3, sustain: 0.7, release: 0.4, cutoff: 3500, vibrato: 4, chorus: 0.3, room: 0.3 },
  },
  {
    id: 'sd-kalimba', name: 'Kalimba', category: 'lead',
    tags: ['kalimba', 'pluck', 'african', 'melodic'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.6, s2: 'triangle', osc2oct: 1, osc2mix: 0.15, attack: 0.001, decay: 0.8, sustain: 0, release: 0.6, cutoff: 4000, fenv: 2000, fdecay: 0.05, room: 0.35, roomsize: 2 },
  },
  {
    id: 'sd-ep-synth', name: 'EP Synth', category: 'keys',
    tags: ['ep', 'electric-piano', 'rhodes', 'warm', 'melodic'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.55, s2: 'sine', osc2oct: 1, osc2mix: 0.2, attack: 0.005, decay: 0.8, sustain: 0.35, release: 0.5, cutoff: 3000, fenv: 1500, fdecay: 0.1, tremolo: 0.15, tremoloRate: 3, chorus: 0.3, room: 0.25 },
  },
  {
    id: 'sd-music-box-synth', name: 'Music Box Synth', category: 'keys',
    tags: ['music-box', 'delicate', 'gentle', 'melodic'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.5, s2: 'sine', osc2oct: 2, osc2mix: 0.3, attack: 0.001, decay: 1.5, sustain: 0, release: 1.0, cutoff: 6000, room: 0.5, roomsize: 4, delay: 0.3, delaytime: 0.15, delayfeedback: 0.2 },
  },
  {
    id: 'sd-marimba-synth', name: 'Marimba Synth', category: 'keys',
    tags: ['marimba', 'mallet', 'wooden', 'melodic'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.6, s2: 'triangle', osc2oct: 2, osc2mix: 0.15, attack: 0.001, decay: 0.5, sustain: 0, release: 0.3, cutoff: 3000, fenv: 4000, fdecay: 0.03 },
  },
  {
    id: 'sd-fm-bell', name: 'FM Bell', category: 'lead',
    tags: ['fm', 'bell', 'digital', 'bright', 'melodic'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.5, s2: 'sine', osc2oct: 2, osc2mix: 0.5, fm: 0.8, attack: 0.001, decay: 1.5, sustain: 0, release: 1.5, cutoff: 8000, room: 0.4, roomsize: 3, delay: 0.25, delaytime: 0.2, delayfeedback: 0.25 },
  },
  {
    id: 'sd-fm-ep', name: 'FM EP', category: 'keys',
    tags: ['fm', 'electric-piano', 'dx7', 'warm', 'melodic'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.55, s2: 'sine', osc2oct: 1, osc2mix: 0.3, fm: 0.4, attack: 0.005, decay: 0.6, sustain: 0.3, release: 0.5, cutoff: 5000, tremolo: 0.12, tremoloRate: 3, chorus: 0.3, room: 0.25, roomsize: 2 },
  },
  {
    id: 'sd-fm-metallic', name: 'FM Metallic', category: 'fx',
    tags: ['fm', 'metallic', 'percussion', 'digital'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.45, s2: 'sine', osc2oct: 3, osc2mix: 0.7, fm: 0.9, attack: 0.001, decay: 0.4, sustain: 0, release: 0.3, cutoff: 6000, room: 0.3, roomsize: 2 },
  },
  {
    id: 'sd-mono-lead', name: 'Mono Lead', category: 'lead',
    tags: ['mono', 'glide', 'lead', 'analog'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.6, s2: 'square', osc2mix: 0.5, osc2detune: 5, cutoff: 3000, resonance: 5, fenv: 3000, fdecay: 0.2, attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.15, glide: 0.1 },
  },
  {
    id: 'sd-zap', name: 'Zap', category: 'lead',
    tags: ['zap', 'laser', 'short', 'pitch'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.5, penv: 24, pdecay: 0.08, fenv: 6000, fdecay: 0.1, attack: 0.001, decay: 0.2, sustain: 0, release: 0.05, distort: 0.3 },
  },

  // ═══════════ FX ═══════════
  {
    id: 'sd-pluck', name: 'Pluck', category: 'fx',
    tags: ['pluck', 'short', 'percussive'],
    engine: 'superdough',
    params: { s: 'triangle', gain: 0.7, attack: 0.001, decay: 0.4, sustain: 0, release: 0.3, cutoff: 800, resonance: 2, fenv: 5000, fdecay: 0.15, s2: 'square', osc2oct: 1, osc2mix: 0.2 },
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
    tags: ['sweep', 'riser', 'filter', 'pitch'],
    engine: 'superdough',
    params: { s: 'sawtooth', gain: 0.5, cutoff: 200, resonance: 12, attack: 2.0, decay: 0.5, sustain: 0, release: 0.5, penv: -24, pdecay: 2.0 },
  },

  {
    id: 'sd-shimmer', name: 'Shimmer', category: 'fx',
    tags: ['shimmer', 'ambient', 'bright', 'melodic'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.4, s2: 'sine', osc2oct: 2, osc2mix: 0.35, attack: 0.3, decay: 1.0, sustain: 0.4, release: 2.0, cutoff: 8000, room: 0.7, roomsize: 6, delay: 0.5, delaytime: 0.3, delayfeedback: 0.4, chorus: 0.4 },
  },
  {
    id: 'sd-water-drop', name: 'Water Drop', category: 'fx',
    tags: ['water', 'drop', 'melodic', 'ambient'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.5, attack: 0.001, decay: 0.3, sustain: 0, release: 0.5, cutoff: 5000, fenv: 6000, fdecay: 0.05, penv: 5, pdecay: 0.04, room: 0.5, roomsize: 4, delay: 0.4, delaytime: 0.18, delayfeedback: 0.35 },
  },
  {
    id: 'sd-wind-chime', name: 'Wind Chime', category: 'fx',
    tags: ['chime', 'gentle', 'bright', 'melodic'],
    engine: 'superdough',
    params: { s: 'sine', gain: 0.35, s2: 'sine', osc2oct: 2, osc2mix: 0.4, attack: 0.001, decay: 2.0, sustain: 0, release: 2.0, cutoff: 10000, noise: 0.03, room: 0.6, roomsize: 5, delay: 0.35, delaytime: 0.22, delayfeedback: 0.3 },
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
