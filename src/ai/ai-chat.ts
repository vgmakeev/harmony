import { getState, setHarmonizer, setPreset, setArp, setBpm } from '../core/state';
import { strudelEval, strudelStop } from '../strudel/strudel-engine';
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

type ThinkingLevel = 'low' | 'medium' | 'high';
let thinkingLevel: ThinkingLevel = (localStorage.getItem('harmonia_thinking_level') as ThinkingLevel) ?? 'medium';

export function setThinkingLevel(level: ThinkingLevel): void {
  thinkingLevel = level;
  localStorage.setItem('harmonia_thinking_level', level);
}

export function getThinkingLevel(): ThinkingLevel {
  return thinkingLevel;
}

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

You have access to Google Search. Use it when the user mentions a specific song, artist, or track to find relevant info (BPM, key, instruments, vibe) and then recreate that sound/vibe using the synth engine.

CURRENT APP STATE:
- Key: ${state.harmonizer.key}, Scale: ${state.harmonizer.scale}, Fifths: ${state.harmonizer.fifths ? 'ON' : 'OFF'}
- Voicing: ${state.harmonizer.voicingMode}
- BPM: ${state.bpm}
- Preset: ${preset ? `${preset.name} (${preset.engine}, ${preset.category})` : 'none'}
- Arpeggiator: ${state.arp.enabled ? 'ON' : 'OFF'}, Pattern: ${state.arp.pattern}, Div: 1/${state.arp.subdivision * 4}, Gate: ${state.arp.gate}
${paramsLine}

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

5) "strudel" — play a Strudel live-coding pattern. The code is evaluated by Strudel's REPL which uses Tidal/mini-notation. IMPORTANT: Use SINGLE QUOTES inside the code string to avoid JSON escaping issues.
   {"type":"strudel","code":"note('c2 [~ c2] eb2 [~ g1]').sound('sawtooth').lpf(600)"}

   STRUDEL MINI-NOTATION SYNTAX:
   - Spaces separate events in a cycle: "c3 e3 g3" = 3 notes per cycle
   - [brackets] group into one step: "c3 [e3 g3]" = c3 takes half, e3+g3 share the other half
   - <angles> alternate each cycle: "<c3 e3 g3>" = c3 first cycle, e3 second, g3 third
   - ~ is a rest/silence: "c3 ~ e3 ~" = note, rest, note, rest
   - * repeats: "c3*4" = c3 four times
   - / slows: "c3/2" = c3 every 2 cycles
   - , stacks (polyphony): "c3 e3, g3 b3" = two layers playing simultaneously
   - (k,n) euclidean rhythm: "c3(3,8)" = 3 hits distributed over 8 steps

   AVAILABLE FUNCTIONS:
   - note('c3 e3 g3') — play notes (note names: c, d, e, f, g, a, b; sharps: cs, ds; flats: ef, bf; octaves: 1-7)
   - s('bd sd hh') — play samples by name (bd=kick, sd=snare, hh=hihat, cp=clap, oh=open hat)
   - sound('sawtooth') — set synth oscillator type
   - .note('pattern') — set note pattern
   - .s('name') — set sample/sound source

   CHAINABLE METHODS:
   - .lpf(freq) — lowpass filter (20-20000 Hz)
   - .hpf(freq) — highpass filter
   - .resonance(q) — filter resonance (0-30)
   - .gain(vol) — volume (0-1)
   - .attack(s) — attack time
   - .decay(s) — decay time
   - .sustain(level) — sustain level (0-1)
   - .release(s) — release time
   - .delay(amount) — delay send (0-1)
   - .delaytime(s) — delay time in seconds
   - .delayfeedback(amount) — delay feedback (0-0.95)
   - .room(amount) — reverb send (0-1)
   - .pan(pos) — stereo position (0=left, 0.5=center, 1=right)
   - .fast(n) — speed up by factor n
   - .slow(n) — slow down by factor n
   - .rev() — reverse the pattern
   - .every(n, fn) — apply fn every n cycles
   - .struct('pattern') — apply rhythmic structure
   - .euclid(k, n) — euclidean rhythm
   - .scale('C:minor') — quantize to scale

   WORKING EXAMPLES (use these as reference):
   - Bass: note('c2 [~ c2] eb2 [~ g1]').sound('sawtooth').lpf(600).resonance(10).release(0.1)
   - Chords: note('<[c3,e3,g3] [f3,a3,c4] [g3,b3,d4]>').sound('triangle').release(0.5).lpf(1500)
   - Arp: note('c3 e3 g3 b3 g3 e3').fast(2).sound('sine').lpf(3000).delay(0.3).delaytime(0.15)
   - Drums: s('bd sd [~ hh] sd, hh*4').gain(0.8)
   - Euclidean: note('c3(3,8) e3(5,8)').sound('triangle').release(0.2)
   - Melody: note('c4 d4 e4 ~ g4 e4 d4 c4').sound('sine').lpf(2000).release(0.3)
   - Ambient: note('<c3 e3 g3 b3>').sound('sine').room(0.8).release(2).gain(0.4).slow(2)

   CRITICAL RULES FOR STRUDEL CODE:
   - Always use SINGLE QUOTES for strings inside the code
   - note() and s() are top-level — do NOT chain one after the other, use .note() or .sound() as method
   - The pattern auto-loops, no need for explicit loops
   - Keep patterns concise — one line is ideal

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

// JSON schema for structured output
const RESPONSE_SCHEMA = {
  type: 'object' as const,
  properties: {
    message: {
      type: 'string' as const,
      description: 'Natural language response to the user',
    },
    actions: {
      type: 'array' as const,
      description: 'Actions to execute on the synthesizer. Empty array if no actions needed.',
      items: {
        type: 'object' as const,
        properties: {
          type: {
            type: 'string' as const,
            description: 'Action type: preset (SuperDough), modifyPreset, switchPreset, wafInstrument (SoundFont), strudel, strudelStop, harmonizer, arp, bpm',
          },
        },
        required: ['type'] as const,
      },
    },
  },
  required: ['message', 'actions'] as const,
};

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
      temperature: 0.6,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_SCHEMA,
      thinkingConfig: {
        thinkingLevel,
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
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');

  try {
    return JSON.parse(text) as AiResponse;
  } catch {
    // Fallback: if JSON parsing fails, treat as plain text
    return { message: text, actions: [] };
  }
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
