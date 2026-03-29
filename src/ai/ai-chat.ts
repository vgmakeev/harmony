import { getState, setHarmonizer, setPreset, setArp, setBpm } from '../core/state';
import { strudelEval, strudelStop, getStrudelCode, isStrudelPlaying } from '../strudel/strudel-engine';
import { getAllPresets } from '../data/presets';
import { getWafCatalog, findWafInstrument, WAF_CATEGORY_MAP } from '../data/waf-catalog';
import type { Preset, WebAudioFontParams } from '../types';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string; // base64 data URL
}

interface AiAction {
  type: string;
  [key: string]: unknown;
}

interface AiResponse {
  message: string;
  actions?: AiAction[];
}

let apiKey = localStorage.getItem('harmonia_gemini_key') ?? '';
const history: ChatMessage[] = [];

export function setGeminiKey(key: string): void {
  apiKey = key;
  localStorage.setItem('harmonia_gemini_key', key);
}

export function getGeminiKey(): string {
  return apiKey;
}

function buildSystemPrompt(): string {
  const state = getState();
  const preset = state.currentPreset;
  const presetList = getAllPresets().map(p => `${p.id} (${p.name}, ${p.category}, ${p.engine})`).join(', ');

  // Build WAF catalog string grouped by category
  const catalogByCategory = new Map<string, string[]>();
  for (const entry of getWafCatalog()) {
    const list = catalogByCategory.get(entry.category) ?? [];
    list.push(`${entry.name} (${entry.code})`);
    catalogByCategory.set(entry.category, list);
  }
  const wafCatalogStr = [...catalogByCategory.entries()]
    .map(([cat, instruments]) => `  ${cat}: ${instruments.join(', ')}`)
    .join('\n');

  // Show params for all engines
  let paramsLine = '';
  if (preset) {
    if (preset.engine === 'webaudiofont') {
      const wp = preset.params as unknown as WebAudioFontParams;
      paramsLine = `- WAF Instrument: ${wp.instrument}, Gain: ${wp.gain}`;
    } else {
      paramsLine = `- Params: ${JSON.stringify(preset.params)}`;
    }
  }

  return `You are Harmonia AI — the brain of a browser music workstation. You CONTROL the synthesizer through the "actions" array in your JSON response. If the user asks to change a sound, create a preset, play a pattern, or tweak any setting, you MUST include the corresponding actions. Never just describe what you would do — actually do it via actions.

CRITICAL: You MUST ALWAYS respond with a JSON object in this exact format:
{"message": "your text response here", "actions": [{"type": "actionType", ...}]}
If no actions needed, use empty array: {"actions": []}
Do NOT wrap the JSON in markdown code blocks. Do NOT include any text before or after the JSON object.

You have access to Google Search. Use it when the user mentions a specific song, artist, or track to find relevant info (BPM, key, instruments, vibe) and then recreate that sound/vibe using the synth engine.

CURRENT APP STATE:
- Harmonizer: ${state.harmonizer.enabled ? 'ON' : 'OFF'}, Key: ${state.harmonizer.key}, Scale: ${state.harmonizer.scale}, Fifths: ${state.harmonizer.fifths ? 'ON' : 'OFF'}, Voicing: ${state.harmonizer.voicingMode}
- BPM: ${state.bpm}
- Preset: ${preset ? `${preset.name} (${preset.engine}, ${preset.category})` : 'none'}
${paramsLine}
- Arpeggiator: ${state.arp.enabled ? 'ON' : 'OFF'}, Pattern: ${state.arp.pattern}, Div: 1/${state.arp.subdivision * 4}, Gate: ${state.arp.gate}
- Strudel: ${isStrudelPlaying() ? 'PLAYING' : 'stopped'}${getStrudelCode() ? `, Code: ${getStrudelCode()}` : ''}

AVAILABLE PRESETS: ${presetList}

═══ ACTION TYPES ═══

We have 2 engines:
- "superdough" — versatile synth engine with supersaw, pulse, vowel, bitcrush, delay, reverb. Best for: all electronic/synthetic sounds (leads, basses, pads, FX, noise percussion).
- "webaudiofont" — sample-based GM instruments. Best for: realistic acoustic sounds (piano, guitar, brass, strings, woodwinds, orchestral).

1) "preset" — create a SuperDough preset (engine: superdough):
   {"type":"preset","engine":"superdough","name":"Trance Saw","category":"lead","params":{"s":"supersaw","gain":0.7,"cutoff":4000,"resonance":2,"attack":0.01,"decay":0.3,"sustain":0.6,"release":0.4,"unison":7,"spread":0.8,"detune":0.2}}
   s: sawtooth|square|triangle|sine|supersaw|pulse|white|pink
   gain, attack, decay, sustain, release, cutoff, resonance, hcutoff, hresonance
   SuperSaw ONLY: unison (1-16), spread (0-1), detune (0-1). These params have no effect on other sound sources.
   Pulse ONLY: pw (0-1)
   FX: distort (0-1), crush (0-16), delay (0-1), delaytime, delayfeedback, room (0-1), roomsize (0-10), pan (0-1)
   Special: vowel (a|e|i|o|u) — works best with sawtooth/square

   SuperDough tips:
     Trance supersaw: s=supersaw, unison=7, spread=0.8, detune=0.2, cutoff=4000
     Vowel pad: s=sawtooth, vowel='o', room=0.5, attack=0.5
     Acid bass: s=sawtooth, cutoff=500, resonance=20, distort=0.5
     Acid pulse: s=pulse, pw=0.3, cutoff=500, resonance=20, distort=0.5
     Noise perc: s=white, cutoff=5000, decay=0.08, sustain=0
     Sub bass: s=sine, cutoff=2000, gain=0.9
     Reese bass: s=supersaw, unison=3, spread=0.5, detune=0.4, cutoff=300

2) "modifyPreset" — modify the current preset's params (partial update, merged with current):
   {"type":"modifyPreset","params":{"cutoff":600,"resonance":18,"distortion":0.5}}
   Only include params you want to change. Engine, name, and category stay the same.
   Use this when user says "make it brighter/darker/fatter/etc." or asks to tweak specific parameters.

3) "switchPreset" — switch to an existing preset by ID:
   {"type":"switchPreset","id":"acid-303"}
   Use when user's request closely matches an existing preset name. Prefer over creating new preset when possible.

4) "wafInstrument" — switch to a GM sample instrument from the catalog below:
   {"type":"wafInstrument","code":"0560_FluidR3_GM","name":"Trumpet","gain":0.8}
   code: the WAF instrument code from the WAF CATALOG below
   name: human-readable instrument name
   gain: volume 0-1 (default 0.8)
   Use this when the user asks for realistic/acoustic instrument sounds (piano, guitar, brass, strings, woodwinds, etc.)
   NOTE: WAF instruments only support gain adjustment. No filter, delay, reverb, or distortion. For FX processing, use Strudel patterns instead.

5) "strudel" — play a Strudel live-coding pattern. Strudel is a powerful cyclic pattern language (JS port of Tidal Cycles). Code is evaluated by its REPL.
   IMPORTANT: Use SINGLE QUOTES inside the code string to avoid JSON escaping issues.
   {"type":"strudel","code":"note('c2 [~ c2] eb2 [~ g1]').sound('sawtooth').lpf(600)"}

   ═══ MINI-NOTATION ═══
   Spaces = events per cycle: 'c3 e3 g3' (3 notes/cycle)
   [brackets] = subdivide: 'c3 [e3 g3]' (c3=half, e3+g3 share other half)
   <angles> = alternate cycles: '<c3 e3 g3>' (one per cycle)
   ~ = rest: 'c3 ~ e3 ~'
   * = repeat: 'c3*4'
   / = slow: 'c3/2' (every 2 cycles)
   , = stack (polyphony): 'c3 e3, g3 b3' (two parallel layers)
   (k,n) = euclidean: 'c3(3,8)' (3 hits over 8 steps)
   @ = elongate: 'c3@3 e3' (c3 takes 3/4, e3 takes 1/4)
   ! = replicate: 'c3!3 e3' (c3 c3 c3 e3)
   ? = random: 'c3? e3' (c3 plays 50% of the time)

   ═══ SOUND SOURCES ═══
   Synths: sawtooth, square, triangle, sine, supersaw, pulse
   Noise: white, pink, brown, crackle
   Synth kick: sbd — analog kick with .decay(s) .pdecay(s) .penv(semitones)
   ZZFX (retro/game): zzfx, z_sine, z_sawtooth, z_triangle, z_square, z_tan, z_noise
     ZZFX params: .zrand() .slide() .deltaSlide() .pitchJump() .pitchJumpTime() .lfo() .znoise() .zmod() .zcrush() .zdelay() .tremolo()

   ═══ DIRT-SAMPLES (all loaded, 100+ banks) ═══
   Drums: bd bd:0-24, sd sd:0-12, hh hh:0-12, oh, cp, rim, rs, mt, ht, lt, cb, cr, ride
   Classic machines: 808 808bd 808cy 808hc 808ht 808lc 808lt 808mc 808mt 808oh 808sd, 909
   Breakbeats: breaks125, breaks152, breaks157, breaks165
   Bass: bass bass0 bass1 bass2 bass3 bassdm bassfoo jvbass jungbass
   Melodic: arpy, pluck, gtr, sax, flick, future, newnotes, notes, pad, padlong
   Electronic: rave rave2 ravemono, electro1, hoover, stab, industrial, techno
   World/ethnic: tabla tabla2 tablex, sitar, chin, east, koy, world, sundance
   Percussion: hand, drum, drumtraks, dr dr2 dr55 dr_few, perc, metal, click, co
   Vocals/speech: speech, speechless, mouth, alphabet, diphone, diphone2
   Noise/FX: noise noise2, glitch glitch2, fire, wind, birds birds3, insect, bubble
   Retro/game: casio, gameboy, sid, moog, sequential, psr, monome
   Misc: circus, space, toys, trump, wobble, xmas, yeah, foo, auto, cosmicg
   Sample variants: s('bd:0')..s('bd:24'), s('arpy:0')..s('arpy:8')
   Sample banks: .bank('RolandTR808'), .bank('RolandTR909')

   ═══ PATTERN CONSTRUCTORS ═══
   note('c3 e3') — melodic pattern (c..b, sharps: cs ds, flats: ef bf, octaves: 1-7)
   s('bd sd') or sound('bd sd') — sample/synth pattern
   stack(pat1, pat2) — play simultaneously (layering)
   cat(pat1, pat2) — play sequentially (1 cycle each)
   seq(pat1, pat2) — sequential but crammed into 1 cycle
   arrange([8, verse], [4, chorus], [4, bridge]) — SONG STRUCTURE: each section plays for N cycles

   ═══ SONG STRUCTURE with arrange() ═══
   Use JavaScript variables to define sections, then arrange() to build a song:
   let verse = stack(s('bd ~ bd ~'), note('c2 eb2').sound('sawtooth').lpf(600))
   let chorus = stack(s('bd*4'), note('<[c3,e3,g3] [f3,a3,c4]>').sound('triangle'))
   let bridge = note('a3 g3 f3 e3').sound('sine').room(0.5).slow(2)
   arrange([8, verse], [4, chorus], [8, verse], [4, chorus], [4, bridge], [4, chorus])
   This plays: 8 cycles verse → 4 cycles chorus → 8 verse → 4 chorus → 4 bridge → 4 chorus.
   ALWAYS use arrange() when the user asks for a full song, verse-chorus, or multi-section structure.

   ═══ EFFECTS ═══
   Filters: .lpf(freq) .hpf(freq) .bpf(freq, bandq) .resonance(q) .vowel('a'|'e'|'i'|'o'|'u')
   Envelope: .attack(s) .decay(s) .sustain(0-1) .release(s)
   Gain: .gain(0-1) .velocity(0-1)
   Delay: .delay(0-1) .delaytime(s) .delayfeedback(0-0.95)
   Reverb: .room(0-1) .roomsize(0-10)
   Distortion: .distort(0-10) .crush(1-16) .coarse(1+)
   Phaser: .phaser(depth) .phaserdepth(d) .phasersweep(s) .phasercenter(hz)
   Stereo: .pan(0-1) .jux(fn) — applies fn to right channel only
   Pitch: .penv(semitones) .pdecay(s) — pitch envelope for kicks/percussion
   FM synthesis: .fm(amount) — frequency modulation for rich harmonic content
   Vibrato: .vibrato(depth) — oscillating pitch variation
   Noise mix: .noise(0-1) — mix pink noise into oscillator

   ═══ TIME & PATTERN MODIFIERS ═══
   .fast(n) / .slow(n) — speed/slow by factor
   .rev() — reverse pattern
   .early(cycles) / .late(cycles) — shift in time
   .every(n, fn) — apply fn every n cycles: .every(4, x => x.rev())
   .euclid(k, n) — euclidean rhythm
   .ply(n) — repeat each event n times
   .chop(n) — slice sample into n parts
   .loopAt(n) — stretch sample to n cycles
   .slice(n, pattern) — chop + reorder slices
   .fit() — fit sample to event duration
   .speed(n) — playback speed (negative = reverse)
   .begin(0-1) / .end(0-1) — play portion of sample
   .iter(n) — rotate pattern each cycle
   .palindrome() — reverse every other cycle
   .struct('pattern') — apply rhythmic structure
   .scale('C:minor') — quantize to scale

   ═══ JAVASCRIPT ═══
   You can use let/const for variables, register() for reusable chains:
   let bass = note('c2 eb2 g1 c2').sound('sawtooth').lpf(600)
   register('fatSaw', (pat) => pat.sound('supersaw').lpf(4000).room(0.2))
   note('c3 e3 g3').fatSaw()

   ═══ EXAMPLES ═══
   Drums: stack(s('bd bd ~ bd'), s('~ sd ~ sd'), s('hh*8').gain(0.4))
   Bass: note('c2 [~ c2] eb2 [~ g1]').sound('sawtooth').lpf(600).resonance(10).release(0.1)
   Chords: note('<[c3,e3,g3] [f3,a3,c4] [g3,b3,d4]>').sound('triangle').release(0.5).lpf(1500)
   Arp: note('c3 e3 g3 b3 g3 e3').fast(2).sound('sine').lpf(3000).delay(0.3).delaytime(0.15)
   Breakbeat: s('breaks125').loopAt(4).chop(16).every(4, x => x.rev())
   808 beat: stack(s('bd:3 ~ ~ bd:3 ~ ~ bd:3 ~'), s('~ ~ ~ ~ sd:3 ~ ~ ~'), s('hh*8').gain(0.35))
   Full song: let v = stack(...); let ch = stack(...); arrange([8,v],[4,ch],[8,v],[4,ch])

   ═══ RULES ═══
   - SINGLE QUOTES for all strings inside code (JSON-safe)
   - note() and s() are top-level constructors, use .note()/.sound() as methods
   - Use stack() for layering, arrange() for song structure
   - Use let for variables when building complex multi-section patterns
   - Patterns auto-loop; arrange() loops the entire arrangement

6) "strudelStop" — stop Strudel: {"type":"strudelStop"}

7) "harmonizer" — change harmonizer settings (all fields optional):
   {"type":"harmonizer","key":"D","scale":"minor","fifths":true,"enabled":true,"voicingMode":"voiceLead"}
   scale: major|minor|dorian|mixolydian|phrygian|lydian|locrian|harmonicMinor|melodicMinor|pentatonic|blues|chromatic
   voicingMode: "root" (always root position) or "voiceLead" (smooth voice leading)
   fifths: when true, plays power chords (root+fifth only, no third)

8) "arp" — control arpeggiator (all fields optional):
   {"type":"arp","enabled":true,"pattern":"up","subdivision":2,"gate":0.6,"octaves":2}
   pattern: chord (block)|up|down|upDown|downUp|random|alberti (classical broken chord)|gallop (da-da-dum)|tremolo (fast repeat)|broken (1-3-2-4)|triplet|swing (dotted feel)|rootFifth (R-5-R-5)|rootOctave (R-8-R-8)|bassLine (R-5-8-5 walk)|funk (syncopated)|reggae (offbeat)|disco (pumping 8ths)|tumbao (Latin anticipation)|pedal (drone root)|bounce (R-R-5-5-8-8)|euclidean
   subdivision: 1=1/4, 2=1/8, 3=triplet, 4=1/16
   gate: note length 0-1 (0.5=staccato, 1.0=legato)
   octaves: 1-4, how many octaves to span

9) "bpm" — change tempo: {"type":"bpm","value":140} (range: 40-240)

WAF INSTRUMENT CATALOG (use with "wafInstrument" action):
${wafCatalogStr}

═══ ENGINE SELECTION GUIDE ═══
When the user asks to create or find a sound, ALWAYS pick the best engine for the job:

CHOOSE "webaudiofont" (wafInstrument action) when:
  - User asks for ANY real/acoustic instrument: piano, guitar, bass guitar, violin, cello, strings, trumpet, sax, flute, clarinet, organ, drums, percussion, harp, accordion, etc.
  - User mentions a genre that relies on real instruments: jazz, classical, orchestral, bossa nova, blues, country, folk, soul, R&B
  - User says "realistic", "acoustic", "natural", "orchestral", "GM", "General MIDI"
  - User names a specific instrument that exists in the WAF catalog

CHOOSE "superdough" (preset action) when:
  - User asks for ANY electronic/synthetic sound: leads, basses, pads, plucks, noise, FX
  - Keywords: "supersaw", "unison", "detuned", "trance", "acid", "vowel", "crushed", "bitcrush", "synth", "electronic", "bass", "pad", "lead"
  - This is the DEFAULT engine for all non-acoustic sounds

If unsure, consider:
  1. Does a WAF instrument match the request (real instrument)? → use wafInstrument
  2. Everything else → use superdough preset

═══ RULES ═══
- ALWAYS include actions when the user asks to create, change, or play anything. This is your primary function.
- Combine multiple actions when needed (e.g., preset + arp + bpm for a complete vibe).
- "message" field: briefly explain what you did and which engine you chose and why (1 sentence). Keep it concise.
- Be creative and expert in sound design, music theory, synthesis.
- WAF instruments work perfectly with the harmonizer and arpeggiator — combine them!
- When user mentions a song/artist, use your search knowledge to match the vibe: find the BPM, key, and characteristic sounds, then recreate them. Pick the engine that best matches the original instruments.
- TO MODIFY CURRENT SOUND: Use "modifyPreset" action with only the params you want to change. It merges with the current preset. Do NOT recreate the entire preset.
- TO CREATE A NEW SOUND: Use "preset" action with a full set of params.
- If user's request closely matches an existing preset, prefer "switchPreset". If they want custom tweaks, create a new "preset".
- After creating a preset, briefly suggest 2-3 possible modifications (e.g., "Try asking me to make it brighter, add more reverb, or change to a different waveform").
- Common modifier mappings: "brighter"→increase cutoff, "darker"→decrease cutoff, "more space"→increase reverb/delay, "fatter"→more voices/detune, "softer"→lower gain/cutoff, "aggressive"→increase distortion/resonance.
- Respond in the same language as the user's message.`;
}

