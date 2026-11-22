'use client';

import { useState, useRef, useCallback } from 'react';

export interface StructuredReportData {
  clinicalHistory?: string;
  technique: string;
  findings: string;
  impression: string;
  correctedTerms?: string[];
}

export interface UseVoiceStudioDictationOptions {
  modality?: string;
  studyDescription?: string;
  clinicalHistory?: string;
  patientAge?: string;
  patientGender?: string;
  patientName?: string;
  patientMrn?: string;
  accessionNumber?: string;
  studyId?: string;
  source?: 'reporting_canvas' | 'comment' | 'voice_lab';
  radiologistName?: string;
  autoStructure?: boolean;
  onSuccess?: (result: { rawTranscript: string; structured?: StructuredReportData | null }) => void;
  onError?: (error: string) => void;
}

export function useVoiceStudioDictation(options: UseVoiceStudioDictationOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(250); // Slice every 250ms
      setIsRecording(true);
    } catch (err: any) {
      const msg = err.message || 'Microphone access denied or not available';
      setErrorMessage(msg);
      options.onError?.(msg);
      setIsRecording(false);
    }
  }, [options]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    return new Promise<{ rawTranscript: string; structured?: StructuredReportData | null } | null>(
      (resolve) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) return resolve(null);

        recorder.onstop = async () => {
          setIsRecording(false);
          setIsProcessing(true);

          // Stop all audio tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          const mimeType = recorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

          if (audioBlob.size < 100) {
            setIsProcessing(false);
            setErrorMessage('No audio recorded (recording was too short)');
            return resolve(null);
          }

          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'dictation.webm');
            formData.append('modality', options.modality || 'CT');
            formData.append('studyDescription', options.studyDescription || '');
            formData.append('clinicalHistory', options.clinicalHistory || '');
            if (options.patientAge) formData.append('patientAge', options.patientAge);
            if (options.patientGender) formData.append('patientGender', options.patientGender);
            if (options.patientName) formData.append('patientName', options.patientName);
            if (options.patientMrn) formData.append('patientMrn', options.patientMrn);
            if (options.accessionNumber) formData.append('accessionNumber', options.accessionNumber);
            if (options.studyId) formData.append('studyId', options.studyId);
            if (options.radiologistName) formData.append('radiologistName', options.radiologistName);
            formData.append('source', options.source || 'reporting_canvas');
            formData.append('autoStructure', options.autoStructure !== false ? 'true' : 'false');

            const res = await fetch('/api/ai/voicestudio', {
              method: 'POST',
              body: formData,
            });

            const data = await res.json();
            if (data.success) {
              setLastTranscript(data.rawTranscript || '');
              options.onSuccess?.({
                rawTranscript: data.rawTranscript,
                structured: data.structured,
              });
              resolve({
                rawTranscript: data.rawTranscript,
                structured: data.structured,
              });
            } else {
              const msg = data.error || 'Transcription failed';
              setErrorMessage(msg);
              options.onError?.(msg);
              resolve(null);
            }
          } catch (err: any) {
            const msg = err.message || 'Network error connecting to VoiceStudio';
            setErrorMessage(msg);
            options.onError?.(msg);
            resolve(null);
          } finally {
            setIsProcessing(false);
          }
        };

        recorder.stop();
      }
    );
  }, [isRecording, options]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setIsProcessing(false);
  }, [isRecording]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isProcessing,
    lastTranscript,
    errorMessage,
    startRecording,
    stopRecording,
    cancelRecording,
    toggleRecording,
  };
}
