/**
 * Zero-Asset Synthetic Acoustic Sound Service
 * Synthesizes Windows 3-tone chime (E5 -> B5 -> E6) and alert tones via Web Audio API.
 * 100% in-memory: zero external MP3/WAV file downloads required.
 */
let audioCtx: AudioContext | null = null;
let cachedDataUri: string | null = null;
let titleBlinker: any = null;
let originalTitle = '';

function generateWindowsChimeDataUri(): string {
  if (cachedDataUri) return cachedDataUri;
  const sampleRate = 44100;
  const notes = [
    { freq: 659.25, duration: 0.085, decayRate: 10.0 }, // E5
    { freq: 987.77, duration: 0.095, decayRate: 9.0 },  // B5
    { freq: 1318.51, duration: 0.35, decayRate: 5.5 },  // E6
  ];

  let totalDuration = 0;
  for (const n of notes) totalDuration += n.duration;
  const totalSamples = Math.floor(sampleRate * totalDuration);

  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeStr(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  let sampleOffset = 0;
  for (const note of notes) {
    const noteSamples = Math.floor(sampleRate * note.duration);
    for (let i = 0; i < noteSamples && sampleOffset + i < totalSamples; i++) {
      const t = (sampleOffset + i) / sampleRate;
      const noteT = i / sampleRate;
      const env = Math.exp(-noteT * note.decayRate);
      const f1 = Math.sin(2 * Math.PI * note.freq * t);
      const f2 = 0.22 * Math.sin(2 * Math.PI * (note.freq * 2) * t);
      const wave = (f1 + f2) * 0.8;
      view.setInt16(44 + (sampleOffset + i) * 2, Math.floor(wave * env * 24000), true);
    }
    sampleOffset += noteSamples;
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 8192) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, Math.min(i + 8192, bytes.byteLength))));
  }
  cachedDataUri = 'data:audio/wav;base64,' + btoa(binary);
  return cachedDataUri;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AudioContextClass();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

export function playRecordingInterruptedSound(): void {
  if (typeof window === 'undefined') return;

  // Pipeline 1: HTML5 Audio via synthetic in-memory Data URI
  try {
    const audio = new Audio(generateWindowsChimeDataUri());
    audio.volume = 0.85;
    audio.play().catch(() => playOscillatorFallback());
  } catch {
    playOscillatorFallback();
  }

  startTitleAlert('⚠️ RECORDING INTERRUPTED!');
}

function playOscillatorFallback(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime + 0.01;
  const notes = [659.25, 987.77, 1318.51];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(freq, now + idx * 0.09);
    gain.gain.setValueAtTime(0.001, now + idx * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.3, now + idx * 0.09 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.09);
    osc.stop(now + idx * 0.09 + 0.3);
  });
}

export function startTitleAlert(alertText = '⚠️ RECORDING INTERRUPTED!'): void {
  if (typeof document === 'undefined') return;
  if (!originalTitle) originalTitle = document.title;
  if (titleBlinker) clearInterval(titleBlinker);
  let toggle = false;
  titleBlinker = setInterval(() => {
    document.title = toggle ? alertText : '⚠️ RAD SUITE ALERT';
    toggle = !toggle;
  }, 1000);

  const clear = () => {
    stopTitleAlert();
    window.removeEventListener('focus', clear);
    document.removeEventListener('click', clear);
  };
  window.addEventListener('focus', clear);
  document.addEventListener('click', clear);
}

export function stopTitleAlert(): void {
  if (titleBlinker) {
    clearInterval(titleBlinker);
    titleBlinker = null;
  }
  if (originalTitle && typeof document !== 'undefined') {
    document.title = originalTitle;
  }
}
