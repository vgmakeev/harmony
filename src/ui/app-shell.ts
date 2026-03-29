import { createHeader } from './header';
import { createControlsBar } from './controls-bar';
import { createArpPanel } from './arp-panel';
import { createSynthPanel } from './synth-panel';
import { createPresetSelector } from './preset-selector';
import { createPianoKeyboard } from './piano-keyboard';
import { createStrudelEditor } from './strudel-editor';
import { createAiChatPanel } from './ai-chat-panel';

export function renderAppShell(root: HTMLElement): void {
  root.innerHTML = '';

  const header = createHeader();
  const controls = createControlsBar();
  const presetSelector = createPresetSelector();

  // Main zone: arp panel + synth panel + strudel editor + AI chat
  const mainZone = document.createElement('div');
  mainZone.className = 'flex gap-3 p-3 flex-1 min-h-0 overflow-auto';

  const arpPanel = createArpPanel();

  const synthCol = document.createElement('div');
  synthCol.className = 'flex flex-col gap-2 flex-1 min-w-[260px]';
  const synthPanel = createSynthPanel();
  synthCol.append(synthPanel);

  const strudelEditor = createStrudelEditor();
  const aiChat = createAiChatPanel();
  mainZone.append(arpPanel, synthCol, strudelEditor, aiChat);

  const piano = createPianoKeyboard();

  root.append(header, controls, presetSelector, mainZone, piano);
}
