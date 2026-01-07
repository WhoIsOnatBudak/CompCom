import { useEffect, useMemo, useRef } from "react";
import { modulate_original } from "../../encoding/digital_to_analog_modulator";

export default function AnalogModCanvas({ algorithm, data }) {
  const canvasRef = useRef(null);

  const mod = useMemo(() => {
    return modulate_original(algorithm, data);
  }, [algorithm, data]);

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
    const amp = (waveBottom - waveTop) * 0.42;

    const bits = mod.bits || "";
    const samples = mod.samples || [];

    const grid = "#cbd5e7";
    const text = "#0f172a";
    const muted = "#64748b";
    const wave = "#16a34a";

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, midY);
    ctx.lineTo(width - padX, midY);
    ctx.stroke();

    const N = bits.length;
    const bitW = N > 0 ? (width - padX * 2) / N : 0;

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

    if (!algorithm || samples.length === 0) {
      ctx.fillStyle = muted;
      ctx.textAlign = "left";
      ctx.fillText("Bu modülasyon için çizim yok ya da data boş.", padX, waveTop + 30);
      return;
    }

    ctx.strokeStyle = wave;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const total = samples.length;
    const usableW = width - padX * 2;

    for (let i = 0; i < total; i++) {
      const x = padX + (i / (total - 1)) * usableW;
      const y = midY - samples[i] * amp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = text;
    ctx.textAlign = "left";
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(algorithm, padX, 14);
  }, [algorithm, mod]);

  return <canvas ref={canvasRef} />;
}