function parseAiResponse(text: string): AiResponse {
  // 1. Try direct JSON parse
  try {
    const parsed = JSON.parse(text);
    if (parsed.message !== undefined || parsed.actions !== undefined) {
      return { message: parsed.message ?? '', actions: parsed.actions ?? [] };
    }
    // Might be valid JSON but wrong keys
    const msg = parsed.text ?? parsed.response ?? parsed.answer ?? '';
    const acts = parsed.actions ?? parsed.tool_calls ?? parsed.steps ?? [];
    if (msg || acts.length) return { message: msg, actions: acts };
  } catch { /* not direct JSON */ }

  // 2. Try to extract JSON from markdown code block: ```json ... ``` or ``` ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      return { message: parsed.message ?? '', actions: parsed.actions ?? [] };
    } catch { /* not valid JSON in code block */ }
  }

  // 3. Try to find a JSON object in the text (first { to last })
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
      return { message: parsed.message ?? '', actions: parsed.actions ?? [] };
    } catch { /* not valid JSON substring */ }
  }

  // 4. Fallback: treat entire text as message, no actions
  return { message: text, actions: [] };
}

interface GeminiContent {
  role: string;
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
}

async function callGemini(messages: ChatMessage[]): Promise<AiResponse> {
  if (!apiKey) throw new Error('Gemini API key not set');

  const contents: GeminiContent[] = [];
  const systemPrompt = buildSystemPrompt();

  for (const msg of messages) {
    const parts: GeminiContent['parts'] = [];
    if (msg.text) parts.push({ text: msg.text });
    if (msg.image) {
      const [header, data] = msg.image.split(',');
      const mimeType = header.match(/data:(.*);/)?.[1] ?? 'image/png';
      parts.push({ inlineData: { mimeType, data } });
    }
    contents.push({ role: msg.role === 'model' ? 'model' : 'user', parts });
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 65536,
      thinkingConfig: {
        thinkingBudget: 8192,
      },
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  // With thinking enabled, response has multiple parts: thought parts + actual response.
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  // Collect all non-thought text parts
  const textParts = parts
    .filter((p: Record<string, unknown>) => !p.thought && p.text)
    .map((p: Record<string, unknown>) => p.text as string);
  // Fallback: if no non-thought parts, use last part
  if (textParts.length === 0) {
    const last = parts[parts.length - 1];
    if (last?.text) textParts.push(last.text as string);
  }
  const fullText = textParts.join('\n');
  if (!fullText) throw new Error('Empty response from Gemini');

  // Try to extract JSON from the response (model may wrap in markdown code blocks)
  return parseAiResponse(fullText);
}

async function executeAction(action: AiAction): Promise<string> {
  switch (action.type) {
    case 'preset': {
      const engine = 'superdough' as const;

      // Gemini may send params as nested object or flat on the action — normalize both
      let rawParams = action.params as Record<string, unknown> | undefined;
      if (!rawParams || typeof rawParams !== 'object') {
        // Extract params from flat action, excluding meta fields
        const { type: _, engine: _e, name: _n, category: _c, ...rest } = action;
        rawParams = rest as Record<string, unknown>;
      }

      // Ensure required SuperDough defaults
      const defaults: Record<string, unknown> = { s: 'sawtooth', gain: 0.7 };
      rawParams = { ...defaults, ...rawParams };

      const preset: Preset = {
        id: `ai-${Date.now()}`,
        name: (action.name as string) ?? 'AI Preset',
        category: (action.category as Preset['category']) ?? 'lead',
        tags: ['ai-generated'],
        engine,
        params: rawParams as unknown as Preset['params'],
      };
      setPreset(preset);
      return `Preset applied: ${preset.name} (${engine})`;
    }

    case 'modifyPreset': {
      const current = getState().currentPreset;
      if (!current) return 'No active preset to modify';
      let changes = action.params as Record<string, unknown> | undefined;
      if (!changes || typeof changes !== 'object') {
        const { type: _, ...rest } = action;
        changes = rest as Record<string, unknown>;
      }
      const mergedParams = {
        ...(current.params as unknown as Record<string, unknown>),
        ...changes,
      };
      setPreset({
        ...current,
        params: mergedParams as unknown as Preset['params'],
      });
      const changedKeys = Object.keys(changes).join(', ');
      return `Modified: ${changedKeys}`;
    }

    case 'switchPreset': {
      const id = action.id as string;
      const found = getAllPresets().find(p => p.id === id);
      if (!found) return `Preset not found: ${id}`;
      setPreset(found);
      return `Switched to: ${found.name}`;
    }

    case 'wafInstrument': {
      const code = action.code as string;
      const name = (action.name as string) ?? 'WAF Instrument';
      const gain = (action.gain as number) ?? 0.8;
      const entry = findWafInstrument(code);
      const category = WAF_CATEGORY_MAP[entry?.category ?? ''] ?? 'orch';
      const wafPreset: Preset = {
        id: `waf-ai-${Date.now()}`,
        name,
        category,
        tags: ['ai-generated', 'webaudiofont'],
        engine: 'webaudiofont',
        params: { instrument: code, gain },
      };
      setPreset(wafPreset);
      return `WAF instrument: ${name}`;
    }

    case 'strudel': {
      const code = action.code as string;
      await strudelEval(code);
      return `Strudel playing`;
    }

    case 'strudelStop': {
      strudelStop();
      return 'Strudel stopped';
    }

    case 'harmonizer': {
      const config: Record<string, unknown> = {};
      if (action.key) config.key = action.key;
      if (action.scale) config.scale = action.scale;
      if (action.fifths !== undefined) config.fifths = action.fifths;
      if (action.enabled !== undefined) config.enabled = action.enabled;
      if (action.voicingMode) config.voicingMode = action.voicingMode;
      setHarmonizer(config as Parameters<typeof setHarmonizer>[0]);
      return `Harmonizer updated`;
    }

    case 'arp': {
      const config: Record<string, unknown> = {};
      if (action.enabled !== undefined) config.enabled = action.enabled;
      if (action.pattern) config.pattern = action.pattern;
      if (action.subdivision) config.subdivision = action.subdivision;
      if (action.gate) config.gate = action.gate;
      if (action.octaves) config.octaves = action.octaves;
      if (action.euclideanOnsets) config.euclideanOnsets = action.euclideanOnsets;
      if (action.euclideanSteps) config.euclideanSteps = action.euclideanSteps;
      setArp(config as Parameters<typeof setArp>[0]);
      return `Arpeggiator updated`;
    }

    case 'bpm': {
      const bpmVal = Number(action.value);
      if (!isNaN(bpmVal)) setBpm(bpmVal);
      return `BPM: ${bpmVal}`;
    }

    default:
      return `Unknown action: ${action.type}`;
  }
}

export async function chat(text: string, image?: string): Promise<string> {
  const userMsg: ChatMessage = { role: 'user', text, image };
  history.push(userMsg);

  const response = await callGemini(history);

  // Store raw JSON in history so model sees its own structured responses
  const modelMsg: ChatMessage = { role: 'model', text: JSON.stringify(response) };
  history.push(modelMsg);

  // Execute actions
  const results: string[] = [];
  if (response.actions && response.actions.length > 0) {
    for (const action of response.actions) {
      try {
        const result = await executeAction(action);
        results.push(result);
      } catch (e) {
        results.push(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  let displayText = response.message;
  if (results.length > 0) {
    displayText += '\n' + results.map(r => `> ${r}`).join('\n');
  }
  return displayText;
}

export function getChatHistory(): readonly ChatMessage[] {
  return history;
}

export function clearChatHistory(): void {
  history.length = 0;
}
