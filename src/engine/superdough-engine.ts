import { getAudioContext as getSdCtx } from '@strudel/webaudio';
import type { SuperDoughParams } from '../types';

// Dual-oscillator subtractive + FM synth with raw Web Audio API.
// Signal chain:
//   OSC A ─┐                                                                     ┌→ Delay → Dest
//   OSC B ─┤→ [HP] → LP Filter → [Dist/Fuzz/Fold] → ADSR → [Tremolo] → Panner ─┼→ Reverb → Dest
//   Sub   ─┤          ↑   ↑                           ↑                          ├→ Chorus → Dest
//   Noise ─┘     FilterEnv FilterLFO              TremoloLFO                     └→ Dest (dry)
//                                Vibrato LFO → osc.detune
//   FM mode: OSC B → GainNode → OSC A.frequency (instead of additive mixing)

// Soft clipping (tanh-like overdrive)
function makeDistortionCurve(amount: number): Float32Array {
  const n = 256;
  const curve = new Float32Array(n);
  const k = amount * 50;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

// Hard clipping fuzz (asymmetric, Big Muff style)
function makeFuzzCurve(amount: number): Float32Array {
  const n = 256;
  const curve = new Float32Array(n);
  const thresh = Math.max(1 - amount * 0.95, 0.05);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    // Asymmetric: positive clips harder than negative
    const posThresh = thresh;
    const negThresh = thresh * 1.3;
    if (x > posThresh) curve[i] = 1;
    else if (x < -negThresh) curve[i] = -0.8; // asymmetric = richer harmonics
    else if (x >= 0) curve[i] = x / posThresh;
    else curve[i] = (x / negThresh) * 0.8;
  }
  return curve;
}

// Wavefolder — sinusoidal transfer function, creates rich harmonics by folding the waveform
function makeWavefoldCurve(amount: number): Float32Array {
  const n = 8192;
  const curve = new Float32Array(n);
  const folds = 1 + amount * 4; // 1-5 folds
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.sin(x * folds * Math.PI);
  }
  return curve;
}

// Synthetic impulse response cache for convolution reverb
const reverbCache = new Map<string, AudioBuffer>();
function getReverbBuffer(ctx: BaseAudioContext, roomsize: number): AudioBuffer {
  const dur = Math.max(roomsize, 0.5);
  const key = `${ctx.sampleRate}_${dur.toFixed(1)}`;
  const cached = reverbCache.get(key);
  if (cached) return cached;

  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / (ctx.sampleRate * dur));
    }
  }
  reverbCache.set(key, buf);
  return buf;
}

