import type { HarmonizerConfig, ArpConfig, Preset } from '../types';
import { eventBus } from './event-bus';

export interface AppState {
  harmonizer: HarmonizerConfig;
  arp: ArpConfig;
  currentPreset: Preset | null;
  bpm: number;
  midiConnected: boolean;
  audioReady: boolean;
  octaveOffset: number;
  midiOutEnabled: boolean;
  midiOutChannel: number;
}

const state: AppState = {
  harmonizer: {
    key: 'C',
    scale: 'major',
    fifths: false,
    enabled: true,
    voicingMode: 'root',
  },
  arp: {
    enabled: false,
    pattern: 'up',
    bpm: 120,
    subdivision: 2,
    octaves: 1,
    gate: 0.8,
    euclideanOnsets: 3,
    euclideanSteps: 8,
  },
  currentPreset: null,
  bpm: 120,
  midiConnected: false,
  audioReady: false,
  octaveOffset: 0,
  midiOutEnabled: false,
  midiOutChannel: 0,
};

export function getState(): Readonly<AppState> {
  return state;
}

export function setHarmonizer(config: Partial<HarmonizerConfig>): void {
  Object.assign(state.harmonizer, config);
  eventBus.emit('state:harmonizerChanged', { ...state.harmonizer });
}

export function setArp(config: Partial<ArpConfig>): void {
  Object.assign(state.arp, config);
  eventBus.emit('state:arpChanged', { ...state.arp });
}

export function setPreset(preset: Preset): void {
  state.currentPreset = preset;
  eventBus.emit('state:presetChanged', preset);
}

export function setBpm(bpm: number): void {
  state.bpm = Math.max(40, Math.min(240, bpm));
  state.arp.bpm = state.bpm;
  eventBus.emit('state:bpmChanged', state.bpm);
}

export function setAudioReady(ready: boolean): void {
  state.audioReady = ready;
}

export function setMidiConnected(connected: boolean): void {
  state.midiConnected = connected;
}

export function setOctaveOffset(offset: number): void {
  state.octaveOffset = Math.max(-24, Math.min(24, offset));
}

export function setMidiOut(enabled: boolean, channel?: number): void {
  state.midiOutEnabled = enabled;
  if (channel !== undefined) state.midiOutChannel = Math.max(0, Math.min(15, channel));
}
