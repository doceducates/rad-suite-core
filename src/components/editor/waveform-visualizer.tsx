'use client';

import { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  isRecording: boolean;
  volume: number;
  dataArray?: Uint8Array | null;
  barCount?: number;
}

export function WaveformVisualizer({
  isRecording,
  volume,
  dataArray,
  barCount = 28,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = Math.max(2, (width / barCount) - 2);
      const centerY = height / 2;

      phaseRef.current += 0.08;

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + 2);
        let amplitude = 4;

        if (isRecording) {
          if (dataArray && dataArray.length > 0) {
            const sampleIdx = Math.floor((i / barCount) * dataArray.length);
            const rawVal = dataArray[sampleIdx] || 0;
            amplitude = Math.max(4, (rawVal / 255) * (height - 8));
          } else {
            // Smooth natural simulated speech oscillation
            const wave1 = Math.sin(phaseRef.current + i * 0.4);
            const wave2 = Math.cos(phaseRef.current * 1.5 + i * 0.2);
            amplitude = Math.max(6, (Math.abs(wave1 * 0.6 + wave2 * 0.4) * (volume || 0.6) * (height - 10)));
          }
        }

        const barHeight = Math.min(height - 4, amplitude);
        const y = centerY - barHeight / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isRecording) {
          gradient.addColorStop(0, '#8ecf9e'); // sage-mint primary
          gradient.addColorStop(1, '#4a7c59'); // forest-sage primary
        } else {
          gradient.addColorStop(0, '#71717a'); // zinc-500
          gradient.addColorStop(1, '#3f3f46'); // zinc-700
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      if (isRecording) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isRecording, volume, dataArray, barCount]);

  return (
    <div className="w-full h-14 bg-zinc-950/80 rounded-xl p-2 flex items-center justify-center border border-zinc-800">
      <canvas ref={canvasRef} width={320} height={44} className="w-full h-full object-contain" />
    </div>
  );
}
