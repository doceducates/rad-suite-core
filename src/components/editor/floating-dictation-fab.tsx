'use client';

import { Mic, Activity } from 'lucide-react';

interface FloatingDictationFabProps {
  isOpen: boolean;
  onToggle: () => void;
  isRecording?: boolean;
}

export function FloatingDictationFab({
  isOpen,
  onToggle,
  isRecording = false,
}: FloatingDictationFabProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 select-none">
      {/* Small floating badge */}
      {!isOpen && (
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 text-primary text-[11px] font-semibold shadow-lg border border-primary/30 backdrop-blur-xs">
          <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span>Dictate & HMIS</span>
        </span>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={onToggle}
        className={`relative p-3.5 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center cursor-pointer border ${
          isRecording
            ? 'bg-rose-500 text-white border-rose-400 ring-4 ring-rose-500/30 animate-pulse scale-105'
            : isOpen
            ? 'bg-primary text-on-primary border-primary ring-2 ring-primary/20'
            : 'bg-primary hover:bg-primary/90 text-on-primary border-primary/40 hover:scale-105'
        }`}
        title={isOpen ? 'Close Transcribe Drawer' : 'Open AI Dictate & HMIS Drawer'}
      >
        <Mic className={`w-5 h-5 ${isRecording ? 'animate-bounce' : ''}`} />

        {/* Outer glowing halo when recording */}
        {isRecording && (
          <span className="absolute -inset-1 rounded-full bg-rose-400 opacity-40 animate-ping pointer-events-none" />
        )}
      </button>
    </div>
  );
}
