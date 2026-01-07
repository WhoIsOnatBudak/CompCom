import { useEffect, useMemo, useRef } from "react";
import { modulate_aa } from "../../encoding/analog_to_analog_modulator";

export default function A2ACanvas({ algorithm, analog }) {
  const canvasRef = useRef(null);

  const res = useMemo(() => {
    return modulate_aa(algorithm, analog?.waveform || "Sine");
  }, [algorithm, analog]);

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
    const plotTop = padTop, plotBottom = height - padBottom;
    const midY = (plotTop + plotBottom) / 2;

    const grid = "#cbd5e7";
    const text = "#0f172a";
    const muted = "#64748b";
    const wave = "#a855f7";

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, midY);
    ctx.lineTo(width - padX, midY);
    ctx.stroke();

    ctx.fillStyle = text;
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "left";
    ctx.fillText("y(t) (analog→analog)", padX, 16);

    ctx.fillStyle = muted;
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`${algorithm || "-"} • ${res.note} • 2T`, padX, height - 4);

    const y = res.y || [];
    if (!algorithm || y.length === 0) {
      ctx.fillStyle = muted;
      ctx.fillText("Select AM or FM to see y(t).", padX, midY - 10);
      return;
    }

    let mx = 0;
    for (const v of y) mx = Math.max(mx, Math.abs(v));
    mx = mx || 1;

    const usableW = width - padX * 2;
    const usableH = plotBottom - plotTop;
    const amp = usableH * 0.42;

    ctx.strokeStyle = wave;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < y.length; i++) {
      const x = padX + (i / (y.length - 1)) * usableW;
      const yy = midY - (y[i] / mx) * amp;
      if (i === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }, [res, algorithm]);

  return <canvas ref={canvasRef} />;
}
