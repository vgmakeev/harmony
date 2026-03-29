import type { NoteName, ScaleType } from '../types';
import { NOTE_NAMES, SCALE_LABELS } from '../core/constants';
import { getState, setHarmonizer } from '../core/state';

function createSelect<T extends string>(
  options: readonly T[],
  labels: Record<T, string> | null,
  value: T,
  onChange: (val: T) => void
): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'bg-bg-elevated border border-border rounded px-2 py-1 text-sm text-text-primary outline-none focus:border-accent-blue';

  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = labels ? labels[opt] : opt;
    if (opt === value) option.selected = true;
    select.appendChild(option);
  }

  select.addEventListener('change', () => onChange(select.value as T));
  return select;
}

export function createControlsBar(): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'flex items-center gap-4 px-4 h-12 bg-bg-surface border-b border-border shrink-0 flex-wrap';

  const state = getState().harmonizer;

  // Key selector
  const keyLabel = document.createElement('span');
  keyLabel.className = 'text-xs text-text-secondary';
  keyLabel.textContent = 'Key:';

  const keySelect = createSelect(
    NOTE_NAMES,
    null,
    state.key,
    (val) => setHarmonizer({ key: val as NoteName })
  );

  // Scale selector
  const scaleLabel = document.createElement('span');
  scaleLabel.className = 'text-xs text-text-secondary';
  scaleLabel.textContent = 'Scale:';

  const scales = Object.keys(SCALE_LABELS) as ScaleType[];
  const scaleSelect = createSelect(
    scales,
    SCALE_LABELS as Record<ScaleType, string>,
    state.scale,
    (val) => setHarmonizer({ scale: val as ScaleType })
  );

  // Fifths (power chord) toggle
  const fifthsBtn = document.createElement('button');
  fifthsBtn.className = `px-3 py-1 text-xs rounded border ${
    state.fifths
      ? 'bg-accent-purple/20 border-accent-purple text-accent-purple'
      : 'bg-bg-elevated border-border text-text-secondary'
  }`;
  fifthsBtn.textContent = '5th';
  fifthsBtn.addEventListener('click', () => {
    const current = getState().harmonizer.fifths;
    setHarmonizer({ fifths: !current });
    fifthsBtn.className = `px-3 py-1 text-xs rounded border ${
      !current
        ? 'bg-accent-purple/20 border-accent-purple text-accent-purple'
        : 'bg-bg-elevated border-border text-text-secondary'
    }`;
  });

  // Harmonizer enable toggle
  const harmBtn = document.createElement('button');
  harmBtn.className = `px-3 py-1 text-xs rounded border ${
    state.enabled
      ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
      : 'bg-bg-elevated border-border text-text-secondary'
  }`;
  harmBtn.textContent = 'Harm';
  harmBtn.addEventListener('click', () => {
    const current = getState().harmonizer.enabled;
    setHarmonizer({ enabled: !current });
    harmBtn.className = `px-3 py-1 text-xs rounded border ${
      !current
        ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
        : 'bg-bg-elevated border-border text-text-secondary'
    }`;
  });

  // Voicing mode toggle: Root / Voice
  const voiceBtn = document.createElement('button');
  const updateVoiceBtn = (mode: string) => {
    const isVoiceLead = mode === 'voiceLead';
    voiceBtn.className = `px-3 py-1 text-xs rounded border ${
      isVoiceLead
        ? 'bg-accent-pink/20 border-accent-pink text-accent-pink'
        : 'bg-bg-elevated border-border text-text-secondary'
    }`;
    voiceBtn.textContent = isVoiceLead ? 'Voice' : 'Root';
  };
  updateVoiceBtn(state.voicingMode);
  voiceBtn.addEventListener('click', () => {
    const current = getState().harmonizer.voicingMode;
    const next = current === 'root' ? 'voiceLead' : 'root';
    setHarmonizer({ voicingMode: next });
    updateVoiceBtn(next);
  });

  bar.append(keyLabel, keySelect, scaleLabel, scaleSelect, fifthsBtn, harmBtn, voiceBtn);
  return bar;
}
