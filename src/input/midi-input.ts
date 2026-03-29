import { eventBus } from '../core/event-bus';
import { setMidiConnected } from '../core/state';

function handleMidiMessage(e: MIDIMessageEvent): void {
  if (!e.data || e.data.length < 3) return;

  const status = e.data[0] & 0xf0;
  const note = e.data[1];
  const velocity = e.data[2];

  if (status === 0x90 && velocity > 0) {
    eventBus.emit('input:noteOn', {
      type: 'noteOn', note, velocity, source: 'midi',
    });
  } else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
    eventBus.emit('input:noteOff', {
      type: 'noteOff', note, velocity: 0, source: 'midi',
    });
  } else if (status === 0xb0) {
    eventBus.emit('input:cc', { cc: note, value: velocity });
  }
}

function connectInput(input: MIDIInput): void {
  input.onmidimessage = handleMidiMessage;
  setMidiConnected(true);
  eventBus.emit('midi:connected', { name: input.name ?? 'MIDI Device' });
}

export async function initMidiInput(): Promise<void> {
  if (!navigator.requestMIDIAccess) return;

  try {
    const access = await navigator.requestMIDIAccess();

    access.inputs.forEach((input) => connectInput(input));

    access.onstatechange = (e: Event) => {
      const midiEvent = e as MIDIConnectionEvent;
      const port = midiEvent.port;
      if (port && port.type === 'input' && port.state === 'connected') {
        connectInput(port as MIDIInput);
      } else if (port && port.type === 'input' && port.state === 'disconnected') {
        setMidiConnected(false);
        eventBus.emit('midi:disconnected', undefined);
      }
    };
  } catch {
    console.warn('WebMIDI not available');
  }
}
