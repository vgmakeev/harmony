import { eventBus } from '../core/event-bus';
import { getState } from '../core/state';

let midiAccess: MIDIAccess | null = null;
let midiOutput: MIDIOutput | null = null;

export function getMidiOutputs(): MIDIOutput[] {
  if (!midiAccess) return [];
  const outputs: MIDIOutput[] = [];
  midiAccess.outputs.forEach((o) => outputs.push(o));
  return outputs;
}

export function selectMidiOutput(id: string): void {
  if (!midiAccess) return;
  midiOutput = midiAccess.outputs.get(id) ?? null;
  if (midiOutput) {
    eventBus.emit('midiOut:connected', { name: midiOutput.name ?? 'MIDI Out' });
  }
}

export async function initMidiOutput(): Promise<void> {
  if (!navigator.requestMIDIAccess) return;

  try {
    midiAccess = await navigator.requestMIDIAccess();

    // Auto-select first output if available
    const outputs = getMidiOutputs();
    if (outputs.length > 0) {
      midiOutput = outputs[0];
    }

    midiAccess.onstatechange = () => {
      // If current output disconnected, clear it
      if (midiOutput && midiOutput.state === 'disconnected') {
        midiOutput = null;
        eventBus.emit('midiOut:disconnected', undefined);
      }
    };
  } catch {
    console.warn('WebMIDI not available for output');
    return;
  }

  eventBus.on('sound:noteOn', (event) => {
    if (!midiOutput || !getState().midiOutEnabled) return;
    const ch = getState().midiOutChannel;
    midiOutput.send([0x90 | ch, event.note, event.velocity]);
  });

  eventBus.on('sound:noteOff', (event) => {
    if (!midiOutput || !getState().midiOutEnabled) return;
    const ch = getState().midiOutChannel;
    midiOutput.send([0x80 | ch, event.note, 0]);
  });
}
