'use client';

import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  active: boolean;
  compact?: boolean;
}

export default function AudioVisualizer({
  stream,
  active,
  compact = false,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream || !active) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.85;
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.35)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      void audioContext.close();
    };
  }, [stream, active]);

  return (
    <div className={`visualizer-wrap ${compact ? 'visualizer-compact' : ''}`}>
      <canvas
        ref={canvasRef}
        className="visualizer-canvas"
        width={640}
        height={compact ? 48 : 80}
      />
      {!active && <div className="visualizer-idle">Waveform activates when recording</div>}
    </div>
  );
}
