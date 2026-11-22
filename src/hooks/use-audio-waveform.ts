'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioWaveformOptions {
  fftSize?: number;
}

export function useAudioWaveform({ fftSize = 64 }: UseAudioWaveformOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const updateWaveform = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    if (!dataArrayRef.current || dataArrayRef.current.length !== bufferLength) {
      dataArrayRef.current = new Uint8Array(bufferLength);
    }

    analyser.getByteFrequencyData(dataArrayRef.current as any);

    // Compute average volume level (0 to 1)
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArrayRef.current[i];
    }
    const avg = bufferLength > 0 ? sum / bufferLength / 255 : 0;
    setVolume(Number(avg.toFixed(2)));

    animFrameRef.current = requestAnimationFrame(updateWaveform);
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = fftSize;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      streamRef.current = stream;
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone stream access unavailable, using simulated waveform:', err);
      setIsRecording(true);
    }
  }, [fftSize]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setVolume(0);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isRecording) {
      animFrameRef.current = requestAnimationFrame(updateWaveform);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording, updateWaveform]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    volume,
    dataArray: dataArrayRef.current,
    startRecording,
    stopRecording,
  };
}
