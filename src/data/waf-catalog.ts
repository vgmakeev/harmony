import type { PresetCategory } from '../types';

export interface WafInstrumentEntry {
  gm: number;
  name: string;
  code: string;
  category: string;
}

function gmCode(gm: number): string {
  return String(gm * 10).padStart(4, '0') + '_FluidR3_GM';
}

const CATALOG: WafInstrumentEntry[] = [
  // Piano
  { gm: 0, name: 'Acoustic Grand Piano', code: gmCode(0), category: 'Piano' },
  { gm: 1, name: 'Bright Acoustic Piano', code: gmCode(1), category: 'Piano' },
  { gm: 2, name: 'Electric Grand Piano', code: gmCode(2), category: 'Piano' },
  { gm: 3, name: 'Honky-tonk Piano', code: gmCode(3), category: 'Piano' },
  { gm: 4, name: 'Electric Piano 1', code: gmCode(4), category: 'Piano' },
  { gm: 5, name: 'Electric Piano 2', code: gmCode(5), category: 'Piano' },

  // Chromatic Percussion
  { gm: 8, name: 'Celesta', code: gmCode(8), category: 'Chromatic Percussion' },
  { gm: 9, name: 'Glockenspiel', code: gmCode(9), category: 'Chromatic Percussion' },
  { gm: 10, name: 'Music Box', code: gmCode(10), category: 'Chromatic Percussion' },
  { gm: 11, name: 'Vibraphone', code: gmCode(11), category: 'Chromatic Percussion' },
  { gm: 13, name: 'Xylophone', code: gmCode(13), category: 'Chromatic Percussion' },

  // Organ
  { gm: 16, name: 'Drawbar Organ', code: gmCode(16), category: 'Organ' },
  { gm: 17, name: 'Percussive Organ', code: gmCode(17), category: 'Organ' },
  { gm: 18, name: 'Rock Organ', code: gmCode(18), category: 'Organ' },

  // Guitar
  { gm: 24, name: 'Acoustic Guitar (Nylon)', code: gmCode(24), category: 'Guitar' },
  { gm: 25, name: 'Acoustic Guitar (Steel)', code: gmCode(25), category: 'Guitar' },
  { gm: 26, name: 'Electric Guitar (Jazz)', code: gmCode(26), category: 'Guitar' },
  { gm: 27, name: 'Electric Guitar (Clean)', code: gmCode(27), category: 'Guitar' },

  // Bass
  { gm: 32, name: 'Acoustic Bass', code: gmCode(32), category: 'Bass' },
  { gm: 33, name: 'Electric Bass (Finger)', code: gmCode(33), category: 'Bass' },
  { gm: 34, name: 'Electric Bass (Pick)', code: gmCode(34), category: 'Bass' },
  { gm: 36, name: 'Slap Bass 1', code: gmCode(36), category: 'Bass' },

  // Strings
  { gm: 40, name: 'Violin', code: gmCode(40), category: 'Strings' },
  { gm: 41, name: 'Viola', code: gmCode(41), category: 'Strings' },
  { gm: 42, name: 'Cello', code: gmCode(42), category: 'Strings' },
  { gm: 43, name: 'Contrabass', code: gmCode(43), category: 'Strings' },

  // Ensemble
  { gm: 48, name: 'String Ensemble 1', code: gmCode(48), category: 'Ensemble' },
  { gm: 49, name: 'String Ensemble 2', code: gmCode(49), category: 'Ensemble' },
  { gm: 52, name: 'Choir Aahs', code: gmCode(52), category: 'Ensemble' },

  // Brass
  { gm: 56, name: 'Trumpet', code: gmCode(56), category: 'Brass' },
  { gm: 57, name: 'Trombone', code: gmCode(57), category: 'Brass' },
  { gm: 58, name: 'Tuba', code: gmCode(58), category: 'Brass' },
  { gm: 60, name: 'French Horn', code: gmCode(60), category: 'Brass' },

  // Reed
  { gm: 64, name: 'Soprano Sax', code: gmCode(64), category: 'Reed' },
  { gm: 65, name: 'Alto Sax', code: gmCode(65), category: 'Reed' },
  { gm: 66, name: 'Tenor Sax', code: gmCode(66), category: 'Reed' },
  { gm: 68, name: 'Oboe', code: gmCode(68), category: 'Reed' },
  { gm: 69, name: 'English Horn', code: gmCode(69), category: 'Reed' },
  { gm: 70, name: 'Bassoon', code: gmCode(70), category: 'Reed' },
  { gm: 71, name: 'Clarinet', code: gmCode(71), category: 'Reed' },

  // Pipe
  { gm: 73, name: 'Flute', code: gmCode(73), category: 'Pipe' },
  { gm: 74, name: 'Recorder', code: gmCode(74), category: 'Pipe' },
  { gm: 75, name: 'Pan Flute', code: gmCode(75), category: 'Pipe' },

  // Synth Lead
  { gm: 80, name: 'Square Lead', code: gmCode(80), category: 'Synth Lead' },
  { gm: 81, name: 'Sawtooth Lead', code: gmCode(81), category: 'Synth Lead' },
  { gm: 82, name: 'Calliope Lead', code: gmCode(82), category: 'Synth Lead' },
  { gm: 83, name: 'Chiff Lead', code: gmCode(83), category: 'Synth Lead' },

  // Synth Pad
  { gm: 88, name: 'New Age Pad', code: gmCode(88), category: 'Synth Pad' },
  { gm: 89, name: 'Warm Pad', code: gmCode(89), category: 'Synth Pad' },
  { gm: 90, name: 'Polysynth Pad', code: gmCode(90), category: 'Synth Pad' },
  { gm: 91, name: 'Choir Pad', code: gmCode(91), category: 'Synth Pad' },

  // FX
  { gm: 96, name: 'Rain', code: gmCode(96), category: 'FX' },
  { gm: 97, name: 'Soundtrack', code: gmCode(97), category: 'FX' },
  { gm: 98, name: 'Crystal', code: gmCode(98), category: 'FX' },

  // Ethnic
  { gm: 104, name: 'Sitar', code: gmCode(104), category: 'Ethnic' },
  { gm: 105, name: 'Banjo', code: gmCode(105), category: 'Ethnic' },
  { gm: 106, name: 'Shamisen', code: gmCode(106), category: 'Ethnic' },

  // Percussive
  { gm: 114, name: 'Steel Drums', code: gmCode(114), category: 'Percussive' },
  { gm: 115, name: 'Woodblock', code: gmCode(115), category: 'Percussive' },
];

export const WAF_CATEGORY_MAP: Record<string, PresetCategory> = {
  'Piano': 'keys',
  'Chromatic Percussion': 'keys',
  'Organ': 'keys',
  'Guitar': 'orch',
  'Bass': 'bass',
  'Strings': 'orch',
  'Ensemble': 'pad',
  'Brass': 'orch',
  'Reed': 'orch',
  'Pipe': 'lead',
  'Synth Lead': 'lead',
  'Synth Pad': 'pad',
  'FX': 'fx',
  'Ethnic': 'orch',
  'Percussive': 'fx',
};

export function getWafCatalog(): WafInstrumentEntry[] {
  return CATALOG;
}

export function getWafCategories(): string[] {
  const cats = new Set(CATALOG.map(e => e.category));
  return [...cats];
}

export function findWafInstrument(code: string): WafInstrumentEntry | undefined {
  return CATALOG.find(e => e.code === code);
}

export function searchWafCatalog(query: string, category?: string): WafInstrumentEntry[] {
  let results = category ? CATALOG.filter(e => e.category === category) : CATALOG;
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(e => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
  }
  return results;
}
