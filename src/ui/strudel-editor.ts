import { strudelEval, strudelStop, getStrudelError } from '../strudel/strudel-engine';
import { eventBus } from '../core/event-bus';

const EXAMPLES = [
  { label: 'Melody', code: `note("c4 e4 g4 b4").sound("sine").lpf(2000).release(0.3)` },
  { label: 'Bass', code: `note("c2 [~ c2] eb2 [~ g1]").sound("sawtooth").lpf(600).resonance(10).release(0.1)` },
  { label: 'Chords', code: `note("<[c3,e3,g3] [f3,a3,c4] [g3,b3,d4] [c3,e3,g3]>").sound("triangle").release(0.5).lpf(1500)` },
  { label: 'Arp', code: `note("c3 e3 g3 b3 g3 e3".fast(2)).sound("sine").lpf(3000).delay(0.3).delaytime(0.15)` },
  { label: 'Rhythm', code: `s("bd sd [~ hh] sd, hh*4").gain(0.8)` },
  { label: 'Euclidean', code: `note("c3(3,8) e3(5,8) g3(7,16)").sound("triangle").release(0.2)` },
];

export function createStrudelEditor(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex flex-col gap-2 p-3 bg-bg-surface border border-border rounded-lg';
  container.dataset.testid = 'strudel-editor';

  // Header row
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between';

  const title = document.createElement('span');
  title.className = 'text-xs font-bold text-accent-purple tracking-wider uppercase';
  title.textContent = 'Strudel Live';

  const btnRow = document.createElement('div');
  btnRow.className = 'flex gap-2';

  const playBtn = document.createElement('button');
  playBtn.className = 'px-3 py-1 text-xs rounded border bg-bg-elevated border-border text-text-secondary hover:border-accent-blue hover:text-accent-blue transition-colors';
  playBtn.textContent = 'Play';

  const stopBtn = document.createElement('button');
  stopBtn.className = 'px-3 py-1 text-xs rounded border bg-bg-elevated border-border text-text-secondary hover:border-accent-pink hover:text-accent-pink transition-colors';
  stopBtn.textContent = 'Stop';

  btnRow.append(playBtn, stopBtn);
  header.append(title, btnRow);

  // Examples row
  const exRow = document.createElement('div');
  exRow.className = 'flex gap-1 flex-wrap';

  for (const ex of EXAMPLES) {
    const btn = document.createElement('button');
    btn.className = 'px-2 py-0.5 text-[10px] rounded border border-border text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors';
    btn.textContent = ex.label;
    btn.addEventListener('click', () => {
      textarea.value = ex.code;
    });
    exRow.appendChild(btn);
  }

  // Textarea
  const textarea = document.createElement('textarea');
  textarea.className = 'w-full h-24 bg-[#09090d] border border-border rounded px-3 py-2 text-sm text-text-primary font-mono resize-y outline-none focus:border-accent-purple placeholder:text-text-secondary/40';
  textarea.placeholder = 'Type Strudel mini-notation... (Ctrl+Enter to play)';
  textarea.spellcheck = false;

  // Error display
  const errorEl = document.createElement('div');
  errorEl.className = 'text-[10px] text-accent-pink font-mono min-h-[1em] truncate';
  errorEl.textContent = '';

  // Status indicator
  const statusEl = document.createElement('div');
  statusEl.className = 'text-[10px] text-text-secondary';
  statusEl.textContent = '';

  function updateStatus(playing: boolean): void {
    if (playing) {
      playBtn.className = 'px-3 py-1 text-xs rounded border bg-accent-blue/20 border-accent-blue text-accent-blue';
      playBtn.textContent = 'Playing';
      statusEl.textContent = '';
    } else {
      playBtn.className = 'px-3 py-1 text-xs rounded border bg-bg-elevated border-border text-text-secondary hover:border-accent-blue hover:text-accent-blue transition-colors';
      playBtn.textContent = 'Play';
      statusEl.textContent = '';
    }
  }

  async function evalCode(): Promise<void> {
    const code = textarea.value.trim();
    if (!code) return;
    errorEl.textContent = '';
    try {
      await strudelEval(code);
    } catch {
      errorEl.textContent = getStrudelError() ?? 'Eval error';
    }
  }

  playBtn.addEventListener('click', evalCode);

  stopBtn.addEventListener('click', () => {
    strudelStop();
    errorEl.textContent = '';
  });

  // Ctrl+Enter to eval
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      evalCode();
    }
  });

  // Prevent keyboard input module from capturing when typing in textarea
  textarea.addEventListener('keydown', (e) => e.stopPropagation());
  textarea.addEventListener('keyup', (e) => e.stopPropagation());

  // Sync textarea when code is evaluated externally (e.g., by AI chat)
  eventBus.on('strudel:eval', (code) => {
    textarea.value = code;
    errorEl.textContent = '';
  });

  eventBus.on('strudel:toggle', updateStatus);
  eventBus.on('strudel:error', (msg) => {
    errorEl.textContent = msg;
  });

  container.append(header, exRow, textarea, errorEl, statusEl);
  return container;
}
