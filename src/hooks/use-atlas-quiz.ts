'use client';

// Layer 2: Atlas Self-Quiz State & Target Challenge Hook (<80 lines)
import { useState, useCallback, useEffect } from 'react';
import type { AnatomyAnnotationPoint } from '@/types';

export function useAtlasQuiz(visiblePoints: AnatomyAnnotationPoint[], currentSliceIndex: number) {
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizTarget, setQuizTarget] = useState<AnatomyAnnotationPoint | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<{ correct: boolean; message: string } | null>(
    null
  );

  const selectNextQuizTarget = useCallback(() => {
    if (visiblePoints.length === 0) {
      setQuizTarget(null);
      return;
    }
    const randomIndex = Math.floor(Math.random() * visiblePoints.length);
    setQuizTarget(visiblePoints[randomIndex]);
    setQuizFeedback(null);
  }, [visiblePoints]);

  useEffect(() => {
    if (isQuizMode) selectNextQuizTarget();
    else {
      setQuizFeedback(null);
      setQuizTarget(null);
    }
  }, [isQuizMode, currentSliceIndex, selectNextQuizTarget]);

  const handleQuizPinClick = (structureId: number) => {
    if (!quizTarget) return;
    const isCorrect = structureId === quizTarget.structure_id;
    setQuizScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    if (isCorrect) {
      setQuizFeedback({ correct: true, message: 'Correct! Excellent identification.' });
      setTimeout(() => selectNextQuizTarget(), 1000);
    } else {
      setQuizFeedback({ correct: false, message: 'Incorrect structure. Try again!' });
    }
  };

  return {
    isQuizMode,
    setIsQuizMode,
    quizScore,
    quizTarget,
    quizFeedback,
    selectNextQuizTarget,
    handleQuizPinClick,
  };
}