interface ActiveNote {
  melodicOscs: OscillatorNode[];  // OSC A/B/Sub — for vibrato + stop
  lfoOscs: OscillatorNode[];      // LFOs — stop only
  bufferSources: AudioBufferSourceNode[];  // noise — stop only
  allNodes: AudioNode[];           // everything to disconnect
  gain: GainNode;                  // ADSR envelope
  release: number;
  tailTime: number;                // extra time for delay/reverb tails
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

const activeNotes = new Map<number, ActiveNote>();
let lastNoteFreq = 0; // for portamento/glide

// Shared noise buffer (2s white noise, created on demand)
let noiseBuffer: AudioBuffer | null = null;
function getNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = ctx.sampleRate * 2;
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function mapOscType(s: string): OscillatorType {
  switch (s) {
    case 'square':   return 'square';
    case 'triangle': return 'triangle';
    case 'sine':     return 'sine';
    default:         return 'sawtooth';
  }
}

export function sdNoteOn(note: number, velocity: number, params: SuperDoughParams): void {
  sdNoteOff(note);

  const ctx = getSdCtx();
  const now = ctx.currentTime;
  const freq = midiToFreq(note);
  const vel = (velocity / 127) * (params.gain ?? 0.8);

  const melodicOscs: OscillatorNode[] = [];
  const lfoOscs: OscillatorNode[] = [];
  const bufferSources: AudioBufferSourceNode[] = [];
  const allNodes: AudioNode[] = [];

  // ═══ LP Filter ═══
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  const baseCutoff = params.cutoff ?? 20000;
  const fenv = params.fenv ?? 0;
  const fdecay = Math.max(params.fdecay ?? 0.3, 0.01);
  filter.Q.setValueAtTime(params.resonance ?? 0, now);
  allNodes.push(filter);

  if (fenv > 0) {
    filter.frequency.setValueAtTime(Math.min(baseCutoff + fenv, 20000), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(baseCutoff, 20), now + fdecay);
  } else {
    filter.frequency.setValueAtTime(baseCutoff, now);
  }

  // ═══ HP Filter (optional) ═══
  let hpFilter: BiquadFilterNode | null = null;
  if (params.hcutoff && params.hcutoff > 20) {
    hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(params.hcutoff, now);
    hpFilter.Q.setValueAtTime(params.hresonance ?? 0, now);
    allNodes.push(hpFilter);
  }

  const oscTarget = hpFilter ?? filter;

  // ═══ Filter LFO ═══
  if (params.lfo && params.lfo > 0 && params.lfodepth && params.lfodepth > 0) {
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(params.lfo, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(params.lfodepth, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);
    lfoOscs.push(lfo);
    allNodes.push(lfoGain);
  }

  // ── Shared envelope params ──
  const penv = params.penv ?? 0;          // pitch envelope (semitones)
  const pdecay = Math.max(params.pdecay ?? 0.3, 0.01);
  const glide = params.glide ?? 0;        // portamento time
  const prevFreq = lastNoteFreq > 0 ? lastNoteFreq : freq;

  // Helper: set frequency with glide + pitch envelope (via detune)
  function setupOscFreq(osc: OscillatorNode, targetFreq: number, baseDetune: number): void {
    // Glide (portamento) — slide from previous note
    if (glide > 0 && lastNoteFreq > 0) {
      const ratio = prevFreq / freq; // scale for OSC B/Sub offsets
      osc.frequency.setValueAtTime(targetFreq * ratio, now);
      osc.frequency.exponentialRampToValueAtTime(targetFreq, now + glide);
    } else {
      osc.frequency.setValueAtTime(targetFreq, now);
    }
    // Pitch envelope — decaying pitch offset via detune (cents)
    if (penv !== 0) {
      osc.detune.setValueAtTime(baseDetune + penv * 100, now);
      osc.detune.linearRampToValueAtTime(baseDetune, now + pdecay);
    } else {
      osc.detune.setValueAtTime(baseDetune, now);
    }
  }

  // ═══ OSC A (universal unison — works for ANY waveform) ═══
  const oscAType: OscillatorType = params.s === 'supersaw' ? 'sawtooth' : mapOscType(params.s);
  const unisonCount = params.s === 'supersaw'
    ? (params.unison ?? 5)
    : (params.unison ?? 1);
  const detuneRange = (params.detune ?? (params.s === 'supersaw' ? 12 : 0))
    * (params.spread ?? (params.s === 'supersaw' ? 0.5 : 0));

  for (let i = 0; i < unisonCount; i++) {
    const osc = ctx.createOscillator();
    osc.type = oscAType;
    const uniDetune = unisonCount <= 1 ? 0 : ((i / (unisonCount - 1)) - 0.5) * 2 * detuneRange;
    setupOscFreq(osc, freq, uniDetune);
    osc.connect(oscTarget);
    osc.start(now);
    melodicOscs.push(osc);
  }

  // ═══ OSC B (additive or FM) ═══
  const fmAmount = params.fm ?? 0;
  if (params.s2 && params.osc2mix && params.osc2mix > 0) {
    const osc2 = ctx.createOscillator();
    osc2.type = mapOscType(params.s2);
    const osc2Freq = freq * Math.pow(2, params.osc2oct ?? 0);
    setupOscFreq(osc2, osc2Freq, params.osc2detune ?? 0);

    if (fmAmount > 0 && melodicOscs.length > 0) {
      // FM mode: OSC B modulates OSC A frequency
      const modIndex = fmAmount * (params.osc2mix ?? 0.5) * freq;
      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(modIndex, now);
      osc2.connect(modGain);
      for (const oscA of melodicOscs) {
        modGain.connect(oscA.frequency);
      }
      allNodes.push(modGain);
    } else {
      // Additive mode: OSC B mixed into signal chain
      const osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(params.osc2mix, now);
      osc2.connect(osc2Gain);
      osc2Gain.connect(oscTarget);
      allNodes.push(osc2Gain);
    }

    osc2.start(now);
    melodicOscs.push(osc2);
  }

  // ═══ Sub oscillator (sine, -1 octave) ═══
  if (params.sub && params.sub > 0) {
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    setupOscFreq(subOsc, freq / 2, 0);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(params.sub, now);
    subOsc.connect(subGain);
    subGain.connect(oscTarget);
    subOsc.start(now);
    melodicOscs.push(subOsc);
    allNodes.push(subGain);
  }

  // ═══ Noise layer ═══
  if (params.noise && params.noise > 0) {
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = getNoiseBuffer(ctx);
    noiseSrc.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(params.noise, now);
    noiseSrc.connect(noiseGain);
    noiseGain.connect(oscTarget);
    noiseSrc.start(now);
    bufferSources.push(noiseSrc);
    allNodes.push(noiseGain);
  }

  // ═══ Vibrato (LFO → pitch of all melodic oscillators) ═══
  if (params.vibrato && params.vibrato > 0) {
    const vibLfo = ctx.createOscillator();
    vibLfo.frequency.setValueAtTime(params.vibratoRate ?? 5, now);
    const vibGain = ctx.createGain();
    vibGain.gain.setValueAtTime(params.vibrato, now);
    vibLfo.connect(vibGain);
    for (const osc of melodicOscs) {
      vibGain.connect(osc.detune);
    }
    vibLfo.start(now);
    lfoOscs.push(vibLfo);
    allNodes.push(vibGain);
  }

  // ═══ Distortion / Fuzz / Wavefold ═══
  let distNode: WaveShaperNode | null = null;
  const fuzzAmt = params.fuzz ?? 0;
  const wavefoldAmt = params.wavefold ?? 0;
  const distAmt = params.distort ?? 0;
  if (fuzzAmt > 0) {
    distNode = ctx.createWaveShaper();
    (distNode as any).curve = makeFuzzCurve(fuzzAmt);
    distNode.oversample = '4x';
    allNodes.push(distNode);
  } else if (wavefoldAmt > 0) {
    distNode = ctx.createWaveShaper();
    (distNode as any).curve = makeWavefoldCurve(wavefoldAmt);
    distNode.oversample = '4x';
    allNodes.push(distNode);
  } else if (distAmt > 0) {
    distNode = ctx.createWaveShaper();
    (distNode as any).curve = makeDistortionCurve(distAmt);
    distNode.oversample = '4x';
    allNodes.push(distNode);
  }

  // ═══ ADSR Gain ═══
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  const attack = Math.max(params.attack ?? 0.005, 0.001);
  const decay = Math.max(params.decay ?? 0.1, 0.001);
  const sustain = params.sustain ?? 0.8;
  const release = Math.max(params.release ?? 0.1, 0.01);
  gain.gain.linearRampToValueAtTime(vel, now + attack);
  gain.gain.linearRampToValueAtTime(vel * sustain, now + attack + decay);
  allNodes.push(gain);

  // ═══ Tremolo (LFO → amplitude) ═══
  let tremoloNode: GainNode | null = null;
  if (params.tremolo && params.tremolo > 0) {
    tremoloNode = ctx.createGain();
    tremoloNode.gain.setValueAtTime(1.0, now);
    const tremLfo = ctx.createOscillator();
    tremLfo.frequency.setValueAtTime(params.tremoloRate ?? 4, now);
    const tremGain = ctx.createGain();
    tremGain.gain.setValueAtTime(params.tremolo * 0.5, now);
    tremLfo.connect(tremGain);
    tremGain.connect(tremoloNode.gain);
    tremLfo.start(now);
    lfoOscs.push(tremLfo);
    allNodes.push(tremoloNode, tremGain);
  }

  // ═══ Panner ═══
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(params.pan ?? 0, now);
  allNodes.push(panner);

  // ═══ Connect chain ═══
  if (hpFilter) hpFilter.connect(filter);
  if (distNode) {
    filter.connect(distNode);
    distNode.connect(gain);
  } else {
    filter.connect(gain);
  }
  if (tremoloNode) {
    gain.connect(tremoloNode);
    tremoloNode.connect(panner);
  } else {
    gain.connect(panner);
  }
  panner.connect(ctx.destination);

  // ═══ Chorus (short modulated delay, parallel wet path) ═══
  if (params.chorus && params.chorus > 0) {
    const chorusDelay = ctx.createDelay(0.05);
    chorusDelay.delayTime.setValueAtTime(0.007, now); // 7ms base

    const chorusLfo = ctx.createOscillator();
    chorusLfo.frequency.setValueAtTime(params.chorusRate ?? 1.5, now);
    const chorusLfoGain = ctx.createGain();
    chorusLfoGain.gain.setValueAtTime(0.005 * params.chorus, now); // ±5ms modulation
    chorusLfo.connect(chorusLfoGain);
    chorusLfoGain.connect(chorusDelay.delayTime);
    chorusLfo.start(now);

    const chorusWet = ctx.createGain();
    chorusWet.gain.setValueAtTime(params.chorus * 0.6, now);

    // Wet path: panner → delay → wet gain → destination
    panner.connect(chorusDelay);
    chorusDelay.connect(chorusWet);
    chorusWet.connect(ctx.destination);

    lfoOscs.push(chorusLfo);
    allNodes.push(chorusDelay, chorusLfoGain, chorusWet);
  }

  // ═══ Delay (feedback delay line, parallel wet path) ═══
  if (params.delay && params.delay > 0) {
    const delayTime = params.delaytime ?? 0.25;
    const feedback = Math.min(params.delayfeedback ?? 0.3, 0.95);
    const delayNode = ctx.createDelay(2.0);
    delayNode.delayTime.setValueAtTime(delayTime, now);
    const fbGain = ctx.createGain();
    fbGain.gain.setValueAtTime(feedback, now);
    const delayWet = ctx.createGain();
    delayWet.gain.setValueAtTime(params.delay, now);

    panner.connect(delayNode);
    delayNode.connect(fbGain);
    fbGain.connect(delayNode); // feedback loop
    delayNode.connect(delayWet);
    delayWet.connect(ctx.destination);

    allNodes.push(delayNode, fbGain, delayWet);
  }

  // ═══ Reverb (convolution, parallel wet path) ═══
  if (params.room && params.room > 0) {
    const roomsize = Math.max(params.roomsize ?? 2, 0.5);
    const convolver = ctx.createConvolver();
    convolver.buffer = getReverbBuffer(ctx, roomsize);
    const reverbWet = ctx.createGain();
    reverbWet.gain.setValueAtTime(params.room * 0.5, now);

    panner.connect(convolver);
    convolver.connect(reverbWet);
    reverbWet.connect(ctx.destination);

    allNodes.push(convolver, reverbWet);
  }

  // Compute tail time for delay/reverb
  let tailTime = 0;
  if (params.delay && params.delay > 0) {
    const fb = Math.min(params.delayfeedback ?? 0.3, 0.95);
    tailTime = Math.max(tailTime, (params.delaytime ?? 0.25) * Math.ceil(6.9 / -Math.log(fb + 0.001)));
  }
  if (params.room && params.room > 0) {
    tailTime = Math.max(tailTime, params.roomsize ?? 2);
  }
  tailTime = Math.min(tailTime, 15); // cap at 15s

  activeNotes.set(note, {
    melodicOscs, lfoOscs, bufferSources, allNodes, gain, release, tailTime,
  });

  lastNoteFreq = freq;
}

export function sdNoteOff(note: number): void {
  const active = activeNotes.get(note);
  if (!active) return;
  activeNotes.delete(note);

  if (active.cleanupTimer) clearTimeout(active.cleanupTimer);

  const ctx = getSdCtx();
  const now = ctx.currentTime;
  const rel = active.release;

  // Release: ramp gain to 0
  active.gain.gain.cancelScheduledValues(now);
  active.gain.gain.setValueAtTime(active.gain.gain.value, now);
  active.gain.gain.linearRampToValueAtTime(0, now + rel);

  // Cleanup after release
  active.cleanupTimer = setTimeout(() => {
    for (const osc of active.melodicOscs) {
      try { osc.stop(); osc.disconnect(); } catch { /* ok */ }
    }
    for (const osc of active.lfoOscs) {
      try { osc.stop(); osc.disconnect(); } catch { /* ok */ }
    }
    for (const src of active.bufferSources) {
      try { src.stop(); src.disconnect(); } catch { /* ok */ }
    }
    for (const node of active.allNodes) {
      try { node.disconnect(); } catch { /* ok */ }
    }
  }, (rel + (active.tailTime ?? 0) + 0.2) * 1000);
}

export function sdAllNotesOff(): void {
  for (const note of activeNotes.keys()) {
    sdNoteOff(note);
  }
}
