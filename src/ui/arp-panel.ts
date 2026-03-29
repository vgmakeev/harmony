import type { ArpPatternName } from '../types';
import { getState, setArp } from '../core/state';

const PATTERN_LABELS: Record<ArpPatternName, string> = {
  chord: 'Chord',
  up: 'Up',
  down: 'Down',
  upDown: 'Up/Dn',
  downUp: 'Dn/Up',
  random: 'Rand',
  alberti: 'Alberti',
  gallop: 'Gallop',
  tremolo: 'Trem',
  broken: 'Broken',
  triplet: 'Trip',
  swing: 'Swing',
  rootFifth: 'R+5',
  rootOctave: 'R+8',
  bassLine: 'Walk',
  funk: 'Funk',
  reggae: 'Reggae',
  disco: 'Disco',
  tumbao: 'Latin',
  pedal: 'Pedal',
  bounce: 'Bounce',
  euclidean: 'Euclid',
};

const ALL_PATTERNS = Object.keys(PATTERN_LABELS) as ArpPatternName[];

export function createArpPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'flex flex-col gap-2 p-3 bg-bg-surface rounded-lg border border-border min-w-[180px]';

  // Header with enable toggle
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-1';

  const title = document.createElement('span');
  title.className = 'text-xs font-semibold text-text-secondary uppercase tracking-wider';
  title.textContent = 'Arpeggiator';

  const toggle = document.createElement('button');
  const updateToggle = (enabled: boolean) => {
    toggle.className = `px-2 py-0.5 text-[10px] rounded border font-semibold ${
      enabled
        ? 'bg-accent-pink/20 border-accent-pink text-accent-pink'
        : 'bg-bg-elevated border-border text-text-secondary'
    }`;
    toggle.textContent = enabled ? 'ON' : 'OFF';
  };
  updateToggle(getState().arp.enabled);
  toggle.addEventListener('click', () => {
    const enabled = !getState().arp.enabled;
    setArp({ enabled });
    updateToggle(enabled);
  });

  header.append(title, toggle);

  // Pattern buttons grid
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-3 gap-1';

  const buttons: HTMLButtonElement[] = [];

  for (const pattern of ALL_PATTERNS) {
    const btn = document.createElement('button');
    const isActive = getState().arp.pattern === pattern;
    btn.className = `px-1 py-1.5 text-[10px] rounded border transition-colors ${
      isActive
        ? 'bg-accent-pink/20 border-accent-pink text-accent-pink'
        : 'bg-bg-elevated border-border text-text-secondary hover:text-text-primary'
    }`;
    btn.textContent = PATTERN_LABELS[pattern];
    btn.addEventListener('click', () => {
      setArp({ pattern });
      for (const b of buttons) {
        const p = ALL_PATTERNS[buttons.indexOf(b)];
        b.className = `px-1 py-1.5 text-[10px] rounded border transition-colors ${
          p === pattern
            ? 'bg-accent-pink/20 border-accent-pink text-accent-pink'
            : 'bg-bg-elevated border-border text-text-secondary hover:text-text-primary'
        }`;
      }
    });
    buttons.push(btn);
    grid.appendChild(btn);
  }

  // Subdivision selector
  const subDiv = document.createElement('div');
  subDiv.className = 'flex items-center gap-2 mt-1';
  const subLabel = document.createElement('span');
  subLabel.className = 'text-[10px] text-text-secondary';
  subLabel.textContent = 'Div:';

  const subSelect = document.createElement('select');
  subSelect.className = 'bg-bg-elevated border border-border rounded px-1 py-0.5 text-[10px] text-text-primary outline-none';
  for (const [val, label] of [['1', '1/4'], ['2', '1/8'], ['3', 'Trip'], ['4', '1/16']]) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    if (parseInt(val) === getState().arp.subdivision) opt.selected = true;
    subSelect.appendChild(opt);
  }
  subSelect.addEventListener('change', () => setArp({ subdivision: parseInt(subSelect.value) }));

  // Gate knob (simple range input)
  const gateLabel = document.createElement('span');
  gateLabel.className = 'text-[10px] text-text-secondary';
  gateLabel.textContent = 'Gate:';

  const gateInput = document.createElement('input');
  gateInput.type = 'range';
  gateInput.min = '0.1';
  gateInput.max = '1';
  gateInput.step = '0.1';
  gateInput.value = String(getState().arp.gate);
  gateInput.className = 'w-16 h-1 accent-accent-pink';
  gateInput.addEventListener('input', () => setArp({ gate: parseFloat(gateInput.value) }));

  subDiv.append(subLabel, subSelect, gateLabel, gateInput);

  // Euclidean controls (onsets / steps)
  const euclidRow = document.createElement('div');
  euclidRow.className = 'flex items-center gap-2 mt-1';
  euclidRow.style.display = getState().arp.pattern === 'euclidean' ? 'flex' : 'none';

  const onsLabel = document.createElement('span');
  onsLabel.className = 'text-[10px] text-text-secondary';
  onsLabel.textContent = 'Hits:';

  const onsInput = document.createElement('input');
  onsInput.type = 'number';
  onsInput.min = '1';
  onsInput.max = '16';
  onsInput.value = String(getState().arp.euclideanOnsets);
  onsInput.className = 'w-10 bg-bg-elevated border border-border rounded px-1 py-0.5 text-[10px] text-text-primary outline-none text-center';
  onsInput.addEventListener('change', () => setArp({ euclideanOnsets: Math.max(1, Math.min(16, parseInt(onsInput.value) || 3)) }));

  const stepsLabel = document.createElement('span');
  stepsLabel.className = 'text-[10px] text-text-secondary';
  stepsLabel.textContent = '/';

  const stepsInput = document.createElement('input');
  stepsInput.type = 'number';
  stepsInput.min = '2';
  stepsInput.max = '16';
  stepsInput.value = String(getState().arp.euclideanSteps);
  stepsInput.className = 'w-10 bg-bg-elevated border border-border rounded px-1 py-0.5 text-[10px] text-text-primary outline-none text-center';
  stepsInput.addEventListener('change', () => setArp({ euclideanSteps: Math.max(2, Math.min(16, parseInt(stepsInput.value) || 8)) }));

  euclidRow.append(onsLabel, onsInput, stepsLabel, stepsInput);

  // Show/hide euclidean controls when pattern changes
  buttons.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      euclidRow.style.display = ALL_PATTERNS[i] === 'euclidean' ? 'flex' : 'none';
    });
  });

  panel.append(header, grid, euclidRow, subDiv);
  return panel;
}
