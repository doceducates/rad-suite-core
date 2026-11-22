'use client';

import React, { useEffect, useRef } from 'react';
import type { AnimationItem } from 'lottie-web';

interface LottieWaveformProps {
  active?: boolean;
  speed?: number;
  className?: string;
  loop?: boolean;
}

export function LottieWaveform({
  active = true,
  speed = 1,
  className = 'w-28 h-8',
  loop = true,
}: LottieWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    let isCancelled = false;

    // Dynamically import lightweight SVG-only lottie renderer
    import('lottie-web/build/player/lottie_light')
      .then((lottieModule) => {
        if (isCancelled || !containerRef.current) return;
        const lottie = lottieModule.default || lottieModule;

        animRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop,
          autoplay: active,
          path: '/animations/waves.json',
        });

        if (speed !== 1 && animRef.current) {
          animRef.current.setSpeed(speed);
        }
      })
      .catch((err) => {
        console.warn('[LottieWaveform] Failed to load animation:', err);
      });

    return () => {
      isCancelled = true;
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [loop]);

  useEffect(() => {
    if (!animRef.current) return;
    if (active) {
      animRef.current.play();
    } else {
      animRef.current.pause();
    }
  }, [active]);

  useEffect(() => {
    if (animRef.current) {
      animRef.current.setSpeed(speed);
    }
  }, [speed]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
