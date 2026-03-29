import type { SynthParams } from '../types';
import { getAudioContext, getMasterGain } from './audio-engine';

interface Voice {
  oscillators: OscillatorNode[];
  modulator?: OscillatorNode;
  modulatorGain?: GainNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  distortion?: WaveShaperNode;
  params: SynthParams;
}

const activeVoices = new Map<number, Voice>();

// Shared send-effect nodes (created lazily, persisted)
let delaySend: { delay: DelayNode; feedback: GainNode; wet: GainNode } | null = null;
let reverbSend: { convolver: ConvolverNode; wet: GainNode } | null = null;

function ensureDelay(): typeof delaySend {
  if (delaySend) return delaySend;
  const ctx = getAudioContext();
  const delay = ctx.createDelay(2);
  const feedback = ctx.createGain();
  feedback.gain.value = 0.3;
  const wet = ctx.createGain();
  wet.gain.value = 0;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(getMasterGain());
  delaySend = { delay, feedback, wet };
  return delaySend;
}

function ensureReverb(): typeof reverbSend {
  if (reverbSend) return reverbSend;
  const ctx = getAudioContext();
  // Generate simple impulse response
  const len = ctx.sampleRate * 2;
  const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  const wet = ctx.createGain();
  wet.gain.value = 0;
  convolver.connect(wet);
  wet.connect(getMasterGain());
  reverbSend = { convolver, wet };
  return reverbSend;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function makeDistortionCurve(amount: number): Float32Array {
  const samples = 256;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(amount * x);
  }
  return curve;
}

export function synthNoteOn(note: number, velocity: number, params: SynthParams): void {
  synthNoteOff(note);

  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const freq = midiToFreq(note);
  const vel = (velocity / 127) * params.gain;

  // Gain node with ADSR
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.linearRampToValueAtTime(vel, now + params.attack);
  gainNode.gain.linearRampToValueAtTime(vel * params.sustain, now + params.attack + params.decay);

  // Filter
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(params.cutoff, now);
  filter.Q.setValueAtTime(params.resonance, now);

  // Distortion (optional)
  let distortion: WaveShaperNode | undefined;
  if (params.distortion && params.distortion > 0) {
    distortion = ctx.createWaveShaper();
    distortion.curve = makeDistortionCurve(params.distortion * 10) as any;
    distortion.oversample = '2x';
  }

  // Oscillators (unison voices)
  const voiceCount = params.voices || 1;
  const oscillators: OscillatorNode[] = [];
  const detuneSpread = params.detune || 0;

  for (let i = 0; i < voiceCount; i++) {
    const osc = ctx.createOscillator();
    osc.type = params.waveform;
    osc.frequency.setValueAtTime(freq, now);
    if (voiceCount > 1) {
      const spread = detuneSpread * ((i / (voiceCount - 1)) * 2 - 1);
      osc.detune.setValueAtTime(spread, now);
    }
    osc.connect(filter);
    osc.start(now);
    oscillators.push(osc);
  }

  // FM synthesis (optional)
  let modulator: OscillatorNode | undefined;
  let modulatorGain: GainNode | undefined;
  if (params.fm && params.fm > 0) {
    const ratio = params.fmRatio ?? 2;
    modulator = ctx.createOscillator();
    modulator.frequency.setValueAtTime(freq * ratio, now);
    modulatorGain = ctx.createGain();
    const fmDepth = params.fm * freq;
    modulatorGain.gain.setValueAtTime(fmDepth, now);
    if (params.fmDecay) {
      modulatorGain.gain.exponentialRampToValueAtTime(0.001, now + params.fmDecay);
    }
    modulator.connect(modulatorGain);
    for (const osc of oscillators) {
      modulatorGain.connect(osc.frequency);
    }
    modulator.start(now);
  }

  // Signal chain: oscillators → filter → distortion? → gain → master (+ delay/reverb sends)
  if (distortion) {
    filter.connect(distortion);
    distortion.connect(gainNode);
  } else {
    filter.connect(gainNode);
  }
  gainNode.connect(getMasterGain());

  // Delay send
  if (params.delayMix && params.delayMix > 0) {
    const d = ensureDelay()!;
    d.delay.delayTime.setValueAtTime(params.delayTime ?? 0.3, now);
    d.feedback.gain.setValueAtTime(Math.min(params.delayFeedback ?? 0.3, 0.95), now);
    d.wet.gain.setValueAtTime(params.delayMix, now);
    gainNode.connect(d.delay);
  }

  // Reverb send
  if (params.reverbMix && params.reverbMix > 0) {
    const r = ensureReverb()!;
    r.wet.gain.setValueAtTime(params.reverbMix, now);
    gainNode.connect(r.convolver);
  }

  activeVoices.set(note, {
    oscillators,
    modulator,
    modulatorGain,
    filter,
    gain: gainNode,
    distortion,
    params,
  });
}

export function synthNoteOff(note: number): void {
  const voice = activeVoices.get(note);
  if (!voice) return;
  activeVoices.delete(note);

  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const release = voice.params.release;

  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
  voice.gain.gain.linearRampToValueAtTime(0, now + release);

  const stopTime = now + release + 0.05;
  for (const osc of voice.oscillators) {
    osc.stop(stopTime);
  }
  voice.modulator?.stop(stopTime);

  setTimeout(() => {
    for (const osc of voice.oscillators) {
      osc.disconnect();
    }
    voice.modulator?.disconnect();
    voice.modulatorGain?.disconnect();
    voice.filter.disconnect();
    voice.gain.disconnect();
    voice.distortion?.disconnect();
  }, (release + 0.1) * 1000);
}

export function synthUpdateParam(param: string, value: number): void {
  const now = getAudioContext().currentTime;

  // Shared send-effect updates (not per-voice)
  if (param === 'delayTime' && delaySend) {
    delaySend.delay.delayTime.setTargetAtTime(value, now, 0.01);
    return;
  }
  if (param === 'delayFeedback' && delaySend) {
    delaySend.feedback.gain.setTargetAtTime(Math.min(value, 0.95), now, 0.01);
    return;
  }
  if (param === 'delayMix' && delaySend) {
    delaySend.wet.gain.setTargetAtTime(value, now, 0.01);
    return;
  }
  if (param === 'reverbMix' && reverbSend) {
    reverbSend.wet.gain.setTargetAtTime(value, now, 0.01);
    return;
  }

  // Per-voice updates
  for (const voice of activeVoices.values()) {
    if (param === 'cutoff') {
      voice.filter.frequency.setTargetAtTime(value, now, 0.01);
    } else if (param === 'resonance') {
      voice.filter.Q.setTargetAtTime(value, now, 0.01);
    } else if (param === 'gain') {
      voice.gain.gain.setTargetAtTime(value, now, 0.01);
    }
  }
}

export function synthAllNotesOff(): void {
  for (const note of activeVoices.keys()) {
    synthNoteOff(note);
  }
}
