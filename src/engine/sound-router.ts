import type { WebAudioFontParams, SuperDoughParams } from '../types';
import { eventBus } from '../core/event-bus';
import { getState } from '../core/state';
import { ensureAudioRunning, isAudioReady } from './audio-engine';
import { wafNoteOn, wafNoteOff, wafAllNotesOff, loadInstrument } from './webaudiofont-engine';
import { sdNoteOn, sdNoteOff, sdAllNotesOff } from './superdough-engine';

export function initSoundRouter(): void {
  eventBus.on('sound:noteOn', (event) => {
    if (!isAudioReady()) return;
    ensureAudioRunning();

    const preset = getState().currentPreset;
    if (!preset) return;

    if (preset.engine === 'superdough') {
      sdNoteOn(event.note, event.velocity, preset.params as SuperDoughParams);
    } else {
      const p = preset.params as WebAudioFontParams;
      wafNoteOn(event.note, event.velocity, p.instrument, p.gain);
    }

    eventBus.emit('ui:pianoHighlight', { note: event.note, active: true, source: event.source });
  });

  eventBus.on('sound:noteOff', (event) => {
    const preset = getState().currentPreset;
    if (!preset) return;

    if (preset.engine === 'superdough') {
      sdNoteOff(event.note);
    } else {
      wafNoteOff(event.note);
    }

    eventBus.emit('ui:pianoHighlight', { note: event.note, active: false, source: event.source });
  });

  // On preset change, stop all notes and preload WebAudioFont instrument
  eventBus.on('state:presetChanged', (preset) => {
    wafAllNotesOff();
    sdAllNotesOff();
    if (preset.engine === 'webaudiofont') {
      loadInstrument((preset.params as WebAudioFontParams).instrument).catch(console.warn);
    }
  });
}
