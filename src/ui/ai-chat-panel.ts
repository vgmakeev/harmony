import { chat, getGeminiKey, setGeminiKey, clearChatHistory } from '../ai/ai-chat';
import { getState } from '../core/state';
import { eventBus } from '../core/event-bus';

export function createAiChatPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'flex flex-col gap-2 p-3 bg-bg-surface border border-border rounded-lg min-w-[280px] max-w-[360px]';

  // Header
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between';

  const title = document.createElement('span');
  title.className = 'text-xs font-bold text-accent-blue tracking-wider uppercase';
  title.textContent = 'AI Chat';

  const clearBtn = document.createElement('button');
  clearBtn.className = 'px-2 py-0.5 text-[10px] rounded border border-border text-text-secondary hover:border-accent-pink hover:text-accent-pink transition-colors';
  clearBtn.textContent = 'Clear';
  clearBtn.addEventListener('click', () => {
    clearChatHistory();
    messagesEl.innerHTML = '';
  });

  header.append(title, clearBtn);

  // API key input (shown if no key set)
  const keyRow = document.createElement('div');
  keyRow.className = 'flex gap-1';

  const keyInput = document.createElement('input');
  keyInput.type = 'password';
  keyInput.className = 'flex-1 bg-[#09090d] border border-border rounded px-2 py-1 text-xs text-text-primary font-mono outline-none focus:border-accent-blue placeholder:text-text-secondary/40';
  keyInput.placeholder = 'Gemini API key';
  keyInput.value = getGeminiKey();

  const keySaveBtn = document.createElement('button');
  keySaveBtn.className = 'px-2 py-1 text-[10px] rounded border border-border text-text-secondary hover:border-accent-blue hover:text-accent-blue transition-colors';
  keySaveBtn.textContent = 'Save';
  keySaveBtn.addEventListener('click', () => {
    setGeminiKey(keyInput.value.trim());
    keyRow.style.display = getGeminiKey() ? 'none' : 'flex';
    keyToggle.style.display = getGeminiKey() ? 'block' : 'none';
  });

  keyRow.append(keyInput, keySaveBtn);
  if (getGeminiKey()) keyRow.style.display = 'none';

  // Small toggle to show/hide key input
  const keyToggle = document.createElement('button');
  keyToggle.className = 'text-[10px] text-text-secondary hover:text-accent-blue self-end';
  keyToggle.textContent = 'API key';
  keyToggle.addEventListener('click', () => {
    keyRow.style.display = keyRow.style.display === 'none' ? 'flex' : 'none';
  });
  if (!getGeminiKey()) keyToggle.style.display = 'none';

  // Messages container
  const messagesEl = document.createElement('div');
  messagesEl.className = 'flex flex-col gap-2 overflow-y-auto max-h-[240px] min-h-[100px] text-xs';

  // Input area
  const inputRow = document.createElement('div');
  inputRow.className = 'flex gap-1 items-end';

  // Image attachment button
  const imgBtn = document.createElement('button');
  imgBtn.className = 'px-2 py-1.5 text-xs rounded border border-border text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors shrink-0';
  imgBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>`;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';

  let pendingImage: string | undefined;
  let imagePreview: HTMLElement | null = null;

  imgBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pendingImage = reader.result as string;
      // Show preview
      if (imagePreview) imagePreview.remove();
      imagePreview = document.createElement('div');
      imagePreview.className = 'relative';
      const img = document.createElement('img');
      img.src = pendingImage;
      img.className = 'w-16 h-16 object-cover rounded border border-accent-purple';
      const removeBtn = document.createElement('button');
      removeBtn.className = 'absolute -top-1 -right-1 w-4 h-4 bg-accent-pink rounded-full text-white text-[8px] flex items-center justify-center';
      removeBtn.textContent = 'x';
      removeBtn.addEventListener('click', () => {
        pendingImage = undefined;
        imagePreview?.remove();
        imagePreview = null;
      });
      imagePreview.append(img, removeBtn);
      inputRow.insertBefore(imagePreview, msgInput);
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });

  // Also support paste
  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          pendingImage = reader.result as string;
          if (imagePreview) imagePreview.remove();
          imagePreview = document.createElement('div');
          imagePreview.className = 'relative';
          const img = document.createElement('img');
          img.src = pendingImage;
          img.className = 'w-16 h-16 object-cover rounded border border-accent-purple';
          const removeBtn = document.createElement('button');
          removeBtn.className = 'absolute -top-1 -right-1 w-4 h-4 bg-accent-pink rounded-full text-white text-[8px] flex items-center justify-center';
          removeBtn.textContent = 'x';
          removeBtn.addEventListener('click', () => {
            pendingImage = undefined;
            imagePreview?.remove();
            imagePreview = null;
          });
          imagePreview.append(img, removeBtn);
          inputRow.insertBefore(imagePreview, msgInput);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const msgInput = document.createElement('input');
  msgInput.type = 'text';
  msgInput.className = 'flex-1 bg-[#09090d] border border-border rounded px-2 py-1.5 text-xs text-text-primary font-mono outline-none focus:border-accent-blue placeholder:text-text-secondary/40';
  msgInput.placeholder = 'Ask AI...';

  // Prevent keyboard shortcuts while typing
  msgInput.addEventListener('keydown', (e) => e.stopPropagation());
  msgInput.addEventListener('keyup', (e) => e.stopPropagation());
  msgInput.addEventListener('paste', handlePaste);

  const sendBtn = document.createElement('button');
  sendBtn.className = 'px-2 py-1.5 text-xs rounded border border-border text-text-secondary hover:border-accent-blue hover:text-accent-blue transition-colors shrink-0';
  sendBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>`;

  function addMessage(role: 'user' | 'ai', text: string, image?: string): void {
    const msg = document.createElement('div');
    msg.className = role === 'user'
      ? 'self-end bg-accent-blue/10 border border-accent-blue/20 rounded-lg px-2 py-1 max-w-[90%]'
      : 'self-start bg-bg-elevated border border-border rounded-lg px-2 py-1 max-w-[90%]';

    if (image) {
      const img = document.createElement('img');
      img.src = image;
      img.className = 'w-20 h-20 object-cover rounded mb-1';
      msg.appendChild(img);
    }

    const textEl = document.createElement('div');
    textEl.className = 'text-text-primary whitespace-pre-wrap break-words';
    textEl.textContent = text;
    msg.appendChild(textEl);

    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  let sending = false;

  async function send(): Promise<void> {
    const text = msgInput.value.trim();
    if (!text || sending) return;
    if (!getGeminiKey()) {
      addMessage('ai', 'Please set your Gemini API key first.');
      keyRow.style.display = 'flex';
      return;
    }

    sending = true;
    msgInput.value = '';
    sendBtn.disabled = true;

    addMessage('user', text, pendingImage);

    const img = pendingImage;
    pendingImage = undefined;
    imagePreview?.remove();
    imagePreview = null;

    // Loading indicator
    const loading = document.createElement('div');
    loading.className = 'self-start text-text-secondary animate-pulse';
    loading.textContent = 'thinking...';
    messagesEl.appendChild(loading);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const response = await chat(text, img);
      loading.remove();
      addMessage('ai', response || '(action executed)');
    } catch (err) {
      loading.remove();
      addMessage('ai', `Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      sending = false;
      sendBtn.disabled = false;
    }
  }

  msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  sendBtn.addEventListener('click', send);

  // Context chip — shows current preset
  const contextChip = document.createElement('div');
  contextChip.className = 'flex items-center gap-1.5 px-2 py-1 bg-bg-elevated rounded border border-border text-[10px]';

  const CHIP_BADGE: Record<string, string> = {
    synth: 'px-1 py-0.5 rounded bg-accent-blue/20 text-accent-blue font-bold text-[8px]',
    superdough: 'px-1 py-0.5 rounded bg-accent-purple/20 text-accent-purple font-bold text-[8px]',
    webaudiofont: 'px-1 py-0.5 rounded bg-green-400/20 text-green-400 font-bold text-[8px]',
  };

  function updateContextChip(): void {
    const preset = getState().currentPreset;
    if (!preset) {
      contextChip.style.display = 'none';
      return;
    }
    contextChip.style.display = 'flex';
    const label = preset.engine === 'synth' ? 'FM' : preset.engine === 'superdough' ? 'SD' : 'WAF';
    contextChip.innerHTML = '';
    const working = document.createElement('span');
    working.className = 'text-text-secondary/60';
    working.textContent = 'Working with:';
    const badge = document.createElement('span');
    badge.className = CHIP_BADGE[preset.engine] ?? CHIP_BADGE.synth;
    badge.textContent = label;
    const name = document.createElement('span');
    name.className = 'text-text-primary font-medium truncate';
    name.textContent = preset.name;
    contextChip.append(working, badge, name);
  }

  updateContextChip();
  eventBus.on('state:presetChanged', updateContextChip);

  // Quick action chips
  const quickActions = document.createElement('div');
  quickActions.className = 'flex gap-1 flex-wrap';

  const chips = [
    { label: 'Brighter', prompt: 'Make the current sound brighter' },
    { label: 'Darker', prompt: 'Make the current sound darker and warmer' },
    { label: 'More bass', prompt: 'Add more low-end bass to the sound' },
    { label: 'Reverb', prompt: 'Add reverb/space to the current sound' },
    { label: 'Random', prompt: 'Create a random interesting sound' },
    { label: 'Similar', prompt: 'Create something similar but different' },
  ];

  for (const chip of chips) {
    const btn = document.createElement('button');
    btn.className = 'px-1.5 py-0.5 text-[9px] rounded border border-border text-text-secondary/60 hover:text-text-primary hover:border-text-secondary/30 transition-colors';
    btn.textContent = chip.label;
    btn.addEventListener('click', () => {
      msgInput.value = chip.prompt;
      send();
    });
    quickActions.appendChild(btn);
  }

  inputRow.append(imgBtn, fileInput, msgInput, sendBtn);
  panel.append(header, keyToggle, keyRow, messagesEl, contextChip, quickActions, inputRow);
  return panel;
}
