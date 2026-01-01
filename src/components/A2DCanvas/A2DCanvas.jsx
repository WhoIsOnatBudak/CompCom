import { useEffect, useMemo, useRef } from "react";
import { generateWave2T } from "../../analog/generateSignal";

export default function A2DCanvas({ analog }) {
  const canvasRef = useRef(null);
  const sig = useMemo(() => generateWave2T((analog?.waveform) || "Sine"), [analog]);

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

    const padX = 18, padTop = 22, padBottom = 18;
    const midY = (padTop + (height - padBottom)) / 2;
    const usableH = (height - padBottom) - padTop;

    const grid = "#cbd5e7";
    const text = "#0f172a";
    const muted = "#64748b";
    const wave = "#16a34a";

    // center line
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, midY);
    ctx.lineTo(width - padX, midY);
    ctx.stroke();

    const samples = sig.samples;
    let mn = samples[0], mx = samples[0];
    for (const x of samples) { if (x < mn) mn = x; if (x > mx) mx = x; }
    const range = mx - mn || 1;

    const usableW = width - padX * 2;

    // waveform
    ctx.strokeStyle = wave;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const x = padX + (i / (samples.length - 1)) * usableW;
      const y = padTop + (1 - (samples[i] - mn) / range) * usableH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // sample points (sparse)
    ctx.fillStyle = wave;
    const step = Math.max(1, Math.floor(samples.length / 80));
    for (let i = 0; i < samples.length; i += step) {
      const x = padX + (i / (samples.length - 1)) * usableW;
      const y = padTop + (1 - (samples[i] - mn) / range) * usableH;
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, 2 * Math.PI);
      ctx.fill();
    }

    // title
    ctx.fillStyle = text;
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Analog signal: sine (2T)`, padX, 14);

    ctx.fillStyle = muted;
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`f=${sig.T ? (1/sig.T).toFixed(2) : ""}Hz, fs=${sig.fs}Hz, duration=${sig.duration.toFixed(2)}s`, padX, height - 6);
  }, [sig]);

  return <canvas ref={canvasRef} />;
}
