import { useEffect, useMemo, useRef } from "react";
import { getDigitalEncoder } from "../../utils/algorithm_registry";
import { runBenchmark } from "../../utils/benchmark";

function levelToY(level, yHigh, yZero, yLow) {
  if (level > 0) return yHigh;
  if (level < 0) return yLow;
  return yZero;
}

export default function WaveformCanvas({ algorithm, data, implementation, onReportMetrics }) {
  const canvasRef = useRef(null);

  const { encoded, metrics } = useMemo(() => {
    const encoder = getDigitalEncoder(implementation);

    // Benchmark: run 1000 times
    const bench = runBenchmark(() => encoder(algorithm, data));
    const res = encoder(algorithm, data);

    return { encoded: res, metrics: bench };
  }, [algorithm, data, implementation]);

  // Report metrics side effect
  useEffect(() => {
    onReportMetrics?.(metrics);
  }, [metrics, onReportMetrics]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const width = Math.max(520, parent?.clientWidth || 520);
    const height = 260;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const padX = 18;
    const padTop = 22;
    const padBottom = 18;
    const labelArea = 34;

    const waveTop = padTop + labelArea;
    const waveBottom = height - padBottom;

    const midY = (waveTop + waveBottom) / 2;
    const amp = (waveBottom - waveTop) * 0.32;

    const yHigh = midY - amp;
    const yZero = midY;
    const yLow = midY + amp;

    const bits = encoded.bits || "";
    const segments = encoded.segments || [];
    const N = bits.length;
    const bitW = N > 0 ? (width - padX * 2) / N : 0;

    const grid = "#e2e8f0";      // --border-subtle
    const text = "#1e293b";      // --text-main
    const muted = "#64748b";     // --text-muted
    const wave = "#4f46e5";      // --accent-primary (Indigo)

    // zero line (nice for AMI/pseudoternary)
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, yZero);
    ctx.lineTo(width - padX, yZero);
    ctx.stroke();

    // bit boundaries + labels
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= N; i++) {
      const x = padX + i * bitW;
      ctx.strokeStyle = grid;
      ctx.beginPath();
      ctx.moveTo(x, waveTop);
      ctx.lineTo(x, waveBottom);
      ctx.stroke();
      if (i < N) ctx.fillText(bits[i], x + bitW / 2, padTop + labelArea / 2);
    }

    if (N === 0) {
      ctx.fillStyle = muted;
      ctx.textAlign = "left";
      ctx.fillText("Data gir (0/1).", padX, waveTop + 30);
      return;
    }

    if (!algorithm || segments.length === 0) {
      ctx.fillStyle = muted;
      ctx.textAlign = "left";
      ctx.fillText("Bu algoritma için encode/çizim yok.", padX, waveTop + 30);
      return;
    }

    // waveform
    ctx.strokeStyle = wave;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();

    let x = padX;
    let currentY = null;

    for (let i = 0; i < N; i++) {
      const sub = segments[i] || [0];
      const steps = sub.length;
      const stepW = bitW / steps;

      for (let s = 0; s < steps; s++) {
        const y = levelToY(sub[s], yHigh, yZero, yLow);

        if (currentY === null) {
          ctx.moveTo(x, y);
          currentY = y;
        } else if (currentY !== y) {
          ctx.lineTo(x, currentY);
          ctx.lineTo(x, y);
          currentY = y;
        }

        x += stepW;
        ctx.lineTo(x, currentY);
      }
    }

    ctx.stroke();

    // title
    ctx.fillStyle = text;
    ctx.textAlign = "left";
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`${algorithm} (${implementation})`, padX, 14);
  }, [algorithm, encoded, implementation]);

  return <canvas ref={canvasRef} />;
}
