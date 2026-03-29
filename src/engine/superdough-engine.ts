import { getAudioContext as getSdCtx } from '@strudel/webaudio';
import type { SuperDoughParams } from '../types';

// Interactive MIDI noteOn/noteOff using raw Web Audio API.
// We don't use superdough() here because its `cut` group mechanism
// only works for samples (sampler.mjs), not synth oscillators (synth.mjs).

interface ActiveNote {
  oscillators: OscillatorNode[];
  filter: BiquadFilterNode;
  gain: GainNode;
  panner: StereoPannerNode;
  release: number;
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

const activeNotes = new Map<number, ActiveNote>();

function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function mapOscType(s: string): OscillatorType {
  switch (s) {
    case 'square': return 'square';
    case 'triangle': return 'triangle';
    case 'sine': return 'sine';
    default: return 'sawtooth'; // saw, sawtooth, supersaw fallback
  }
}

export function sdNoteOn(note: number, velocity: number, params: SuperDoughParams): void {
  sdNoteOff(note); // retrigger: stop previous if held

  const ctx = getSdCtx();
  const now = ctx.currentTime;
  const freq = midiToFreq(note);
  const vel = (velocity / 127) * (params.gain ?? 0.8);

  // --- Oscillators ---
  const oscillators: OscillatorNode[] = [];

  if (params.s === 'supersaw') {
    const count = params.unison ?? 5;
    const detuneCents = (params.detune ?? 12) * (params.spread ?? 0.5);
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      const d = count <= 1 ? 0 : ((i / (count - 1)) - 0.5) * 2 * detuneCents;
      osc.detune.setValueAtTime(d, now);
      oscillators.push(osc);
    }
  } else {
    const osc = ctx.createOscillator();
    osc.type = mapOscType(params.s);
    osc.frequency.setValueAtTime(freq, now);
    oscillators.push(osc);
  }

  // --- Filter ---
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(params.cutoff ?? 20000, now);
  filter.Q.setValueAtTime(params.resonance ?? 0, now);

  // --- Gain (ADSR envelope) ---
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);

  const attack = Math.max(params.attack ?? 0.005, 0.001);
  const decay = Math.max(params.decay ?? 0.1, 0.001);
  const sustain = params.sustain ?? 0.8;
  const release = Math.max(params.release ?? 0.1, 0.01);

  gain.gain.linearRampToValueAtTime(vel, now + attack);
  gain.gain.linearRampToValueAtTime(vel * sustain, now + attack + decay);

  // --- Panner ---
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(params.pan ?? 0, now);

  // --- Connect: oscillators → filter → gain → panner → destination ---
  for (const osc of oscillators) {
    osc.connect(filter);
    osc.start(now);
  }
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(ctx.destination);

  activeNotes.set(note, { oscillators, filter, gain, panner, release });
}

export function sdNoteOff(note: number): void {
  const active = activeNotes.get(note);
  if (!active) return;
  activeNotes.delete(note);

  if (active.cleanupTimer) clearTimeout(active.cleanupTimer);

  const ctx = getSdCtx();
  const now = ctx.currentTime;
  const rel = active.release;

  // Release envelope: current level → 0
  active.gain.gain.cancelScheduledValues(now);
  active.gain.gain.setValueAtTime(active.gain.gain.value, now);
  active.gain.gain.linearRampToValueAtTime(0, now + rel);

  // Disconnect nodes after release completes
  active.cleanupTimer = setTimeout(() => {
    for (const osc of active.oscillators) {
      try { osc.stop(); osc.disconnect(); } catch { /* already stopped */ }
    }
    active.filter.disconnect();
    active.gain.disconnect();
    active.panner.disconnect();
  }, (rel + 0.1) * 1000);
}

export function sdAllNotesOff(): void {
  for (const note of activeNotes.keys()) {
    sdNoteOff(note);
  }
}
