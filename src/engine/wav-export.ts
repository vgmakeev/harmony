import { getAudioContext, getMasterGain } from './audio-engine';
import { eventBus } from '../core/event-bus';

let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let streamDest: MediaStreamAudioDestinationNode | null = null;

export function isRecording(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === 'recording';
}

export function startRecording(): void {
  if (isRecording()) return;

  const ctx = getAudioContext();
  streamDest = ctx.createMediaStreamDestination();
  getMasterGain().connect(streamDest);

  const recorder = new MediaRecorder(streamDest.stream, {
    mimeType: 'audio/webm;codecs=opus',
  });

  chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: recorder.mimeType });
    downloadBlob(blob, `harmonia-${Date.now()}.webm`);
    // Disconnect stream destination
    if (streamDest) {
      getMasterGain().disconnect(streamDest);
      streamDest = null;
    }
  };

  mediaRecorder = recorder;
  recorder.start();
  eventBus.emit('recording:start', undefined);
}

export function stopRecording(): void {
  if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
  mediaRecorder.stop();
  mediaRecorder = null;
  eventBus.emit('recording:stop', undefined);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
