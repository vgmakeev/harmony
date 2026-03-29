export type EngineType = 'webaudiofont' | 'superdough';
export type PresetCategory = 'bass' | 'pad' | 'keys' | 'lead' | 'fx' | 'orch';

export interface SuperDoughParams {
  s: string; // sound: sawtooth, square, triangle, sine, supersaw, pulse, white, pink
  gain: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  cutoff?: number;
  resonance?: number;
  hcutoff?: number;
  hresonance?: number;
  delay?: number;
  delaytime?: number;
  delayfeedback?: number;
  room?: number;
  roomsize?: number;
  distort?: number;
  shape?: number;
  crush?: number;
  pan?: number;
  // supersaw
  unison?: number;
  spread?: number;
  detune?: number;
  // pulse
  pw?: number;
  // vowel filter
  vowel?: string;
  // filter type
  ftype?: number;
}

export interface WebAudioFontParams {
  instrument: string;
  gain: number;
}

export interface Preset {
  id: string;
  name: string;
  category: PresetCategory;
  tags: string[];
  engine: EngineType;
  params: WebAudioFontParams | SuperDoughParams;
  meta?: UserPresetMeta;
}

export interface UserPresetMeta {
  createdAt: number;
  source: 'user' | 'ai' | 'import';
  lastUsedAt?: number;
  favorite?: boolean;
  basedOn?: string;
}
