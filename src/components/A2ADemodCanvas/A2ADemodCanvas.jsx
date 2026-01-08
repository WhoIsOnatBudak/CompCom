import { useEffect, useMemo, useRef } from "react";
import { getAnalogModulator, getAnalogDemodulator } from "../../utils/algorithm_registry";
import { runBenchmark } from "../../utils/benchmark";

export default function A2ADemodCanvas({ algorithm, analog, implementation, onReportMetrics }) {
  const canvasRef = useRef(null);

  const { res, metrics } = useMemo(() => {
    const modulator = getAnalogModulator(implementation);
    const demodulator = getAnalogDemodulator(implementation);

    const bench = runBenchmark(() => {
      const r = modulator(algorithm, analog?.waveform || "Sine");
      demodulator(algorithm, r.y, r.fs);
    });

    const r = modulator(algorithm, analog?.waveform || "Sine");
    const d = demodulator(algorithm, r.y, r.fs);

    return {
      res: { ...r, ...d },
      metrics: bench
    };
  }, [algorithm, analog, implementation]);

  useEffect(() => {
    onReportMetrics?.(metrics);
  }, [metrics, onReportMetrics]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const width = Math.max(520, parent?.clientWidth || 520);
    const height = 220;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const padX = 18, padTop = 24, padBottom = 16;
    const top = padTop, bottom = height - padBottom;
    const midY = (top + bottom) / 2;

    const grid = "#cbd5e7";
    const text = "#0f172a";
    const muted = "#64748b";
    const wave = "#ef4444";

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, midY);
    ctx.lineTo(width - padX, midY);
    ctx.stroke();

    ctx.fillStyle = text;
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "left";
    ctx.fillText("m̂(t) (demodulated)", padX, 16);

    ctx.fillStyle = muted;
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`${algorithm || "-"} • ${res.note || ""}`, padX, height - 4);

    const mhat = res.mhat || [];
    if (!algorithm || mhat.length === 0) {
      ctx.fillStyle = muted;
      ctx.fillText("Select AM / FM / PM to see recovered signal.", padX, midY - 10);
      return;
    }

    let mx = 0;
    for (const v of mhat) mx = Math.max(mx, Math.abs(v));
    mx = mx || 1;

    const usableW = width - padX * 2;
    const amp = (bottom - top) * 0.42;

    ctx.strokeStyle = wave;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < mhat.length; i++) {
      const x = padX + (i / (mhat.length - 1)) * usableW;
      const y = midY - (mhat[i] / mx) * amp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [res, algorithm]);

  return <canvas ref={canvasRef} />;
}
