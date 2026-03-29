import { eventBus } from '../core/event-bus';
import { setAudioReady } from '../core/state';
import { setAudioContext as setSuperdoughCtx } from '@strudel/webaudio';

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let initialized = false;

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function isAudioReady(): boolean {
  return initialized;
}

export function getMasterGain(): GainNode {
  if (!masterGain) {
    const ctx = getAudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(ctx.destination);
  }
  return masterGain;
}

export async function initAudio(): Promise<AudioContext> {
  const ctx = getAudioContext();
  // Share our AudioContext with superdough before anything creates nodes
  setSuperdoughCtx(ctx);
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  getMasterGain();
  initialized = true;
  setAudioReady(true);
  eventBus.emit('audio:initialized', undefined);
  return ctx;
}

// Ensure context is running before playing. Call from hot path.
export function ensureAudioRunning(): void {
  if (!audioContext) return;
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

export function setMasterVolume(value: number): void {
  const gain = getMasterGain();
  gain.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), gain.context.currentTime, 0.01);
}
