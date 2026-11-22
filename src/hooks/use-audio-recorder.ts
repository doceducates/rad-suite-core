'use client';

// Layer 4 (Presentation Hook): Multi-Platform Safe Audio Recording Hook
// Hardware API Isolation compliant with AGENTS.md Rule 4
import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioRecordResult {
  blob: Blob;
  url: string;
  base64: string;
  duration: number;
  mimeType: string;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioResult, setAudioResult] = useState<AudioRecordResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone access is not supported in this browser environment');
      return;
    }

    try {
      cleanup();
      setError(null);
      setAudioResult(null);
      setDuration(0);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/wav';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      startTimeRef.current = Date.now();
      recorder.start(250); // Slice every 250ms
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Microphone access denied or unavailable');
      cleanup();
    }
  }, [cleanup]);

  const stopRecording = useCallback((): Promise<AudioRecordResult | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanup();
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const finalDuration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const result: AudioRecordResult = {
            blob,
            url,
            base64,
            duration: finalDuration,
            mimeType,
          };
          setAudioResult(result);
          cleanup();
          resolve(result);
        };
        reader.readAsDataURL(blob);
      };

      recorder.stop();
    });
  }, [cleanup]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    audioChunksRef.current = [];
    setAudioResult(null);
    cleanup();
  }, [cleanup]);

  const resetAudio = useCallback(() => {
    if (audioResult?.url) {
      URL.revokeObjectURL(audioResult.url);
    }
    setAudioResult(null);
    setDuration(0);
    setError(null);
  }, [audioResult]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    duration,
    audioResult,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    resetAudio,
  };
}
