'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, Sparkles, Loader2 } from 'lucide-react';
import { parseVoiceCommands } from '@/services/smart-dictation.service';
import { playRecordingInterruptedSound, stopTitleAlert } from '@/services/sound.service';
import { LottieWaveform } from '@/components/ui/lottie-waveform';
import { notify } from '@/services/notification.service';
import { cn } from '@/lib/utils';

interface SmartDictationMicProps {
  onTranscript: (cleanedText: string, action?: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showWaveform?: boolean;
  modality?: string;
  studyDescription?: string;
}

export function SmartDictationMic({
  onTranscript,
  className,
  size = 'sm',
  showWaveform = false,
  modality = 'CT',
  studyDescription = '',
}: SmartDictationMicProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      stopTitleAlert();
    };
  }, []);

  const startVoiceStudioRecording = async () => {
    if (typeof window === 'undefined') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (audioBlob.size < 100) {
          setIsProcessing(false);
          return;
        }

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'dictation.webm');
          formData.append('modality', modality);
          formData.append('studyDescription', studyDescription);
          formData.append('autoStructure', 'false'); // Return raw transcript

          const res = await fetch('/api/ai/voicestudio', { method: 'POST', body: formData });
          const data = await res.json();

          if (data.success && data.rawTranscript) {
            const parsed = parseVoiceCommands(data.rawTranscript);
            if (parsed.remainingText || parsed.action !== 'NONE') {
              onTranscript(parsed.remainingText, parsed.action);
            } else {
              onTranscript(data.rawTranscript);
            }
            notify.success('Transcribed via VoiceStudio CUDA');
          } else {
            notify.error(data.error || 'VoiceStudio transcription failed');
          }
        } catch (err: any) {
          notify.error(`Dictation error: ${err.message || 'Offline'}`);
        } finally {
          setIsProcessing(false);
        }
      };

      recorder.start(250);
      setIsRecording(true);
    } catch (err: any) {
      notify.warning(`Microphone access error: ${err.message}`);
      setIsRecording(false);
    }
  };

  const stopVoiceStudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopVoiceStudioRecording();
    } else {
      startVoiceStudioRecording();
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        size={size}
        variant={isRecording ? 'danger' : 'secondary'}
        onClick={toggleRecording}
        disabled={isProcessing}
        className={cn(
          'gap-1.5 transition-all shadow-sm cursor-pointer',
          isRecording ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse' : 'border-zinc-200 dark:border-zinc-700'
        )}
        title={isRecording ? 'Stop VoiceStudio Dictation' : 'Start VoiceStudio CUDA Dictation'}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Transcribing...</span>
          </>
        ) : isRecording ? (
          <>
            <MicOff className="w-4 h-4" />
            <span>Stop Dictating</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 text-rose-500" />
            <span>Voice Dictate</span>
          </>
        )}
      </Button>

      {showWaveform && isRecording && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-zinc-900 rounded-md border border-primary/30">
          <Volume2 className="w-3.5 h-3.5 text-primary animate-pulse shrink-0" />
          <LottieWaveform active={isRecording} className="w-20 h-5" />
        </div>
      )}
    </div>
  );
}
