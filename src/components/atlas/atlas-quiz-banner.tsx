'use client';

// Layer 4: Atlas Anatomy Quiz Status Banner (<70 lines)
import React from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import type { AnatomyAnnotationPoint } from '@/types';

interface AtlasQuizBannerProps {
  quizTarget: AnatomyAnnotationPoint | null;
  quizScore: { correct: number; total: number };
  language: 'en' | 'la';
  onNextQuestion: () => void;
}

export function AtlasQuizBanner({
  quizTarget,
  quizScore,
  language,
  onNextQuestion,
}: AtlasQuizBannerProps) {
  const accuracy = quizScore.total > 0 ? Math.round((quizScore.correct / quizScore.total) * 100) : 100;

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
          <HelpCircle className="h-4 w-4" />
          Interactive Anatomy Quiz
        </span>
        <span className="font-mono text-xs font-bold text-amber-500">
          {quizScore.correct} / {quizScore.total} ({accuracy}%)
        </span>
      </div>

      {quizTarget ? (
        <div className="rounded-lg border border-amber-500/30 bg-background/80 p-3 shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">
            Find & Click on Canvas:
          </div>
          <div className="text-sm font-bold text-foreground mt-0.5">
            {language === 'la' && quizTarget.name_la ? quizTarget.name_la : quizTarget.name_en}
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          No pins available on this slice. Advance to another cross-section.
        </div>
      )}

      <button
        onClick={onNextQuestion}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 cursor-pointer"
      >
        <span>Skip / Next Structure</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
