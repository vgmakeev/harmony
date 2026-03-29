import type { NoteEvent, MidiCCEvent, ChordResult, HarmonizerConfig, ArpConfig, Preset, NoteSource } from '../types';

export interface EventMap {
  'input:noteOn': NoteEvent;
  'input:noteOff': NoteEvent;
  'input:cc': MidiCCEvent;

  'harmony:noteOn': NoteEvent & { chord?: ChordResult };
  'harmony:noteOff': NoteEvent;

  'sound:noteOn': NoteEvent;
  'sound:noteOff': NoteEvent;

  'state:presetChanged': Preset;
  'state:harmonizerChanged': HarmonizerConfig;
  'state:arpChanged': ArpConfig;
  'state:bpmChanged': number;

  'ui:pianoHighlight': { note: number; active: boolean; source: NoteSource };
  'ui:chordDisplay': ChordResult | null;
  'midi:connected': { name: string };
  'midi:disconnected': undefined;
  'audio:initialized': undefined;

  'strudel:eval': string;
  'strudel:error': string;
  'strudel:toggle': boolean;

  'midiOut:connected': { name: string };
  'midiOut:disconnected': undefined;

  'recording:start': undefined;
  'recording:stop': undefined;
}

type Listener<T> = (data: T) => void;

class EventBus {
  private listeners = new Map<string, Set<Listener<unknown>>>();

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener<unknown>);
    return () => { set.delete(listener as Listener<unknown>); };
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.listeners.get(event)?.forEach(fn => fn(data));
  }
}

export const eventBus = new EventBus();
