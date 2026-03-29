export type EngineType = 'webaudiofont' | 'superdough';
export type PresetCategory = 'bass' | 'pad' | 'keys' | 'lead' | 'fx' | 'orch';

export interface SuperDoughParams {
  s: string; // OSC A: sawtooth, square, triangle, sine, supersaw, pulse, white, pink
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
  fuzz?: number;        // hard-clipping fuzz 0-1 (Big Muff style)
  shape?: number;
  crush?: number;
  pan?: number;
  // supersaw (OSC A only)
  unison?: number;
  spread?: number;
  detune?: number;
  // pulse
  pw?: number;
  // vowel filter
  vowel?: string;
  // filter type
  ftype?: number;
  // OSC B (second oscillator)
  s2?: string;          // waveform: sawtooth, square, triangle, sine, pulse
  osc2oct?: number;     // octave offset: -2, -1, 0, 1, 2
  osc2detune?: number;  // detune in cents: -100 to 100
  osc2mix?: number;     // volume 0-1
  // Sub oscillator (sine, -1 octave)
  sub?: number;         // level 0-1
  // Filter envelope
  fenv?: number;        // depth in Hz (added to cutoff, decays to cutoff)
  fdecay?: number;      // filter envelope decay time in seconds
  // LFO → filter cutoff
  lfo?: number;         // LFO rate in Hz
  lfodepth?: number;    // LFO modulation depth in Hz
  // Modulation
  vibrato?: number;       // vibrato depth in cents (0-50)
  vibratoRate?: number;   // vibrato rate in Hz (default 5)
  tremolo?: number;       // tremolo depth 0-1
  tremoloRate?: number;   // tremolo rate in Hz (default 4)
  // Chorus
  chorus?: number;        // chorus depth 0-1
  chorusRate?: number;    // chorus LFO rate in Hz (default 1.5)
  // Noise layer
  noise?: number;         // white noise mix level 0-1
  // Pitch envelope
  penv?: number;          // pitch envelope depth in semitones (-48 to +48)
  pdecay?: number;        // pitch envelope decay in seconds
  // Portamento
  glide?: number;         // glide/portamento time in seconds (0 = instant)
  // FM synthesis
  fm?: number;            // FM mode 0-1 (>0: OSC B modulates OSC A frequency instead of mixing)
  // Wavefolder
  wavefold?: number;      // wavefolder distortion 0-1 (sinusoidal wave folding)
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
